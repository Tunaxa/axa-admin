/**
 * Format data de l'organigramme :
 * {
 *   nodes: { id, kind, x, y, w, h, text, color }[],
 *   edges: { id, from, to, label? }[]
 * }
 */

export type NodeKind = 'rectangle' | 'circle' | 'diamond' | 'text';

export interface OrgNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
}

export interface OrgEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface OrgChartData {
  nodes: OrgNode[];
  edges: OrgEdge[];
}

export interface OrgChartDocument {
  id: string;
  organizationId: string;
  name: string;
  data: OrgChartData;
  updatedAt: string;
}
