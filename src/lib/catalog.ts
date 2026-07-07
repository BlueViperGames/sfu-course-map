import type { Catalog, ActiveSelection, CourseRole, Program, Course } from '../types';
import { computeProgress } from './progress';

export function getProgram(catalog: Catalog, id: string): Program | undefined {
  return catalog.programs.find(p => p.id === id);
}

export function getCourse(catalog: Catalog, code: string): Course | undefined {
  return catalog.courses.find(c => c.code === code);
}

/** Collect all courses relevant to the current selection, with roles. */
export function buildCourseRoles(
  catalog: Catalog,
  selection: ActiveSelection,
  completedCourses: string[] = [],
  inProgressCourses: string[] = [],
): Map<string, Set<CourseRole>> {
  const roles = new Map<string, Set<CourseRole>>();
  const completed = new Set(completedCourses);
  const inProgress = new Set(inProgressCourses);
  const progress = computeProgress(catalog, selection, completedCourses, inProgressCourses, {});

  const add = (code: string, role: CourseRole) => {
    if (!roles.has(code)) roles.set(code, new Set());
    roles.get(code)!.add(role);
  };

  const major = getProgram(catalog, selection.majorId);
  if (!major) return roles;

  for (const code of major.required ?? []) add(code, 'required');
  for (const code of major.bscExtra ?? []) add(code, 'bsc-extra');

  for (const group of major.choiceGroups ?? []) {
    for (const opt of group.options) add(opt, 'choice');
    const picked = selection.choiceSelections[group.id] ?? group.options[0];
    if (picked) add(picked, 'required');
  }

  for (const concId of selection.concentrations) {
    const conc = getProgram(catalog, concId);
    if (conc?.courses) {
      for (const code of conc.courses) add(code, 'concentration');
    }
  }

  for (const minorId of selection.minors) {
    const minor = getProgram(catalog, minorId);
    if (!minor) continue;
    for (const code of minor.required ?? []) add(code, 'minor');
    for (const code of minor.implicitPrerequisites ?? []) add(code, 'prerequisite-chain');
    for (const group of minor.choiceGroups ?? []) {
      for (const opt of group.options) add(opt, 'minor');
    }
    const upper = minor.upperDivisionPickFrom ?? minor.courses ?? [];
    for (const code of upper) add(code, 'minor-upper');
  }

  const highlighted = new Set(roles.keys());
  const edgeMap = new Map<string, string[]>();
  for (const e of catalog.prerequisiteEdges) {
    if (!edgeMap.has(e.to)) edgeMap.set(e.to, []);
    edgeMap.get(e.to)!.push(e.from);
  }

  const queue = [...highlighted];
  while (queue.length) {
    const code = queue.pop()!;
    for (const prereq of edgeMap.get(code) ?? []) {
      if (!roles.has(prereq)) {
        add(prereq, 'prerequisite-chain');
        queue.push(prereq);
      }
    }
  }

  for (const code of roles.keys()) {
    if (completed.has(code)) add(code, 'completed');
    else if (inProgress.has(code)) add(code, 'in-progress');
    else if (progress.requiredRemaining.includes(code)) add(code, 'remaining');
  }

  return roles;
}

export function getProgramsByType(catalog: Catalog, type: Program['type']) {
  return catalog.programs.filter(p => p.type === type);
}

export function getDegreePrograms(catalog: Catalog): Program[] {
  return catalog.programs.filter(p =>
    ['major', 'honours', 'joint-major', 'joint-honours', 'diploma', 'certificate'].includes(p.type),
  );
}

export function getMinorPrograms(catalog: Catalog): Program[] {
  return catalog.programs.filter(p => p.type === 'minor' || p.type === 'extended-minor');
}

export function getPrerequisiteChain(
  catalog: Catalog,
  code: string,
): { upstream: string[]; downstream: string[] } {
  const upstream = new Set<string>();
  const downstream = new Set<string>();
  const edges = catalog.prerequisiteEdges;

  const walkUp = (c: string) => {
    for (const e of edges) {
      if (e.to === c && !upstream.has(e.from)) {
        upstream.add(e.from);
        walkUp(e.from);
      }
    }
  };

  const walkDown = (c: string) => {
    for (const e of edges) {
      if (e.from === c && !downstream.has(e.to)) {
        downstream.add(e.to);
        walkDown(e.to);
      }
    }
  };

  walkUp(code);
  walkDown(code);
  return { upstream: [...upstream], downstream: [...downstream] };
}

export function courseLevel(code: string): number {
  return parseInt(code.match(/\d+/)?.[0] ?? '0', 10);
}

export function isUpperDivision(code: string): boolean {
  return courseLevel(code) >= 300;
}
