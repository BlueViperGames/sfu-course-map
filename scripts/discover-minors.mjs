const BASE = 'https://www.sfu.ca/students/calendar/2026/fall';

// SFU lists minors on faculty pages and area-of-study pages
const sources = [
  '/areas-of-study/mathematics.html',
  '/areas-of-study/statistics.html',
  '/areas-of-study/economics.html',
  '/areas-of-study/psychology.html',
  '/areas-of-study/linguistics.html',
  '/areas-of-study/philosophy.html',
  '/areas-of-study/business.html',
  '/areas-of-study/physics.html',
  '/areas-of-study/chemistry.html',
  '/areas-of-study/biology.html',
  '/areas-of-study/english.html',
  '/areas-of-study/history.html',
  '/areas-of-study/political-science.html',
  '/areas-of-study/sociology-and-anthropology.html',
  '/areas-of-study/geography.html',
  '/areas-of-study/data-science.html',
];

const minors = new Set();

for (const path of sources) {
  const res = await fetch(BASE + path, { headers: { 'User-Agent': 'sfu-course-map' } });
  if (!res.ok) { console.log('skip', path); continue; }
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/students\/calendar\/2026\/fall\/programs\/[^"]*\/minor\.html)"/g)].map(m => m[1]);
  for (const l of links) minors.add(l);
  // also minor in path like /programs/foo/minor.html
  const links2 = [...html.matchAll(/href="(\/students\/calendar\/2026\/fall\/programs\/[^"]+minor[^"]*\.html)"/g)].map(m => m[1]);
  for (const l of links2) minors.add(l);
}

console.log('Found', minors.size, 'minor pages:\n');
for (const m of [...minors].sort()) console.log(m);
