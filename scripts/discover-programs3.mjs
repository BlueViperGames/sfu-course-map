const url = 'https://www.sfu.ca/students/calendar/2026/fall/areas-of-study/computing-science.html';
const res = await fetch(url, { headers: { 'User-Agent': 'sfu-course-map' } });
const html = await res.text();
const links = [...html.matchAll(/href="(\/students\/calendar\/2026\/fall\/programs\/[^"]+\.html)"/g)].map(m => m[1]);
console.log([...new Set(links)].join('\n'));
