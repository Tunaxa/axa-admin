'use client';

import * as React from 'react';
import { ArrowRight, Circle, Diamond, Square, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FOCUS_RING } from '@/lib/focus';
import type { NodeKind } from './types';

export interface PaletteItem {
  kind: NodeKind | 'arrow';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    kind: 'rectangle',
    label: 'Rectangle',
    icon: Square,
    tooltip: 'Poste ou rôle standard',
  },
  {
    kind: 'circle',
    label: 'Cercle',
    icon: Circle,
    tooltip: 'Équipe ou département',
  },
  {
    kind: 'diamond',
    label: 'Losange',
    icon: Diamond,
    tooltip: 'Point de décision / validation',
  },
  {
    kind: 'arrow',
    label: 'Flèche',
    icon: ArrowRight,
    tooltip: 'Connecteur entre deux nœuds',
  },
  {
    kind: 'text',
    label: 'Texte',
    icon: Type,
    tooltip: 'Zone de texte libre',
  },
];

export function OrgChartPalette({
  activeTool,
  onSelectTool,
  onAddNode,
}: {
  activeTool: NodeKind | 'arrow' | 'select';
  onSelectTool: (tool: NodeKind | 'arrow' | 'select') => void;
  onAddNode: (kind: NodeKind) => void;
}) {
  return (
    <aside
      aria-label="Palette d'outils"
      className="absolute left-4 top-20 z-20 flex flex-col gap-1.5 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm"
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Outils
      </div>

      {PALETTE_ITEMS.map((item) => {
        const Icon = item.icon;
        const isArrow = item.kind === 'arrow';
        const isSelected = activeTool === item.kind;

        return (
          <div
            key={item.kind}
            draggable={!isArrow}
            onDragStart={(e) => {
              if (item.kind !== 'arrow') {
                e.dataTransfer.setData('application/orgchart-kind', item.kind);
                e.dataTransfer.effectAllowed = 'copy';
              }
            }}
            className="group relative"
          >
            <Button
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                if (isArrow) {
                  onSelectTool(isSelected ? 'select' : 'arrow');
                } else {
                  onAddNode(item.kind as NodeKind);
                }
              }}
              title={`${item.label} (glissez ou cliquez pour ajouter)`}
              className={`w-full justify-start gap-2.5 px-2.5 py-1.5 text-xs cursor-grab active:cursor-grabbing ${FOCUS_RING}`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Button>
          </div>
        );
      })}

      <div className="mt-1 border-t border-border pt-1.5 text-center text-[10px] text-muted-foreground">
        Glissez sur le canvas
      </div>
    </aside>
  );
}
