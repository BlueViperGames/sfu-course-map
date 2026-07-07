const BASE = 'https://www.sfu.ca/students/calendar/2026/fall';

// Try to find joint programs from faculty index pages
const indexes = [
  '/faculties/applied-sciences/programs.html',
  '/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html',
  '/faculties/applied-sciences/school-of-computing-science/programs.html',
];

for (const path of indexes) {
  const url = BASE + path;
  const res = await fetch(url, { headers: { 'User-Agent': 'sfu-course-map' } });
  console.log('\n', res.status, path);
  if (!res.ok) continue;
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/students\/calendar\/2026\/fall\/programs\/[^"]+)"/g)]
    .map(m => m[1])
    .filter(l => /comput|joint|math|stat|business/i.test(l));
  console.log([...new Set(links)].join('\n'));
}
