import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Catalog, CourseRole } from '../types';

export interface CourseNodeData extends Record<string, unknown> {
  code: string;
  title: string;
  units: number;
  roles: CourseRole[];
  level: number;
  completed: boolean;
  inProgress: boolean;
  remaining: boolean;
  hidden: boolean;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

export function layoutGraph(
  nodes: Node<CourseNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Node<CourseNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map(node => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

export function buildFlowElements(
  catalog: Catalog,
  courseRoles: Map<string, Set<CourseRole>>,
  completedCourses: Set<string>,
  inProgressCourses: Set<string>,
  hiddenCourses: Set<string>,
): { nodes: Node<CourseNodeData>[]; edges: Edge[] } {
  const visibleCodes = new Set(
    [...courseRoles.keys()].filter(code => !hiddenCourses.has(code)),
  );

  const nodes: Node<CourseNodeData>[] = [...visibleCodes].flatMap(code => {
    const course = catalog.courses.find(c => c.code === code);
    if (!course) return [];
    const roles = [...(courseRoles.get(code) ?? [])];
    const completed = completedCourses.has(code);
    const inProgress = inProgressCourses.has(code) && !completed;
    const remaining = roles.includes('remaining');
    return [{
      id: code,
      type: 'course',
      data: {
        code: course.code,
        title: course.title,
        units: course.units,
        roles,
        level: course.level,
        completed,
        inProgress,
        remaining,
        hidden: false,
      },
      position: { x: 0, y: 0 },
    }];
  });

  const edges: Edge[] = catalog.prerequisiteEdges
    .filter(e => visibleCodes.has(e.from) && visibleCodes.has(e.to))
    .map(e => ({
      id: `${e.from}->${e.to}`,
      source: e.from,
      target: e.to,
      type: 'prereq',
      animated: false,
    }));

  const laidOut = layoutGraph(nodes, edges);
  return { nodes: laidOut, edges };
}

export const ROLE_COLORS: Record<CourseRole, { bg: string; border: string; text: string }> = {
  required: { bg: '#1e3a5f', border: '#3b82f6', text: '#dbeafe' },
  choice: { bg: '#1a3d2e', border: '#22c55e', text: '#dcfce7' },
  'bsc-extra': { bg: '#3b2f1a', border: '#f59e0b', text: '#fef3c7' },
  concentration: { bg: '#3b1a4a', border: '#a855f7', text: '#f3e8ff' },
  minor: { bg: '#1a3d3d', border: '#14b8a6', text: '#ccfbf1' },
  'minor-upper': { bg: '#1a2e3d', border: '#06b6d4', text: '#cffafe' },
  'prerequisite-chain': { bg: '#2a2a2a', border: '#6b7280', text: '#d1d5db' },
  completed: { bg: '#14532d', border: '#22c55e', text: '#bbf7d0' },
  'in-progress': { bg: '#422006', border: '#f59e0b', text: '#fde68a' },
  remaining: { bg: '#450a0a', border: '#ef4444', text: '#fecaca' },
  other: { bg: '#1f2937', border: '#4b5563', text: '#e5e7eb' },
};

export function primaryRole(roles: CourseRole[]): CourseRole {
  const priority: CourseRole[] = [
    'remaining',
    'in-progress',
    'completed',
    'required',
    'minor',
    'concentration',
    'bsc-extra',
    'choice',
    'minor-upper',
    'prerequisite-chain',
    'other',
  ];
  for (const p of priority) {
    if (roles.includes(p)) return p;
  }
  return 'other';
}
