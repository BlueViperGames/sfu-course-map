import { jsPDF } from 'jspdf';
import type { Catalog, ActiveSelection } from '../types';
import { getProgram, getCourse } from './catalog';
import { computeProgress } from './progress';

export async function exportPlanPdf(
  catalog: Catalog,
  selection: ActiveSelection,
  completedCourses: string[],
  inProgressCourses: string[],
  concentrationPicks: Record<string, string[]>,
  graphElement: HTMLElement | null,
) {
  const progress = computeProgress(catalog, selection, completedCourses, inProgressCourses, concentrationPicks);
  const major = getProgram(catalog, selection.majorId);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const margin = 48;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;

  const heading = (text: string, size = 14) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 6;
  };

  const line = (text: string, indent = 0) => {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 12 + 4;
  };

  const check = (done: boolean, inProg = false) => {
    if (done) return '[x]';
    if (inProg) return '[~]';
    return '[ ]';
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SFU Course Plan', margin, y);
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Program: ${major?.name ?? selection.majorId}`, margin, y);
  y += 16;
  doc.text(`Calendar: ${catalog.calendarTerm}`, margin, y);
  y += 16;
  doc.text(`Progress: ${progress.requiredDone}/${progress.requiredTotal} core (${progress.percent}%), ${progress.inProgressCount} in progress`, margin, y);
  y += 24;

  heading('Required Courses');
  for (const code of major?.required ?? []) {
    const course = getCourse(catalog, code);
    const done = completedCourses.includes(code);
    const inProg = inProgressCourses.includes(code);
    line(`${check(done, inProg)} ${code} — ${course?.title ?? ''} (${course?.units ?? '?'} units)`);
  }

  if (progress.choiceGroups.length) {
    heading('Course Choices');
    for (const g of progress.choiceGroups) {
      line(`${check(g.done, g.inProgress)} ${g.label}: ${g.selected}`);
    }
  }

  if (progress.bscExtra.length) {
    heading('BSc Additional');
    for (const item of progress.bscExtra) {
      const course = getCourse(catalog, item.code);
      line(`${check(item.done)} ${item.code} — ${course?.title ?? ''}`);
    }
  }

  if (selection.concentrations.length) {
    heading('Concentrations');
    for (const concId of selection.concentrations) {
      const conc = getProgram(catalog, concId);
      const picks = concentrationPicks[concId] ?? [];
      line(`${conc?.name ?? concId} (${picks.filter(c => completedCourses.includes(c)).length}/4 courses):`);
      for (const code of picks) {
        const course = getCourse(catalog, code);
        line(`${check(completedCourses.includes(code))} ${code} — ${course?.title ?? ''}`, 12);
      }
      if (picks.length === 0) line('  (No courses selected yet)', 12);
    }
  }

  if (selection.minors.length) {
    heading('Minors');
    for (const m of progress.minorProgress) {
      line(`${m.name}: lower ${m.lowerDone ? 'done' : 'pending'}, upper ${m.upperDone}/${m.upperNeeded} credits`);
    }
  }

  if (progress.requiredRemaining.length) {
    heading('Still Needed');
    line(progress.requiredRemaining.join(', ') || 'None — core requirements complete!');
  }

  if (major?.rules?.length) {
    heading('Program Rules');
    for (const rule of major.rules) {
      line(`${rule.label}: ${rule.description}`);
    }
  }

  // Graph snapshot on second page
  if (graphElement) {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(graphElement, {
        backgroundColor: '#0f0f0f',
        scale: 1.5,
        logging: false,
      });
      doc.addPage();
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxHeight = doc.internal.pageSize.getHeight() - margin * 2;
      const scale = imgHeight > maxHeight ? maxHeight / imgHeight : 1;
      doc.addImage(imgData, 'PNG', margin, margin, imgWidth * scale, imgHeight * scale);
    } catch {
      // Graph capture is optional
    }
  }

  doc.save(`sfu-course-plan-${new Date().toISOString().slice(0, 10)}.pdf`);
}
