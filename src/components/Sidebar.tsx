import type { Catalog, ActiveSelection, Program, ProgressSummary } from '../types';
import { getDegreePrograms, getMinorPrograms, getProgramsByType } from '../lib/catalog';

interface SidebarProps {
  catalog: Catalog;
  selection: ActiveSelection;
  progress: ProgressSummary;
  completedCourses: string[];
  inProgressCourses: string[];
  hiddenCourses: string[];
  concentrationPicks: Record<string, string[]>;
  onChange: (selection: ActiveSelection) => void;
  onToggleConcentrationCourse: (concId: string, code: string) => void;
  onClearProgress: () => void;
  onUnhideAll: () => void;
  onUnhideCourse: (code: string) => void;
  onExportPdf: () => void;
  exporting: boolean;
}

export function Sidebar({
  catalog,
  selection,
  progress,
  completedCourses,
  inProgressCourses,
  hiddenCourses,
  concentrationPicks,
  onChange,
  onToggleConcentrationCourse,
  onClearProgress,
  onUnhideAll,
  onUnhideCourse,
  onExportPdf,
  exporting,
}: SidebarProps) {
  const major = catalog.programs.find(p => p.id === selection.majorId);
  const minors = getMinorPrograms(catalog);
  const concentrations = getProgramsByType(catalog, 'concentration');
  const degrees = getDegreePrograms(catalog);
  const minorsByFaculty = groupBy(minors, p => p.faculty ?? 'Other');

  const toggleList = (key: 'minors' | 'concentrations', id: string) => {
    const list = selection[key];
    const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    onChange({ ...selection, [key]: next });
  };

  const setChoice = (groupId: string, code: string) => {
    onChange({
      ...selection,
      choiceSelections: { ...selection.choiceSelections, [groupId]: code },
    });
  };

  const groupedDegrees = groupBy(degrees, p => {
    if (p.type === 'honours' || p.type === 'joint-honours') return 'Honours';
    if (p.type === 'joint-major') return 'Joint Major';
    if (p.type === 'diploma' || p.type === 'certificate') return 'Certificate / Diploma';
    return 'Major';
  });

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h1>SFU Course Map</h1>
        <p className="sidebar__subtitle">Computing Science · {catalog.calendarTerm}</p>
      </header>

      <section className="sidebar__section sidebar__progress">
        <h2>Your Progress</h2>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="progress-text">
          {progress.requiredDone}/{progress.requiredTotal} core done
          {progress.requiredInProgress > 0 && ` · ${progress.requiredInProgress} in progress`}
          {' · '}{completedCourses.length} completed
        </p>
        {progress.requiredRemaining.length > 0 && (
          <p className="sidebar__hint">
            Still needed: {progress.requiredRemaining.slice(0, 6).join(', ')}
            {progress.requiredRemaining.length > 6 ? ` +${progress.requiredRemaining.length - 6} more` : ''}
          </p>
        )}
        <div className="sidebar__actions">
          <button type="button" className="btn btn--primary" onClick={onExportPdf} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          {completedCourses.length > 0 || inProgressCourses.length > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={onClearProgress}>
              Clear progress
            </button>
          ) : null}
        </div>
      </section>

      {hiddenCourses.length > 0 && (
        <section className="sidebar__section sidebar__section--hidden">
          <h2>Hidden on map ({hiddenCourses.length})</h2>
          <p className="sidebar__hint">Click a course to show it again</p>
          <button type="button" className="btn btn--ghost btn--small" onClick={onUnhideAll}>
            Show all
          </button>
          <div className="hidden-list">
            {hiddenCourses.map(code => (
              <button
                key={code}
                type="button"
                className="hidden-list__item"
                onClick={() => onUnhideCourse(code)}
              >
                {code} <span>show</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sidebar__section">
        <h2>Degree Program</h2>
        <select
          className="sidebar__select"
          value={selection.majorId}
          onChange={e => onChange({ ...selection, majorId: e.target.value })}
        >
          {Object.entries(groupedDegrees).map(([group, programs]) => (
            <optgroup key={group} label={group}>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {major?.rules && major.rules.length > 0 && (
          <ul className="sidebar__rules">
            {major.rules.map(r => (
              <li key={r.id}><strong>{r.label}:</strong> {r.description}</li>
            ))}
          </ul>
        )}
      </section>

      {major?.choiceGroups && major.choiceGroups.length > 0 && (
        <section className="sidebar__section">
          <h2>Course Choices</h2>
          {major.choiceGroups.map(group => (
            <div key={group.id} className="sidebar__choice">
              <label>{group.label}</label>
              <select
                className="sidebar__select"
                value={selection.choiceSelections[group.id] ?? group.options[0]}
                onChange={e => setChoice(group.id, e.target.value)}
              >
                {group.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}

      <section className="sidebar__section">
        <h2>Minors</h2>
        <p className="sidebar__hint">CS + other faculties — toggle to overlay on map</p>
        {Object.entries(minorsByFaculty).map(([faculty, facultyMinors]) => (
          <div key={faculty} className="minor-faculty-group">
            <p className="minor-faculty-group__label">{faculty}</p>
            {facultyMinors.map(minor => (
              <ToggleItem
                key={minor.id}
                program={minor}
                checked={selection.minors.includes(minor.id)}
                onToggle={() => toggleList('minors', minor.id)}
                detail={minor.type === 'extended-minor' ? 'extended' : undefined}
              />
            ))}
          </div>
        ))}
        {progress.minorProgress.map(m => (
          <p key={m.id} className="sidebar__hint sidebar__hint--small">
            {m.name}: {m.upperDone}/{m.upperNeeded} upper credits
          </p>
        ))}
      </section>

      <section className="sidebar__section">
        <h2>Concentrations</h2>
        <p className="sidebar__hint">Pick areas, then select up to 4 courses each</p>
        {concentrations.map(conc => {
          const active = selection.concentrations.includes(conc.id);
          const picks = concentrationPicks[conc.id] ?? [];
          return (
            <div key={conc.id} className="concentration-block">
              <ToggleItem
                program={conc}
                checked={active}
                onToggle={() => toggleList('concentrations', conc.id)}
                detail={`${picks.length}/4`}
              />
              {active && conc.courses && (
                <div className="concentration-courses">
                  {conc.courses.slice(0, 12).map(code => (
                    <label key={code} className="conc-course-pick">
                      <input
                        type="checkbox"
                        checked={picks.includes(code)}
                        disabled={!picks.includes(code) && picks.length >= 4}
                        onChange={() => onToggleConcentrationCourse(conc.id, code)}
                      />
                      <span>{code}</span>
                    </label>
                  ))}
                  {(conc.courses.length ?? 0) > 12 && (
                    <p className="sidebar__hint sidebar__hint--small">
                      +{(conc.courses?.length ?? 0) - 12} more on map
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="sidebar__section sidebar__legend">
        <h2>Legend</h2>
        <div className="legend-grid">
          <LegendItem color="#ef4444" label="Still needed" />
          <LegendItem color="#f59e0b" label="In progress" />
          <LegendItem color="#22c55e" label="Completed" />
          <LegendItem color="#3b82f6" label="Required" />
          <LegendItem color="#a855f7" label="Concentration" />
          <LegendItem color="#14b8a6" label="Minor" />
        </div>
      </section>

      <footer className="sidebar__footer">
        <a href={catalog.source} target="_blank" rel="noreferrer">SFU Calendar source</a>
        <span>Updated {new Date(catalog.scrapedAt).toLocaleDateString()}</span>
      </footer>
    </aside>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = keyFn(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function ToggleItem({
  program,
  checked,
  onToggle,
  detail,
}: {
  program: Program;
  checked: boolean;
  onToggle: () => void;
  detail?: string;
}) {
  return (
    <label className={`toggle-item ${checked ? 'toggle-item--active' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="toggle-item__label">{program.name}</span>
      {detail && <span className="toggle-item__detail">{detail}</span>}
    </label>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <span className="legend-item__swatch" style={{ background: color }} />
      {label}
    </div>
  );
}
