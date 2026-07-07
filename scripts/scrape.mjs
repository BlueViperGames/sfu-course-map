/**
 * SFU Academic Calendar scraper
 * Fetches courses and undergraduate CS program requirements.
 */

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

const CALENDAR_BASE = 'https://www.sfu.ca/students/calendar/2026/fall';
const DEPARTMENTS = ['cmpt', 'macm', 'math', 'stat', 'econ', 'psyc', 'phil', 'engl', 'hist', 'pol', 'geog', 'phys', 'chem', 'bus', 'ling'];

const COURSE_CODE_RE = /\b([A-Z]{4})\s+(\d{3}[A-Z]?)\b/g;

const MINOR_DISCOVERY_PAGES = [
  '/areas-of-study/computing-science.html',
  '/areas-of-study/mathematics.html',
  '/areas-of-study/statistics.html',
  '/areas-of-study/economics.html',
  '/areas-of-study/psychology.html',
  '/areas-of-study/linguistics.html',
  '/areas-of-study/philosophy.html',
  '/areas-of-study/business.html',
  '/areas-of-study/physics.html',
  '/areas-of-study/chemistry.html',
  '/areas-of-study/english.html',
  '/areas-of-study/history.html',
  '/areas-of-study/political-science.html',
  '/areas-of-study/geography.html',
  '/areas-of-study/data-science.html',
];

const UNDERGRAD_PROGRAMS = [
  { id: 'cs-bsc-major', type: 'major', path: '/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html' },
  { id: 'cs-honours', type: 'honours', path: '/programs/computing-science/honours/bachelor-of-science-or-bachelor-of-arts.html' },
  { id: 'cs-dual-degree', type: 'major', path: '/programs/computing-science-dual-degree-program/major/bachelor-of-science.html' },
  { id: 'cs-second-degree', type: 'major', path: '/programs/computing-science-second-degree/major/bachelor-of-science-or-bachelor-of-arts.html' },
  { id: 'software-systems-bsc', type: 'major', path: '/programs/software-systems/major/bachelor-of-science.html' },
  { id: 'math-cs-joint-major', type: 'joint-major', path: '/programs/mathematics-and-computing-science/joint-major/bachelor-of-science.html' },
  { id: 'cs-linguistics-joint-major', type: 'joint-major', path: '/programs/computing-science-and-linguistics/joint-major/bachelor-of-arts-or-bachelor-of-science.html' },
  { id: 'bus-cs-joint-major', type: 'joint-major', path: '/programs/information-systems-in-business-administration-and-computing-science/joint-major/bachelor-of-business-administration-or-bachelor-of-science.html' },
  { id: 'mbb-cs-joint-major', type: 'joint-major', path: '/programs/molecular-biology-and-biochemistry-and-computing-science/joint-major/bachelor-of-science.html' },
  { id: 'math-cs-joint-honours', type: 'joint-honours', path: '/programs/mathematics-and-computing-science/joint-honours/bachelor-of-science.html' },
  { id: 'mbb-cs-joint-honours', type: 'joint-honours', path: '/programs/molecular-biology-and-biochemistry-and-computing-science/joint-honours/bachelor-of-science.html' },
  { id: 'gis-honours', type: 'honours', path: '/programs/geographic-information-science/honours/bachelor-of-science.html' },
  { id: 'cs-pbd', type: 'diploma', path: '/programs/computing-science/post-baccalaureate-diploma.html' },
  { id: 'computing-studies-cert', type: 'certificate', path: '/programs/computing-studies/certificate.html' },
];

const STOP_SECTIONS = [
  'elective courses',
  'areas of concentration',
  'table i',
  'table ii',
  'table iii',
  'other requirements',
  'university degree requirements',
  'writing, quantitative',
  'residency requirements',
  'co-operative education',
];

const CHOICE_HEADERS = ['and one of', 'or one of', 'one of'];
const PATH_HEADERS = ['or both of', 'complete both of', 'both of'];

function normalizeCode(dept, num) {
  return `${dept.toUpperCase()} ${num.toUpperCase()}`;
}

function extractCourseCodes(text) {
  const codes = new Set();
  let m;
  const re = new RegExp(COURSE_CODE_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    codes.add(normalizeCode(m[1], m[2]));
  }
  return [...codes];
}

function parsePrerequisites(text) {
  const preMatch = text.match(
    /Prerequisite[s]?:\s*([\s\S]*?)(?:\.(?:\s|$)|Corequisite|Recommended|Quantitative|Writing|$)/i,
  );
  if (!preMatch) return { raw: null, courses: [] };
  const raw = preMatch[1].trim().replace(/\s+/g, ' ');
  return { raw, courses: extractCourseCodes(raw) };
}

function parseCourseHeader(line) {
  const m = line.match(/^([A-Z]{4})\s+(\d{3}[A-Z]?)\s*[-–]\s*(.+?)\s*\((\d+)\)\s*$/i);
  if (!m) return null;
  return {
    code: normalizeCode(m[1], m[2]),
    title: m[3].trim(),
    units: parseInt(m[4], 10),
  };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'sfu-course-map/0.1 (educational project)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseCourseListPage(html, dept) {
  const $ = cheerio.load(html);
  const courses = [];
  const seen = new Set();

  // Prefer structured course divs when present
  $('.course').each((_, el) => {
    const link = $(el).find('a.course-link').first();
    if (!link.length) return;
    const parsed = parseCourseHeader(link.text().replace(/\s+/g, ' ').trim());
    if (!parsed || !parsed.code.startsWith(dept.toUpperCase())) return;

    const desc = $(el).find('.course-description').text().replace(/\s+/g, ' ').trim()
      || $(el).text().replace(/\s+/g, ' ').trim();
    const { raw, courses: prereqCourses } = parsePrerequisites(desc);
    const level = parseInt(parsed.code.match(/\d+/)?.[0] ?? '0', 10);

    if (!seen.has(parsed.code)) {
      seen.add(parsed.code);
      courses.push({
        code: parsed.code,
        title: parsed.title,
        units: parsed.units,
        level,
        department: dept.toUpperCase(),
        description: desc.slice(0, 800),
        prerequisiteRaw: raw,
        prerequisites: prereqCourses,
      });
    }
  });

  if (courses.length === 0) {
    $('h3').each((_, el) => {
      const headerText = $(el).text().trim();
      const parsed = parseCourseHeader(headerText);
      if (!parsed || !parsed.code.startsWith(dept.toUpperCase())) return;

      let desc = '';
      let sibling = $(el).next();
      while (sibling.length && !sibling.is('h3')) {
        if (sibling.is('p')) desc += sibling.text() + ' ';
        sibling = sibling.next();
      }

      desc = desc.trim();
      const { raw, courses: prereqCourses } = parsePrerequisites(desc);
      const level = parseInt(parsed.code.match(/\d+/)?.[0] ?? '0', 10);

      if (!seen.has(parsed.code)) {
        seen.add(parsed.code);
        courses.push({
          code: parsed.code,
          title: parsed.title,
          units: parsed.units,
          level,
          department: dept.toUpperCase(),
          description: desc.slice(0, 800),
          prerequisiteRaw: raw,
          prerequisites: prereqCourses,
        });
      }
    });
  }

  return courses;
}

function parseConcentrations(html, { mode = 'table1' } = {}) {
  const $ = cheerio.load(html);
  const concentrations = [];
  let active = false;
  let currentConcentration = null;

  const flush = () => {
    if (currentConcentration) {
      concentrations.push(currentConcentration);
      currentConcentration = null;
    }
  };

  const addCourseFromLink = ($link) => {
    const text = $link.text().replace(/\s+/g, ' ').trim();
    const parsed = parseCourseHeader(text);
    if (parsed && currentConcentration && !currentConcentration.courses.includes(parsed.code)) {
      currentConcentration.courses.push(parsed.code);
    }
  };

  $('body').find('h3, h4, .course').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    const text = $el.text().trim().toLowerCase();

    if (tag === 'h3') {
      if (mode === 'table1' && text.includes('table i')) {
        active = true;
        return;
      }
      if (mode === 'upper-division' && text.includes('upper division requirements')) {
        active = true;
        return;
      }
      if (text.includes('table ii') || text.includes('table iii')) {
        flush();
        active = false;
      }
      return;
    }

    if (!active) return;

    if (tag === 'h4') {
      const name = $el.text().trim();
      if (name.startsWith('A grade')) return;
      flush();
      currentConcentration = {
        id: slugify(name),
        name,
        type: 'concentration',
        courses: [],
      };
      return;
    }

    if (tag === 'div' && $el.hasClass('course') && currentConcentration) {
      const link = $el.find('a.course-link').first();
      if (link.length) addCourseFromLink(link);
    }
  });

  flush();
  return concentrations;
}

function isStopSection(text) {
  const lower = text.toLowerCase();
  return STOP_SECTIONS.some(s => lower.includes(s));
}

function isChoiceHeader(text) {
  const lower = text.toLowerCase();
  return CHOICE_HEADERS.some(s => lower === s || lower.startsWith(s));
}

function isPathChoiceHeader(text) {
  const lower = text.toLowerCase();
  return PATH_HEADERS.some(s => lower.includes(s));
}

/** Generic parser for program requirement sections. */
function parseProgramPage(html, { id, type }) {
  const $ = cheerio.load(html);
  const required = [];
  const choiceGroups = [];
  const rules = [];
  let phase = null;
  let inProgram = false;
  let currentChoice = null;
  let choiceIndex = 0;
  let pathChoice = null;

  const addRequired = (code) => {
    if (!required.includes(code)) required.push(code);
  };

  const flushChoice = () => {
    if (currentChoice && currentChoice.options.length > 0) {
      choiceGroups.push(currentChoice);
    }
    currentChoice = null;
  };

  $('body').find('h2, h3, h4, .course, p').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const $el = $(el);
    const text = $el.text().trim();

    if (tag === 'h2' && text.toLowerCase().includes('program requirements')) {
      inProgram = true;
      return;
    }

    if (!inProgram) return;

    if (tag === 'h3') {
      const lower = text.toLowerCase();
      if (isStopSection(lower)) {
        phase = null;
        flushChoice();
        pathChoice = null;
        return;
      }

      if (lower.includes('lower division requirements')) {
        phase = 'lower';
        flushChoice();
        pathChoice = null;
        return;
      }

      if (lower.includes('upper division requirements')) {
        phase = 'upper';
        flushChoice();
        pathChoice = null;
        return;
      }

      if (lower.includes('breadth requirement') || lower.includes('depth requirement')) {
        phase = 'requirement';
        flushChoice();
        pathChoice = null;
        const desc = $el.next('p').text().trim() || text;
        rules.push({
          id: slugify(text),
          label: text.replace(/ Requirement$/i, ''),
          description: desc.slice(0, 300),
        });
        return;
      }

      if (lower.includes('bsc credential')) {
        phase = 'requirement';
        const desc = $el.next('p').text().trim() || text;
        rules.push({
          id: slugify(text),
          label: text.replace(/ Requirement$/i, ''),
          description: desc.slice(0, 300),
        });
        return;
      }

      if (isChoiceHeader(lower)) {
        flushChoice();
        currentChoice = {
          id: `${id}-choice-${choiceIndex++}`,
          label: text,
          pick: 1,
          options: [],
        };
        return;
      }

      if (isPathChoiceHeader(lower)) {
        flushChoice();
        pathChoice = {
          id: `${id}-path-${choiceIndex++}`,
          label: text,
          pick: 1,
          options: [],
        };
        return;
      }

      if (lower === 'and all of' || lower.startsWith('students complete') || lower.startsWith('complete ')) {
        flushChoice();
        pathChoice = null;
        return;
      }
    }

    if (tag === 'div' && $el.hasClass('course') && phase) {
      const link = $el.find('a.course-link').first();
      if (!link.length) return;
      const parsed = parseCourseHeader(link.text().replace(/\s+/g, ' ').trim());
      if (!parsed) return;

      if (currentChoice) {
        if (!currentChoice.options.includes(parsed.code)) {
          currentChoice.options.push(parsed.code);
        }
      } else if (pathChoice) {
        if (!pathChoice.options.includes(parsed.code)) {
          pathChoice.options.push(parsed.code);
        }
      } else {
        addRequired(parsed.code);
      }
    }
  });

  flushChoice();
  if (pathChoice?.options.length) choiceGroups.push(pathChoice);

  // Standard math choice groups for programs that include them
  const mathCodes = new Set(extractCourseCodes(required.join(' ')));
  const hasMathTrack = [...mathCodes].some(c => c.startsWith('MATH'));
  if (hasMathTrack || type === 'major' || type === 'honours' || type === 'joint-major') {
    const calc1 = ['MATH 150', 'MATH 151', 'MATH 154', 'MATH 157'];
    const calc2 = ['MATH 152', 'MATH 155', 'MATH 158'];
    const linear = ['MATH 232', 'MATH 240'];
    const existingIds = new Set(choiceGroups.map(g => g.id));
    if (!existingIds.has('calculus-1') && calc1.some(c => mathCodes.has(c) || required.length > 5)) {
      choiceGroups.unshift(
        { id: 'linear-algebra', label: 'Linear Algebra', pick: 1, options: linear },
        { id: 'calculus-2', label: 'Calculus II', pick: 1, options: calc2 },
        { id: 'calculus-1', label: 'Calculus I', pick: 1, options: calc1 },
      );
    }
  }

  const bscExtra = required.includes('MACM 316') ? ['MACM 316'] : [];
  if (bscExtra.length) {
    const idx = required.indexOf('MACM 316');
    if (idx >= 0) required.splice(idx, 1);
  }

  // Remove all choice-group options from required (they are pick-one)
  const choiceCodes = new Set(choiceGroups.flatMap(g => g.options));
  for (const code of [...required]) {
    if (choiceCodes.has(code)) {
      required.splice(required.indexOf(code), 1);
    }
  }

  const pageTitle = $('title').text().split(' - ')[0]?.trim();
  const h1 = $('h1').first().text().trim();
  const name = h1 && h1.length < 80 && !h1.includes('Simon Fraser') ? h1 : pageTitle || id;

  return {
    id,
    name,
    type,
    faculty: 'Applied Sciences',
    required,
    choiceGroups,
    bscExtra,
    rules,
  };
}

function parseCourseFromDiv($, el) {
  const $el = $(el);
  const link = $el.find('a.course-link').first();
  if (!link.length) return null;
  const parsed = parseCourseHeader(link.text().replace(/\s+/g, ' ').trim());
  if (!parsed) return null;

  const desc = $el.find('.course-description').text().replace(/\s+/g, ' ').trim()
    || $el.text().replace(/\s+/g, ' ').trim();
  const { raw, courses: prereqCourses } = parsePrerequisites(desc);
  const level = parseInt(parsed.code.match(/\d+/)?.[0] ?? '0', 10);
  const dept = parsed.code.split(' ')[0];

  return {
    code: parsed.code,
    title: parsed.title,
    units: parsed.units,
    level,
    department: dept,
    description: desc.slice(0, 800),
    prerequisiteRaw: raw,
    prerequisites: prereqCourses,
  };
}

function extractCoursesFromPage(html) {
  const $ = cheerio.load(html);
  const courses = [];
  const seen = new Set();
  $('.course').each((_, el) => {
    const c = parseCourseFromDiv($, el);
    if (c && !seen.has(c.code)) {
      seen.add(c.code);
      courses.push(c);
    }
  });
  return courses;
}

function parseFacultyFromHtml(html) {
  const $ = cheerio.load(html);
  const text = $('body').text();
  const m = text.match(/Faculty of ([A-Za-z\s]+?)(?:\||Department|School|Simon Fraser)/);
  return m ? m[1].trim() : 'Other';
}

function courseLevel(code) {
  return parseInt(code.match(/\d+/)?.[0] ?? '0', 10);
}

function splitCoursesByLevel(codes) {
  const lower = [];
  const upper = [];
  for (const code of codes) {
    if (courseLevel(code) >= 300) upper.push(code);
    else lower.push(code);
  }
  return { lower, upper };
}

async function discoverMinorPaths() {
  const paths = new Set(['/programs/computing-science/minor.html']);
  for (const page of MINOR_DISCOVERY_PAGES) {
    try {
      const html = await fetchHtml(`${CALENDAR_BASE}${page}`);
      const links = [...html.matchAll(/href="(\/students\/calendar\/2026\/fall\/programs\/[^"]+)"/g)].map(m => m[1]);
      for (const link of links) {
        const rel = link.replace('/students/calendar/2026/fall', '');
        if (
          (rel.endsWith('/minor.html') || rel.endsWith('/extended-minor.html'))
          && !rel.includes('french-cohort')
        ) {
          paths.add(rel);
        }
      }
    } catch {
      // skip missing area pages
    }
    await sleep(100);
  }
  return [...paths].sort();
}

function parseGenericMinor(html, path) {
  const rel = path.replace('/students/calendar/2026/fall', '');
  const id = rel
    .replace('/programs/', '')
    .replace(/\//g, '-')
    .replace('.html', '');
  const type = path.includes('extended-minor') ? 'extended-minor' : 'minor';

  if (id === 'computing-science-minor') {
    return parseMinorPage(html);
  }

  const parsed = parseProgramPage(html, { id, type });
  const allCodes = [
    ...parsed.required,
    ...parsed.choiceGroups.flatMap(g => g.options),
  ];
  const { lower, upper } = splitCoursesByLevel([...new Set(allCodes)]);

  return {
    ...parsed,
    type,
    faculty: parseFacultyFromHtml(html),
    required: lower,
    upperDivisionPickFrom: upper.length > 0 ? upper : undefined,
    upperDivisionCredits: upper.length > 0 ? Math.min(upper.length, 20) : undefined,
    choiceGroups: parsed.choiceGroups.map(g => ({
      ...g,
      id: `${id}-${g.id}`,
    })),
  };
}

function mergeCourses(targetMap, courses) {
  for (const c of courses) {
    if (!targetMap.has(c.code)) targetMap.set(c.code, c);
  }
}

function parseMinorPage(html) {
  const concentrations = parseConcentrations(html, { mode: 'upper-division' });
  const allUpperCourses = new Set();
  for (const c of concentrations) {
    for (const course of c.courses) allUpperCourses.add(course);
  }

  return {
    id: 'cs-minor',
    name: 'Computing Science Minor',
    type: 'minor',
    faculty: 'Applied Sciences',
    required: ['CMPT 225'],
    prerequisiteNote: 'Requires CMPT 125/135 and MACM 101 (or equivalents)',
    implicitPrerequisites: ['CMPT 120', 'CMPT 125', 'MACM 101'],
    upperDivisionCredits: 15,
    upperDivisionPickFrom: [...allUpperCourses].sort(),
    concentrations,
  };
}

async function scrapeCourses() {
  const allCourses = new Map();

  for (const dept of DEPARTMENTS) {
    const url = `${CALENDAR_BASE}/courses/${dept}.html`;
    console.log(`Fetching ${dept.toUpperCase()} courses...`);
    try {
      const html = await fetchHtml(url);
      const courses = parseCourseListPage(html, dept);
      console.log(`  Found ${courses.length} ${dept.toUpperCase()} courses`);
      mergeCourses(allCourses, courses);
    } catch (err) {
      console.warn(`  Skipped ${dept}: ${err.message}`);
    }
    await sleep(200);
  }

  return allCourses;
}

function buildPrerequisiteEdges(courses) {
  const courseSet = new Set(courses.map(c => c.code));
  const edges = [];

  for (const course of courses) {
    for (const prereq of course.prerequisites) {
      if (courseSet.has(prereq)) {
        edges.push({ from: prereq, to: course.code, type: 'prerequisite' });
      }
    }
  }

  return edges;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log('Scraping SFU calendar...\n');
  const courseMap = await scrapeCourses();

  console.log('\nFetching CS degree programs...');
  const programs = [];
  let majorHtml = null;

  for (const cfg of UNDERGRAD_PROGRAMS) {
    const url = `${CALENDAR_BASE}${cfg.path}`;
    try {
      console.log(`  ${cfg.id}...`);
      const html = await fetchHtml(url);
      mergeCourses(courseMap, extractCoursesFromPage(html));
      if (cfg.path.includes('computing-science/major/')) majorHtml = html;
      programs.push(parseProgramPage(html, cfg));
      await sleep(150);
    } catch (err) {
      console.warn(`  Skipped ${cfg.id}: ${err.message}`);
    }
  }

  console.log('\nDiscovering minors...');
  const minorPaths = await discoverMinorPaths();
  console.log(`  Found ${minorPaths.length} minor programs`);

  for (const path of minorPaths) {
    const rel = path.startsWith('/programs') ? path : path.replace('/students/calendar/2026/fall', '');
    const id = rel.replace('/programs/', '').replace(/\//g, '-').replace('.html', '');
    if (programs.some(p => p.id === id || (id === 'computing-science-minor' && p.id === 'cs-minor'))) continue;
    try {
      const html = await fetchHtml(`${CALENDAR_BASE}${rel}`);
      mergeCourses(courseMap, extractCoursesFromPage(html));
      const minor = parseGenericMinor(html, rel);
      programs.push(minor);
      console.log(`  + ${minor.name}`);
      await sleep(120);
    } catch (err) {
      console.warn(`  Skipped minor ${path}: ${err.message}`);
    }
  }

  const courses = [...courseMap.values()].sort((a, b) => a.code.localeCompare(b.code));

  if (majorHtml) {
    const concentrations = parseConcentrations(majorHtml);
    const major = programs.find(p => p.id === 'cs-bsc-major');
    if (major) {
      major.concentrations = concentrations.map(c => ({
        ...c,
        requirementNote: '4 courses in this area (2 must be 400-level)',
      }));
    }

    for (const c of concentrations) {
      programs.push({
        id: `concentration-${c.id}`,
        name: `${c.name} Concentration`,
        type: 'concentration',
        parentProgram: 'cs-bsc-major',
        area: c.name,
        courses: c.courses,
        requirementNote: '4 courses in this area, 2 at 400-level',
      });
    }
  }

  const catalog = {
    scrapedAt: new Date().toISOString(),
    calendarTerm: '2026/fall',
    source: CALENDAR_BASE,
    courses,
    prerequisiteEdges: buildPrerequisiteEdges(courses),
    programs,
  };

  const outPath = join(DATA_DIR, 'catalog.json');
  writeFileSync(outPath, JSON.stringify(catalog, null, 2));
  console.log(`\nWrote ${courses.length} courses, ${catalog.prerequisiteEdges.length} prerequisite edges`);
  console.log(`Wrote ${programs.length} programs to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
