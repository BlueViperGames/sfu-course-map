# SFU Course Map

Interactive mind-map of SFU Computing Science degree requirements, course prerequisites, minors, and concentrations.

## Setup

```bash
npm install
npm run scrape   # fetch latest data from SFU calendar
npm run dev      # start dev server at http://localhost:5173
```

## Features

- **15+ degree programs** — Major, Honours, Joint Major, Joint Honours, Minor, PBD, Certificate
- **Prerequisite graph** — visual arrows showing which courses unlock others
- **Concentrations** — toggle Table I areas and pick up to 4 courses each
- **31 minors** — CS plus Math, Stats, Econ, Psych, English, History, and more (grouped by faculty)
- **Course status** — Not started / In progress / Completed (click any course)
- **Hide courses** — remove clutter from the map; unhide from sidebar
- **PDF export** — download your plan with progress + graph snapshot
- **Scraper** — pulls from the official SFU 2026 Fall calendar

## Data

Run `npm run scrape` to refresh `data/catalog.json` from:

- https://www.sfu.ca/students/calendar/2026/fall/courses/
- https://www.sfu.ca/students/calendar/2026/fall/programs/computing-science/

## Stack

React · TypeScript · Vite · React Flow · Dagre
