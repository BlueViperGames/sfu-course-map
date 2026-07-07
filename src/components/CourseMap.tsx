import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Catalog, ActiveSelection } from '../types';
import { buildCourseRoles } from '../lib/catalog';
import { buildFlowElements } from '../lib/graphLayout';
import { CourseNode } from './CourseNode';

const nodeTypes: NodeTypes = { course: CourseNode };

interface CourseMapProps {
  catalog: Catalog;
  selection: ActiveSelection;
  completedCourses: string[];
  inProgressCourses: string[];
  hiddenCourses: string[];
  onSelectCourse: (code: string) => void;
  graphRef?: React.RefObject<HTMLDivElement | null>;
}

export function CourseMap({
  catalog,
  selection,
  completedCourses,
  inProgressCourses,
  hiddenCourses,
  onSelectCourse,
  graphRef,
}: CourseMapProps) {
  const completedSet = useMemo(() => new Set(completedCourses), [completedCourses]);
  const inProgressSet = useMemo(() => new Set(inProgressCourses), [inProgressCourses]);
  const hiddenSet = useMemo(() => new Set(hiddenCourses), [hiddenCourses]);
  const containerRef = useRef<HTMLDivElement>(null);

  const syncGraph = useCallback(() => {
    const roles = buildCourseRoles(catalog, selection, completedCourses, inProgressCourses);
    return buildFlowElements(catalog, roles, completedSet, inProgressSet, hiddenSet);
  }, [catalog, selection, completedCourses, inProgressCourses, completedSet, inProgressSet, hiddenSet]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => syncGraph(), [syncGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = syncGraph();
    setNodes(n);
    setEdges(e);
  }, [syncGraph, setNodes, setEdges]);

  useEffect(() => {
    if (graphRef && containerRef.current) {
      (graphRef as React.MutableRefObject<HTMLDivElement | null>).current = containerRef.current;
    }
  }, [graphRef]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      onSelectCourse(node.id);
    },
    [onSelectCourse],
  );

  const onLayout = useCallback(() => {
    const { nodes: n, edges: e } = syncGraph();
    setNodes(n);
    setEdges(e);
  }, [syncGraph, setNodes, setEdges]);

  return (
    <div className="course-map" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#2a2a2a" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => {
            const d = n.data as { completed?: boolean; inProgress?: boolean; remaining?: boolean };
            if (d.completed) return '#22c55e';
            if (d.inProgress) return '#f59e0b';
            if (d.remaining) return '#ef4444';
            return '#4b5563';
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
        <Panel position="top-right" className="map-panel">
          <span>{nodes.length} visible</span>
          {hiddenCourses.length > 0 && <span>{hiddenCourses.length} hidden</span>}
          <span>{edges.length} links</span>
          <button type="button" onClick={onLayout}>Reset layout</button>
        </Panel>
        <Panel position="bottom-left" className="map-hint">
          Click a course · Red = needed · Amber = in progress · Green = done
        </Panel>
      </ReactFlow>
    </div>
  );
}
