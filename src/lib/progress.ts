import type { Catalog, ActiveSelection, ProgressSummary } from '../types';
import { getProgram } from './catalog';

export function computeProgress(
  catalog: Catalog,
  selection: ActiveSelection,
  completedCourses: string[],
  inProgressCourses: string[],
  concentrationPicks: Record<string, string[]>,
): ProgressSummary {
  const completed = new Set(completedCourses);
  const inProgress = new Set(inProgressCourses);
  const major = getProgram(catalog, selection.majorId);

  const requiredRemaining: string[] = [];
  let requiredDone = 0;
  let requiredInProgress = 0;
  let requiredTotal = 0;

  if (major?.required) {
    for (const code of major.required) {
      requiredTotal++;
      if (completed.has(code)) requiredDone++;
      else if (inProgress.has(code)) requiredInProgress++;
      else requiredRemaining.push(code);
    }
  }

  const choiceGroups = (major?.choiceGroups ?? []).map(group => {
    const selected = selection.choiceSelections[group.id] ?? group.options[0] ?? '';
    requiredTotal++;
    const done = selected ? completed.has(selected) : false;
    const prog = selected ? inProgress.has(selected) : false;
    if (!done && !prog && selected) requiredRemaining.push(selected);
    if (done) requiredDone++;
    if (prog) requiredInProgress++;
    return { id: group.id, label: group.label, selected, done, inProgress: prog };
  });

  const bscExtra = (major?.bscExtra ?? []).map(code => {
    requiredTotal++;
    const done = completed.has(code);
    const prog = inProgress.has(code);
    if (done) requiredDone++;
    if (prog) requiredInProgress++;
    else if (!done) requiredRemaining.push(code);
    return { code, done, inProgress: prog };
  });

  const concentrations = selection.concentrations.map(concId => {
    const conc = getProgram(catalog, concId);
    const picks = concentrationPicks[concId] ?? [];
    const done = picks.filter(c => completed.has(c)).length;
    const prog = picks.filter(c => inProgress.has(c) && !completed.has(c)).length;
    return {
      id: concId,
      name: conc?.name ?? concId,
      done,
      inProgress: prog,
      needed: 4,
      courses: picks,
    };
  });

  const minorProgress = selection.minors.map(minorId => {
    const minor = getProgram(catalog, minorId);
    const lowerCodes = [
      ...(minor?.required ?? []),
      ...(minor?.implicitPrerequisites ?? []),
    ];
    const lowerDone = lowerCodes.length > 0 && lowerCodes.every(c => completed.has(c));
    const upperPool = minor?.upperDivisionPickFrom ?? minor?.courses ?? [];
    const upperDone = upperPool.filter(c => completed.has(c)).length;
    return {
      id: minorId,
      name: minor?.name ?? minorId,
      lowerDone,
      upperDone,
      upperNeeded: minor?.upperDivisionCredits ?? (upperPool.length > 0 ? upperPool.length : 0),
    };
  });

  const percent = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0;

  return {
    requiredTotal,
    requiredDone,
    requiredInProgress,
    requiredRemaining,
    choiceGroups,
    bscExtra,
    concentrations,
    minorProgress,
    percent,
    inProgressCount: inProgressCourses.length,
  };
}
