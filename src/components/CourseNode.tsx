import { Handle, Position, type NodeProps } from '@xyflow/react';
import { primaryRole, ROLE_COLORS, type CourseNodeData } from '../lib/graphLayout';

const ROLE_LABELS: Record<string, string> = {
  required: 'Required',
  choice: 'Choice',
  'bsc-extra': 'BSc Extra',
  concentration: 'Concentration',
  minor: 'Minor Req',
  'minor-upper': 'Minor Elective',
  'prerequisite-chain': 'Prereq',
  completed: 'Done',
  'in-progress': 'In progress',
  remaining: 'Needed',
};

export function CourseNode({ data, selected }: NodeProps) {
  const d = data as CourseNodeData;
  const role = d.completed
    ? 'completed'
    : d.inProgress
      ? 'in-progress'
      : d.remaining
        ? 'remaining'
        : primaryRole(d.roles);
  const colors = ROLE_COLORS[role];

  return (
    <div
      className={`course-node ${d.completed ? 'course-node--completed' : ''} ${d.inProgress ? 'course-node--in-progress' : ''} ${d.remaining ? 'course-node--remaining' : ''} ${selected ? 'course-node--selected' : ''}`}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <Handle type="target" position={Position.Top} className="handle" />
      {d.completed && <span className="course-node__check">✓</span>}
      {d.inProgress && !d.completed && <span className="course-node__dot" />}
      <div className="course-node__code">{d.code}</div>
      <div className="course-node__title">{d.title}</div>
      <div className="course-node__meta">
        <span>{d.units} units</span>
        <span className="course-node__badge">{ROLE_LABELS[role] ?? role}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
}
