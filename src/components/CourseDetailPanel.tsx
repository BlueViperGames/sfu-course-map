import type { Catalog, Course } from '../types';
import type { CourseStatus } from '../types';
import { getPrerequisiteChain } from '../lib/catalog';

interface CourseDetailPanelProps {
  course: Course;
  catalog: Catalog;
  status: CourseStatus;
  hidden: boolean;
  onStatusChange: (status: CourseStatus) => void;
  onToggleHidden: () => void;
  onClose: () => void;
  calendarBase: string;
}

export function CourseDetailPanel({
  course,
  catalog,
  status,
  hidden,
  onStatusChange,
  onToggleHidden,
  onClose,
  calendarBase,
}: CourseDetailPanelProps) {
  const { upstream, downstream } = getPrerequisiteChain(catalog, course.code);
  const dept = course.code.split(' ')[0].toLowerCase();
  const num = course.code.split(' ')[1].toLowerCase();
  const calendarUrl = `${calendarBase}/courses/${dept}/${num}.html`;

  return (
    <div className="detail-panel">
      <header className="detail-panel__header">
        <div>
          <h2>{course.code}</h2>
          <p>{course.title}</p>
        </div>
        <button type="button" className="detail-panel__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="detail-panel__body">
        <div className="detail-panel__meta">
          <span>{course.units} units</span>
          <span>{course.department}</span>
          <span>{course.level >= 300 ? 'Upper division' : 'Lower division'}</span>
        </div>

        <section>
          <h3>Status</h3>
          <div className="status-picker">
            {(['not-started', 'in-progress', 'completed'] as CourseStatus[]).map(s => (
              <button
                key={s}
                type="button"
                className={`status-picker__btn status-picker__btn--${s.replace('-', '')} ${status === s ? 'status-picker__btn--active' : ''}`}
                onClick={() => onStatusChange(s)}
              >
                {s === 'not-started' ? 'Not started' : s === 'in-progress' ? 'In progress' : 'Completed'}
              </button>
            ))}
          </div>
        </section>

        <label className={`detail-panel__hide ${hidden ? 'detail-panel__hide--active' : ''}`}>
          <input type="checkbox" checked={hidden} onChange={onToggleHidden} />
          Hide from map
        </label>

        {hidden && (
          <div className="detail-panel__hidden-banner">
            <p>This course is hidden from the map.</p>
            <button type="button" onClick={onToggleHidden}>Show on map</button>
          </div>
        )}

        {course.prerequisiteRaw && (
          <section>
            <h3>Prerequisites</h3>
            <p className="detail-panel__prereq">{course.prerequisiteRaw}</p>
            {course.prerequisites.length > 0 && (
              <div className="detail-panel__tags">
                {course.prerequisites.map(p => (
                  <span key={p} className="tag">{p}</span>
                ))}
              </div>
            )}
          </section>
        )}

        {!course.prerequisiteRaw && course.prerequisites.length === 0 && (
          <section>
            <h3>Prerequisites</h3>
            <p className="detail-panel__muted">No listed prerequisites in catalog</p>
          </section>
        )}

        {upstream.length > 0 && (
          <section>
            <h3>Required before this course</h3>
            <div className="detail-panel__tags">
              {upstream.map(p => (
                <span key={p} className="tag tag--upstream">{p}</span>
              ))}
            </div>
          </section>
        )}

        {downstream.length > 0 && (
          <section>
            <h3>Unlocks</h3>
            <div className="detail-panel__tags">
              {downstream.map(p => (
                <span key={p} className="tag tag--downstream">{p}</span>
              ))}
            </div>
          </section>
        )}

        {course.description && (
          <section>
            <h3>Description</h3>
            <p className="detail-panel__desc">{course.description}</p>
          </section>
        )}

        <a href={calendarUrl} target="_blank" rel="noreferrer" className="detail-panel__link">
          View on SFU Calendar →
        </a>
      </div>
    </div>
  );
}
