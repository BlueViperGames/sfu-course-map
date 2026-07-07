import { writeFileSync } from 'fs';

const BASE = 'https://www.sfu.ca/students/calendar/2026/fall';

const candidates = [
  '/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html',
  '/programs/computing-science/honours/bachelor-of-science-or-bachelor-of-arts.html',
  '/programs/computing-science/minor.html',
  '/programs/computing-science/post-baccalaureate-diploma.html',
  '/programs/computing-science/co-operative-education-program.html',
  '/programs/computing-science/joint-major/mathematics-and-computing-science.html',
  '/programs/computing-science/joint-major/computing-science-and-mathematics.html',
  '/programs/mathematics/joint-major/mathematics-and-computing-science.html',
  '/programs/computing-science/joint-major/business-and-computing-science.html',
  '/programs/computing-science/joint-honours/mathematics-and-computing-science.html',
  '/programs/computing-science/joint-major/computing-science-and-statistics.html',
  '/programs/statistics/joint-major/statistics-and-computing-science.html',
  '/programs/computing-science/extended-minor.html',
  '/programs/computing-science/certificate.html',
];

for (const path of candidates) {
  const url = BASE + path;
  const res = await fetch(url, { headers: { 'User-Agent': 'sfu-course-map' } });
  console.log(res.status, path);
  if (res.ok) {
    const html = await res.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
    console.log('  ', title.slice(0, 80));
  }
}
