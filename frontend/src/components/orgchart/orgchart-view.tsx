'use client';

import * as React from 'react';
import { Check, Copy, Loader2, Minus, Plus, Redo2, RotateCcw, Trash2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FOCUS_RING } from '@/lib/focus';
import { getBestConnectionPath, getStraightPath, type Point } from './arrow-utils';
import { fetchOrgChart, saveOrgChart } from './orgchart-api';
import { OrgChartPalette } from './palette';
import type { NodeKind, OrgChartData, OrgEdge, OrgNode } from './types';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-4 justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_NODE_CONFIG: Record<NodeKind, { w: number; h: number; text: string; color: string }> =
  {
    rectangle: { w: 140, h: 60, text: 'Nouveau poste', color: '#2563eb' },
    circle: { w: 90, h: 90, text: 'Équipe', color: '#059669' },
    diamond: { w: 110, h: 90, text: 'Décision', color: '#d97706' },
    text: { w: 120, h: 40, text: 'Note texte', color: 'transparent' },
  };

type DragState =
  | { type: 'none' }
  | {
      type: 'pan';
      startX: number;
      startY: number;
      origPanX: number;
      origPanY: number;
    }
  | {
      type: 'move_node';
      nodeId: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      type: 'resize_node';
      nodeId: string;
      handle: 'nw' | 'ne' | 'se' | 'sw';
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
    }
  | {
      type: 'create_edge';
      fromNodeId: string;
      startPoint: Point;
      currentMouse: Point;
    };

export function OrgChartView() {
  const [data, setData] = React.useState<OrgChartData>({ nodes: [], edges: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved');

  // Canvas viewport transform
  const [pan, setPan] = React.useState<Point>({ x: 80, y: 80 });
  const [zoom, setZoom] = React.useState(1);

  // Selection & interaction states
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [activeTool, setActiveTool] = React.useState<NodeKind | 'arrow' | 'select'>('select');

  // Dragging state machine
  const [dragState, setDragState] = React.useState<DragState>({ type: 'none' });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isSpacePressed = React.useRef(false);

  // Undo / Redo history stacks (in memory)
  const pastRef = React.useRef<OrgChartData[]>([]);
  const futureRef = React.useRef<OrgChartData[]>([]);
  const isFirstMount = React.useRef(true);

  // Load initial data from backend
  React.useEffect(() => {
    let cancelled = false;
    fetchOrgChart()
      .then((doc) => {
        if (cancelled) return;
        const initial =
          doc.data && Array.isArray(doc.data.nodes) ? doc.data : { nodes: [], edges: [] };
        setData(initial);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger l’organigramme');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced auto-save (1s) to backend
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveOrgChart(data)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 1000);

    return () => clearTimeout(timer);
  }, [data]);

  // Convert screen pixels to canvas coordinates
  const screenToCanvas = React.useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  function pushHistory(nextData: OrgChartData) {
    pastRef.current = [...pastRef.current.slice(-30), data];
    futureRef.current = [];
    setData(nextData);
  }

  function handleUndo() {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    if (!previous) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [data, ...futureRef.current];
    setData(previous);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }

  function handleRedo() {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    if (!next) return;
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, data];
    setData(next);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }

  function addNode(kind: NodeKind, atPoint?: Point) {
    const config = DEFAULT_NODE_CONFIG[kind];
    const spawnPoint = atPoint ?? {
      x: (-pan.x + (containerRef.current?.clientWidth ?? 800) / 2) / zoom - config.w / 2,
      y: (-pan.y + (containerRef.current?.clientHeight ?? 600) / 2) / zoom - config.h / 2,
    };

    const newNode: OrgNode = {
      id: generateId(),
      kind,
      x: Math.round(spawnPoint.x),
      y: Math.round(spawnPoint.y),
      w: config.w,
      h: config.h,
      text: config.text,
      color: config.color,
    };

    pushHistory({
      ...data,
      nodes: [...data.nodes, newNode],
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  }

  function deleteSelection() {
    if (selectedNodeId) {
      const nextNodes = data.nodes.filter((n) => n.id !== selectedNodeId);
      const nextEdges = data.edges.filter(
        (e) => e.from !== selectedNodeId && e.to !== selectedNodeId,
      );
      pushHistory({ nodes: nextNodes, edges: nextEdges });
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      const nextEdges = data.edges.filter((e) => e.id !== selectedEdgeId);
      pushHistory({ ...data, edges: nextEdges });
      setSelectedEdgeId(null);
    }
  }

  function duplicateSelectedNode() {
    if (!selectedNodeId) return;
    const node = data.nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    const copyNode: OrgNode = {
      ...node,
      id: generateId(),
      x: node.x + 30,
      y: node.y + 30,
    };

    pushHistory({
      ...data,
      nodes: [...data.nodes, copyNode],
    });
    setSelectedNodeId(copyNode.id);
  }

  function handleZoom(delta: number, centerScreenX?: number, centerScreenY?: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = centerScreenX ?? rect.left + rect.width / 2;
    const cy = centerScreenY ?? rect.top + rect.height / 2;

    const mouseX = cx - rect.left;
    const mouseY = cy - rect.top;

    const nextZoom = Math.min(Math.max(zoom * (delta > 0 ? 1.15 : 0.85), 0.2), 3);

    setPan({
      x: mouseX - (mouseX - pan.x) * (nextZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (nextZoom / zoom),
    });
    setZoom(nextZoom);
  }

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (editingNodeId) return; // Typing inside inline editor

      if (e.code === 'Space') {
        isSpacePressed.current = true;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
          return;
        }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateSelectedNode();
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setEditingNodeId(null);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoom(1);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoom(-1);
        return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
  }

  // Mouse down on background canvas (pan or deselect)
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget && (e.target as Element).tagName !== 'svg') {
      return;
    }

    // Right-click or middle-click or Space+click = Pan
    if (e.button === 1 || e.button === 2 || isSpacePressed.current || e.button === 0) {
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      if (editingNodeId) {
        commitNodeText();
      }
    }
  }

  // Mouse move handler for canvas operations
  function handleMouseMove(e: React.MouseEvent) {
    if (dragState.type === 'none') return;

    if (dragState.type === 'pan') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setPan({
        x: dragState.origPanX + dx,
        y: dragState.origPanY + dy,
      });
      return;
    }

    if (dragState.type === 'move_node') {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      setData((curr) => ({
        ...curr,
        nodes: curr.nodes.map((n) =>
          n.id === dragState.nodeId
            ? {
                ...n,
                x: Math.round(dragState.origX + dx),
                y: Math.round(dragState.origY + dy),
              }
            : n,
        ),
      }));
      return;
    }

    if (dragState.type === 'resize_node') {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      const { origX, origY, origW, origH, handle } = dragState;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;

      if (handle === 'se') {
        newW = Math.max(50, origW + dx);
        newH = Math.max(30, origH + dy);
      } else if (handle === 'sw') {
        newW = Math.max(50, origW - dx);
        newH = Math.max(30, origH + dy);
        newX = origX + (origW - newW);
      } else if (handle === 'ne') {
        newW = Math.max(50, origW + dx);
        newH = Math.max(30, origH - dy);
        newY = origY + (origH - newH);
      } else if (handle === 'nw') {
        newW = Math.max(50, origW - dx);
        newH = Math.max(30, origH - dy);
        newX = origX + (origW - newW);
        newY = origY + (origH - newH);
      }

      setData((curr) => ({
        ...curr,
        nodes: curr.nodes.map((n) =>
          n.id === dragState.nodeId
            ? {
                ...n,
                x: Math.round(newX),
                y: Math.round(newY),
                w: Math.round(newW),
                h: Math.round(newH),
              }
            : n,
        ),
      }));
      return;
    }

    if (dragState.type === 'create_edge') {
      const currentPos = screenToCanvas(e.clientX, e.clientY);
      setDragState((curr) =>
        curr.type === 'create_edge' ? { ...curr, currentMouse: currentPos } : curr,
      );
    }
  }

  // Mouse up handler
  function handleMouseUp(e: React.MouseEvent) {
    if (dragState.type === 'create_edge') {
      // Check if dropped onto a node
      const dropPos = screenToCanvas(e.clientX, e.clientY);
      const targetNode = data.nodes.find(
        (n) =>
          n.id !== dragState.fromNodeId &&
          dropPos.x >= n.x &&
          dropPos.x <= n.x + n.w &&
          dropPos.y >= n.y &&
          dropPos.y <= n.y + n.h,
      );

      if (targetNode) {
        // Create new arrow
        const newEdge: OrgEdge = {
          id: generateId(),
          from: dragState.fromNodeId,
          to: targetNode.id,
        };
        pushHistory({
          ...data,
          edges: [...data.edges, newEdge],
        });
        setSelectedEdgeId(newEdge.id);
      }
    } else if (dragState.type === 'move_node' || dragState.type === 'resize_node') {
      // Record to history stack
      pastRef.current = [...pastRef.current.slice(-30), data];
      futureRef.current = [];
    }

    setDragState({ type: 'none' });
  }

  // Drop from Palette onto Canvas
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/orgchart-kind') as NodeKind;
    if (!kind || !DEFAULT_NODE_CONFIG[kind]) return;

    const dropCanvasPos = screenToCanvas(e.clientX, e.clientY);
    const config = DEFAULT_NODE_CONFIG[kind];
    addNode(kind, {
      x: dropCanvasPos.x - config.w / 2,
      y: dropCanvasPos.y - config.h / 2,
    });
  }

  function startEditingNode(node: OrgNode) {
    setEditingNodeId(node.id);
    setEditText(node.text);
  }

  function commitNodeText() {
    if (!editingNodeId) return;
    const targetNode = data.nodes.find((n) => n.id === editingNodeId);
    if (targetNode && targetNode.text !== editText) {
      pushHistory({
        ...data,
        nodes: data.nodes.map((n) => (n.id === editingNodeId ? { ...n, text: editText } : n)),
      });
    }
    setEditingNodeId(null);
  }

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden bg-muted/10 select-none">
      {/* Sticky Header matching calendar-view */}
      <header className="z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <h1 className="text-base font-semibold">Organigramme</h1>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Save status */}
          <div className="mr-2 text-xs">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Sauvegarde…
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" /> Enregistré
              </span>
            ) : (
              <span className="text-destructive text-xs">Erreur de sauvegarde</span>
            )}
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleUndo}
            disabled={pastRef.current.length === 0}
            title="Annuler (⌘Z)"
            className={FOCUS_RING}
          >
            <Undo2 className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRedo}
            disabled={futureRef.current.length === 0}
            title="Rétablir (⌘⇧Z)"
            className={FOCUS_RING}
          >
            <Redo2 className="size-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleZoom(1)}
            title="Zoom avant (+)"
            className={FOCUS_RING}
          >
            <Plus className="size-3.5" />
          </Button>

          <span className="w-12 text-center font-mono text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleZoom(-1)}
            title="Zoom arrière (-)"
            className={FOCUS_RING}
          >
            <Minus className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoom(1);
              setPan({ x: 80, y: 80 });
            }}
            title="Réinitialiser zoom"
            className={`text-xs ${FOCUS_RING}`}
          >
            <RotateCcw className="size-3 mr-1" /> 100%
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!selectedNodeId}
            onClick={duplicateSelectedNode}
            title="Dupliquer le nœud (⌘D)"
            className={FOCUS_RING}
          >
            <Copy className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!selectedNodeId && !selectedEdgeId}
            onClick={deleteSelection}
            title="Supprimer la sélection (Suppr)"
            className={`text-muted-foreground hover:text-destructive ${FOCUS_RING}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Shortcuts hint bar */}
        <p className="w-full text-[11px] text-muted-foreground">
          Raccourcis : <Kbd>Glisser</Kbd> depuis palette · <Kbd>Double-clic</Kbd> éditer texte ·{' '}
          <Kbd>⌘Z</Kbd> undo · <Kbd>⌘⇧Z</Kbd> redo · <Kbd>⌘D</Kbd> dupliquer · <Kbd>Suppr</Kbd>{' '}
          supprimer · <Kbd>Molette</Kbd> zoom · <Kbd>Espace+Glisser</Kbd> pan
        </p>
      </header>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
        className="relative flex-1 cursor-default overflow-hidden outline-none"
      >
        {/* Floating Tool Palette */}
        <OrgChartPalette
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onAddNode={(kind) => addNode(kind)}
        />

        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement de l&apos;organigramme…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <svg
            className="absolute inset-0 h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          >
            <defs>
              {/* Sharp crisp arrowhead marker */}
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
              </marker>
              <marker
                id="arrowhead-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2563eb" />
              </marker>
            </defs>

            {/* Transform Container with Pan and Zoom */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 1. Render Connectors (Edges) */}
              {data.edges.map((edge) => {
                const fromNode = data.nodes.find((n) => n.id === edge.from);
                const toNode = data.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const { path } = getBestConnectionPath(fromNode, toNode);
                const isSelected = selectedEdgeId === edge.id;

                return (
                  <g
                    key={edge.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Invisible wider stroke for easy clicking */}
                    <path d={path} fill="none" stroke="transparent" strokeWidth={16} />
                    {/* Visible arrow line */}
                    <path
                      d={path}
                      fill="none"
                      stroke={isSelected ? '#2563eb' : 'currentColor'}
                      strokeWidth={isSelected ? 2.5 : 1.75}
                      strokeDasharray={isSelected ? '4 2' : undefined}
                      markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                      className={
                        isSelected
                          ? 'text-blue-600'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }
                    />
                  </g>
                );
              })}

              {/* In-progress arrow preview while dragging */}
              {dragState.type === 'create_edge' ? (
                <path
                  d={getStraightPath(dragState.startPoint, dragState.currentMouse)}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  markerEnd="url(#arrowhead-selected)"
                />
              ) : null}

              {/* 2. Render Nodes */}
              {data.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isEditing = editingNodeId === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);

                      // If arrow tool is active, start dragging connection
                      if (activeTool === 'arrow') {
                        setDragState({
                          type: 'create_edge',
                          fromNodeId: node.id,
                          startPoint: { x: node.x + node.w / 2, y: node.y + node.h / 2 },
                          currentMouse: screenToCanvas(e.clientX, e.clientY),
                        });
                        return;
                      }

                      setDragState({
                        type: 'move_node',
                        nodeId: node.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: node.x,
                        origY: node.y,
                      });
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditingNode(node);
                    }}
                    className="cursor-move group"
                  >
                    {/* Node Geometry */}
                    {node.kind === 'rectangle' ? (
                      <rect
                        width={node.w}
                        height={node.h}
                        rx={8}
                        fill="var(--color-card)"
                        stroke={isSelected ? '#2563eb' : 'var(--color-border)'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="transition-colors drop-shadow-sm group-hover:stroke-foreground/50"
                      />
                    ) : node.kind === 'circle' ? (
                      <ellipse
                        cx={node.w / 2}
                        cy={node.h / 2}
                        rx={node.w / 2}
                        ry={node.h / 2}
                        fill="var(--color-card)"
                        stroke={isSelected ? '#2563eb' : 'var(--color-border)'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="transition-colors drop-shadow-sm group-hover:stroke-foreground/50"
                      />
                    ) : node.kind === 'diamond' ? (
                      <polygon
                        points={`${node.w / 2},0 ${node.w},${node.h / 2} ${node.w / 2},${node.h} 0,${node.h / 2}`}
                        fill="var(--color-card)"
                        stroke={isSelected ? '#2563eb' : 'var(--color-border)'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="transition-colors drop-shadow-sm group-hover:stroke-foreground/50"
                      />
                    ) : (
                      /* Text Box */
                      <rect
                        width={node.w}
                        height={node.h}
                        fill="transparent"
                        stroke={isSelected ? '#2563eb' : 'transparent'}
                        strokeWidth={1}
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Color accent bar on rectangle nodes */}
                    {node.kind === 'rectangle' ? (
                      <rect x={0} y={0} width={5} height={node.h} rx={2} fill={node.color} />
                    ) : null}

                    {/* Node Label or Inline Editor */}
                    {isEditing ? (
                      <foreignObject width={node.w} height={node.h}>
                        <div className="flex h-full w-full items-center justify-center p-1">
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={commitNodeText}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                commitNodeText();
                              } else if (e.key === 'Escape') {
                                setEditingNodeId(null);
                              }
                            }}
                            className="w-full rounded bg-background px-1.5 py-0.5 text-center text-xs font-medium text-foreground outline-none ring-2 ring-blue-600"
                          />
                        </div>
                      </foreignObject>
                    ) : (
                      <text
                        x={node.w / 2}
                        y={node.h / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="pointer-events-none select-none text-xs font-medium fill-foreground"
                      >
                        {node.text}
                      </text>
                    )}

                    {/* Selection Frame & Resize Handles */}
                    {isSelected ? (
                      <>
                        {/* Bounding outline */}
                        <rect
                          x={-3}
                          y={-3}
                          width={node.w + 6}
                          height={node.h + 6}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          className="pointer-events-none"
                        />

                        {/* Corner Resize Handles: NW, NE, SE, SW */}
                        {(['nw', 'ne', 'se', 'sw'] as const).map((handle) => {
                          const hx = handle.includes('e') ? node.w : 0;
                          const hy = handle.includes('s') ? node.h : 0;
                          return (
                            <rect
                              key={handle}
                              x={hx - 4}
                              y={hy - 4}
                              width={8}
                              height={8}
                              fill="#2563eb"
                              stroke="#ffffff"
                              strokeWidth={1}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize_node',
                                  nodeId: node.id,
                                  handle,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  origX: node.x,
                                  origY: node.y,
                                  origW: node.w,
                                  origH: node.h,
                                });
                              }}
                              className={`cursor-${handle}-resize`}
                            />
                          );
                        })}
                      </>
                    ) : null}

                    {/* Arrow Connection Ports (visible on hover or select) */}
                    {isSelected || activeTool === 'arrow' ? (
                      <>
                        {[
                          { name: 'top', x: node.w / 2, y: 0 },
                          { name: 'right', x: node.w, y: node.h / 2 },
                          { name: 'bottom', x: node.w / 2, y: node.h },
                          { name: 'left', x: 0, y: node.h / 2 },
                        ].map((port) => (
                          <circle
                            key={port.name}
                            cx={port.x}
                            cy={port.y}
                            r={4}
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth={1.5}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                type: 'create_edge',
                                fromNodeId: node.id,
                                startPoint: {
                                  x: node.x + port.x,
                                  y: node.y + port.y,
                                },
                                currentMouse: screenToCanvas(e.clientX, e.clientY),
                              });
                            }}
                            className="cursor-crosshair transition-transform hover:scale-125"
                          />
                        ))}
                      </>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}
