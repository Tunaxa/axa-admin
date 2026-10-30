import type { OrgNode } from './types';

export interface Point {
  x: number;
  y: number;
}

export function getNodeAnchors(node: OrgNode): {
  top: Point;
  bottom: Point;
  left: Point;
  right: Point;
  center: Point;
} {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;

  return {
    top: { x: cx, y: node.y },
    bottom: { x: cx, y: node.y + node.h },
    left: { x: node.x, y: cy },
    right: { x: node.x + node.w, y: cy },
    center: { x: cx, y: cy },
  };
}

/**
 * Finds the best anchor pair between two nodes based on their relative positions.
 */
export function getBestConnectionPath(
  fromNode: OrgNode,
  toNode: OrgNode,
): { path: string; start: Point; end: Point } {
  const fromAnchors = getNodeAnchors(fromNode);
  const toAnchors = getNodeAnchors(toNode);

  const dx = toAnchors.center.x - fromAnchors.center.x;
  const dy = toAnchors.center.y - fromAnchors.center.y;

  let start: Point;
  let end: Point;

  if (Math.abs(dy) > Math.abs(dx)) {
    // Mostly vertical layout
    if (dy > 0) {
      start = fromAnchors.bottom;
      end = toAnchors.top;
    } else {
      start = fromAnchors.top;
      end = toAnchors.bottom;
    }
    const delta = Math.abs(end.y - start.y) / 2;
    const cp1 = { x: start.x, y: start.y + (dy > 0 ? delta : -delta) };
    const cp2 = { x: end.x, y: end.y + (dy > 0 ? -delta : delta) };
    return {
      path: `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`,
      start,
      end,
    };
  }

  // Mostly horizontal layout
  if (dx > 0) {
    start = fromAnchors.right;
    end = toAnchors.left;
  } else {
    start = fromAnchors.left;
    end = toAnchors.right;
  }
  const delta = Math.abs(end.x - start.x) / 2;
  const cp1 = { x: start.x + (dx > 0 ? delta : -delta), y: start.y };
  const cp2 = { x: end.x + (dx > 0 ? -delta : delta), y: end.y };

  return {
    path: `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`,
    start,
    end,
  };
}

/**
 * Straight path from point to point for in-progress connection dragging.
 */
export function getStraightPath(start: Point, end: Point): string {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}
