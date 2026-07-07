interface HiddenCoursesBarProps {
  hiddenCourses: string[];
  onUnhide: (code: string) => void;
  onUnhideAll: () => void;
}

export function HiddenCoursesBar({ hiddenCourses, onUnhide, onUnhideAll }: HiddenCoursesBarProps) {
  if (hiddenCourses.length === 0) return null;

  return (
    <div className="hidden-bar" role="region" aria-label="Hidden courses">
      <div className="hidden-bar__header">
        <span className="hidden-bar__title">
          {hiddenCourses.length} hidden course{hiddenCourses.length !== 1 ? 's' : ''}
        </span>
        <button type="button" className="hidden-bar__show-all" onClick={onUnhideAll}>
          Show all
        </button>
      </div>
      <div className="hidden-bar__chips">
        {hiddenCourses.map(code => (
          <button
            key={code}
            type="button"
            className="hidden-bar__chip"
            onClick={() => onUnhide(code)}
            title={`Show ${code} on map`}
          >
            {code}
            <span className="hidden-bar__chip-x" aria-hidden>×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
