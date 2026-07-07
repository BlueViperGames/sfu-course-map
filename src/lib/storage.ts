import type { ActiveSelection, CourseStatus } from '../types';

const STORAGE_KEY = 'sfu-course-map-state';
const STORAGE_VERSION = 2;

export interface PersistedState {
  version: number;
  selection: ActiveSelection;
  completedCourses: string[];
  inProgressCourses: string[];
  hiddenCourses: string[];
  concentrationPicks: Record<string, string[]>;
}

const defaultSelection: ActiveSelection = {
  majorId: 'cs-bsc-major',
  minors: [],
  concentrations: [],
  choiceSelections: {
    'calculus-1': 'MATH 151',
    'calculus-2': 'MATH 152',
    'linear-algebra': 'MATH 240',
  },
};

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw) as Partial<PersistedState> & { version?: number };
    return {
      version: STORAGE_VERSION,
      selection: { ...defaultSelection, ...parsed.selection },
      completedCourses: parsed.completedCourses ?? [],
      inProgressCourses: parsed.inProgressCourses ?? [],
      hiddenCourses: parsed.hiddenCourses ?? [],
      concentrationPicks: parsed.concentrationPicks ?? {},
    };
  } catch {
    return defaultState();
  }
}

function defaultState(): PersistedState {
  return {
    version: STORAGE_VERSION,
    selection: defaultSelection,
    completedCourses: [],
    inProgressCourses: [],
    hiddenCourses: [],
    concentrationPicks: {},
  };
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: STORAGE_VERSION }));
}

export function getCourseStatus(
  code: string,
  completed: string[],
  inProgress: string[],
): CourseStatus {
  if (completed.includes(code)) return 'completed';
  if (inProgress.includes(code)) return 'in-progress';
  return 'not-started';
}

export function setCourseStatus(
  completed: string[],
  inProgress: string[],
  code: string,
  status: CourseStatus,
): { completed: string[]; inProgress: string[] } {
  const nextCompleted = completed.filter(c => c !== code);
  const nextInProgress = inProgress.filter(c => c !== code);

  if (status === 'completed') nextCompleted.push(code);
  if (status === 'in-progress') nextInProgress.push(code);

  return { completed: nextCompleted, inProgress: nextInProgress };
}

export function toggleHidden(hidden: string[], code: string): string[] {
  return hidden.includes(code) ? hidden.filter(c => c !== code) : [...hidden, code];
}
