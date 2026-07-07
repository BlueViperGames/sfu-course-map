import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Catalog, CourseStatus } from './types';
import { Sidebar } from './components/Sidebar';
import { CourseMap } from './components/CourseMap';
import { CourseDetailPanel } from './components/CourseDetailPanel';
import { HiddenCoursesBar } from './components/HiddenCoursesBar';
import {
  loadState,
  saveState,
  setCourseStatus,
  toggleHidden,
  getCourseStatus,
} from './lib/storage';
import { getCourse } from './lib/catalog';
import { computeProgress } from './lib/progress';
import { exportPlanPdf } from './lib/exportPdf';
import catalogData from '../data/catalog.json';
import './App.css';

const catalog = catalogData as Catalog;

export default function App() {
  const [state, setState] = useState(loadState);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const graphRef = useRef<HTMLDivElement | null>(null);

  const { selection, completedCourses, inProgressCourses, hiddenCourses, concentrationPicks } = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const progress = useMemo(
    () => computeProgress(catalog, selection, completedCourses, inProgressCourses, concentrationPicks),
    [selection, completedCourses, inProgressCourses, concentrationPicks],
  );

  const course = selectedCourse ? getCourse(catalog, selectedCourse) : null;
  const courseStatus = selectedCourse
    ? getCourseStatus(selectedCourse, completedCourses, inProgressCourses)
    : 'not-started';

  const updateSelection = useCallback((selection: typeof state.selection) => {
    setState(prev => ({ ...prev, selection }));
  }, []);

  const handleStatusChange = useCallback((code: string, status: CourseStatus) => {
    setState(prev => {
      const { completed, inProgress } = setCourseStatus(
        prev.completedCourses,
        prev.inProgressCourses,
        code,
        status,
      );
      return { ...prev, completedCourses: completed, inProgressCourses: inProgress };
    });
  }, []);

  const toggleConcentrationCourse = useCallback((concId: string, code: string) => {
    setState(prev => {
      const current = prev.concentrationPicks[concId] ?? [];
      const next = current.includes(code)
        ? current.filter(c => c !== code)
        : current.length < 4
          ? [...current, code]
          : current;
      return {
        ...prev,
        concentrationPicks: { ...prev.concentrationPicks, [concId]: next },
      };
    });
  }, []);

  const handleUnhideCourse = useCallback((code: string) => {
    setState(prev => ({
      ...prev,
      hiddenCourses: prev.hiddenCourses.filter(c => c !== code),
    }));
    setSelectedCourse(code);
  }, []);

  const handleUnhideAll = useCallback(() => {
    setState(prev => ({ ...prev, hiddenCourses: [] }));
  }, []);

  const handleToggleHidden = useCallback((code: string) => {
    setState(prev => {
      const nextHidden = toggleHidden(prev.hiddenCourses, code);
      const isNowHidden = nextHidden.includes(code);
      // Keep detail panel open on the hidden course so user can unhide immediately
      if (isNowHidden) setSelectedCourse(code);
      return { ...prev, hiddenCourses: nextHidden };
    });
  }, []);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      await exportPlanPdf(
        catalog,
        selection,
        completedCourses,
        inProgressCourses,
        concentrationPicks,
        graphRef.current,
      );
    } finally {
      setExporting(false);
    }
  }, [selection, completedCourses, inProgressCourses, concentrationPicks]);

  return (
    <div className="app">
      <Sidebar
        catalog={catalog}
        selection={selection}
        progress={progress}
        completedCourses={completedCourses}
        inProgressCourses={inProgressCourses}
        hiddenCourses={hiddenCourses}
        concentrationPicks={concentrationPicks}
        onChange={updateSelection}
        onToggleConcentrationCourse={toggleConcentrationCourse}
        onClearProgress={() => setState(prev => ({
          ...prev,
          completedCourses: [],
          inProgressCourses: [],
        }))}
        onUnhideAll={handleUnhideAll}
        onUnhideCourse={handleUnhideCourse}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
      <main className="app__main">
        <HiddenCoursesBar
          hiddenCourses={hiddenCourses}
          onUnhide={handleUnhideCourse}
          onUnhideAll={handleUnhideAll}
        />
        <CourseMap
          catalog={catalog}
          selection={selection}
          completedCourses={completedCourses}
          inProgressCourses={inProgressCourses}
          hiddenCourses={hiddenCourses}
          onSelectCourse={setSelectedCourse}
          graphRef={graphRef}
        />
        {course && (
          <CourseDetailPanel
            course={course}
            catalog={catalog}
            status={courseStatus}
            hidden={hiddenCourses.includes(course.code)}
            onStatusChange={(status) => handleStatusChange(course.code, status)}
            onToggleHidden={() => handleToggleHidden(course.code)}
            onClose={() => setSelectedCourse(null)}
            calendarBase={catalog.source}
          />
        )}
      </main>
    </div>
  );
}
