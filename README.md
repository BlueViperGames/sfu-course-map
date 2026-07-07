# SFU Course Map

An interactive degree-planning tool for Simon Fraser University Computing Science students. It scrapes the official SFU academic calendar, builds a prerequisite graph, and renders it as a visual mind map — with progress tracking, hide/unhide, and PDF export.

Built to replace the "20 calendar tabs open at once" way of planning a CS degree at SFU.

## What it does

SFU degree requirements are spread across long calendar pages — required courses, math choices, breadth/depth rules, concentrations, minors — with prerequisites forming long chains (e.g. `CMPT 120 → 125 → 225 → 307`). This app pulls all of that into one place and shows how everything connects.

- **Interactive mind map** — courses as nodes, prerequisites as arrows, auto-laid-out top-to-bottom with [React Flow](https://reactflow.dev/) + [Dagre](https://github.com/dagrejs/dagre)
- **14 degree programs** — Major, Honours, Joint Major, Joint Honours, Post-Bacc Diploma, Certificate
- **31 minors** — grouped by faculty (Applied Sciences, Science, Arts & Social Sciences, Business, and more)
- **6 concentrations** — the Table I CS areas (AI, Visual & Interactive Computing, Systems, Info Systems, PL & Software, Theory), pick up to 4 courses each
- **Course status tracking** — mark courses Not Started / In Progress / Completed; remaining core requirements highlight in red
- **Hide/unhide courses** — declutter the map without losing your data
- **PDF export** — download your plan with a checklist, progress summary, and a graph snapshot
- **Scraper** — pulls live data from the official SFU calendar (~1,325 courses, ~1,091 prerequisite edges, 51 programs as of the 2026 Fall calendar)

## Screenshots

_Add a screenshot or two here — a shot of the mind map and the sidebar make this repo much easier to skim._

## Getting started

```bash
git clone https://github.com/BlueViperGames/sfu-course-map.git
cd sfu-course-map
npm install
npm run dev       # http://localhost:5173
```

Optional — refresh the data from the live SFU calendar:

```bash
npm run scrape     # writes data/catalog.json
```

Other scripts:

```bash
npm run build      # production build
npm run preview    # preview the production build locally
```

## How to use it

1. Select your degree program (e.g. Computing Science BSc Major)
2. Set your math course choices (Calculus I/II, linear algebra)
3. Toggle any minors or concentrations you're considering
4. Click a course node to see its full description, prerequisites, and what it unlocks
5. Mark courses as in progress or completed as you go
6. Hide electives you're not considering to keep the map clean
7. Export a PDF for advising appointments or personal planning

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Graph | React Flow (`@xyflow/react`), Dagre |
| Scraper | Node.js, Cheerio |
| PDF export | jsPDF, html2canvas |
| Data | Static JSON (`data/catalog.json`), regenerated via the scraper |

## Project structure

```
sfu-course-map/
├── scripts/
│   ├── scrape.mjs              # Main calendar scraper
│   └── discover-*.mjs          # Program/minor discovery helpers
├── data/catalog.json           # Generated course + program data
├── src/
│   ├── App.tsx                 # Root state & layout
│   ├── components/
│   │   ├── CourseMap.tsx       # React Flow graph
│   │   ├── CourseNode.tsx      # Course node styling
│   │   ├── CourseDetailPanel.tsx
│   │   ├── HiddenCoursesBar.tsx
│   │   └── Sidebar.tsx
│   └── lib/
│       ├── catalog.ts          # Role building, prereq chain traversal
│       ├── graphLayout.ts      # Dagre layout + node/edge construction
│       ├── progress.ts         # Progress calculation
│       ├── storage.ts          # localStorage persistence
│       └── exportPdf.ts        # PDF generation
```

## Limitations & disclaimers

- Data is scraped from the official calendar — always confirm your specific requirements with an academic advisor
- The scraper currently targets the **2026 Fall** calendar; re-run `npm run scrape` after SFU publishes updates
- Breadth/depth/WQB rules are summarized for reference, not enforced as a formal degree audit
- Concentration rules (e.g. "4 courses, 2 at 400-level") are informational only
- Not affiliated with or endorsed by SFU

## License

MIT — see [LICENSE](./LICENSE).
