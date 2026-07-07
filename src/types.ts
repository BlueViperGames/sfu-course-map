export type CourseStatus = 'not-started' | 'in-progress' | 'completed';

export interface Course {
  code: string;
  title: string;
  units: number;
  level: number;
  department: string;
  description: string;
  prerequisiteRaw: string | null;
  prerequisites: string[];
  calendarUrl?: string;
}

export interface ChoiceGroup {
  id: string;
  label: string;
  pick: number;
  options: string[];
}

export interface ProgramRule {
  id: string;
  label: string;
  description: string;
}

export type ProgramType =
  | 'major'
  | 'honours'
  | 'joint-major'
  | 'joint-honours'
  | 'minor'
  | 'extended-minor'
  | 'concentration'
  | 'diploma'
  | 'certificate';

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  faculty?: string;
  parentProgram?: string;
  area?: string;
  required?: string[];
  choiceGroups?: ChoiceGroup[];
  bscExtra?: string[];
  rules?: ProgramRule[];
  courses?: string[];
  upperDivisionPickFrom?: string[];
  upperDivisionCredits?: number;
  implicitPrerequisites?: string[];
  prerequisiteNote?: string;
  requirementNote?: string;
  concentrations?: Program[];
}

export interface PrerequisiteEdge {
  from: string;
  to: string;
  type: 'prerequisite';
}

export interface Catalog {
  scrapedAt: string;
  calendarTerm: string;
  source: string;
  courses: Course[];
  prerequisiteEdges: PrerequisiteEdge[];
  programs: Program[];
}

export type CourseRole =
  | 'required'
  | 'choice'
  | 'bsc-extra'
  | 'concentration'
  | 'minor'
  | 'minor-upper'
  | 'prerequisite-chain'
  | 'completed'
  | 'in-progress'
  | 'remaining'
  | 'other';

export interface ActiveSelection {
  majorId: string;
  minors: string[];
  concentrations: string[];
  choiceSelections: Record<string, string>;
}

export interface ProgressSummary {
  requiredTotal: number;
  requiredDone: number;
  requiredInProgress: number;
  requiredRemaining: string[];
  choiceGroups: { id: string; label: string; selected: string; done: boolean; inProgress: boolean }[];
  bscExtra: { code: string; done: boolean; inProgress: boolean }[];
  concentrations: { id: string; name: string; done: number; inProgress: number; needed: number; courses: string[] }[];
  minorProgress: { id: string; name: string; lowerDone: boolean; upperDone: number; upperNeeded: number }[];
  percent: number;
  inProgressCount: number;
}
