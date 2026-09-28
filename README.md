# Japan Trip Hub source files

This bundle contains the source for the Japan Trip Hub, including the shared editable calendar.

## Main files

- `site/index.html` — page structure and trip content
- `site/styles.css` and `site/calendar.css` — visual styling
- `site/app.js` — weather, map, checklist, notes, and calendar interactions
- `worker/index.js` — site server and calendar API
- `drizzle/0000_calendar.sql` — calendar database table and index
- `scripts/build-worker.mjs` — inlines the site assets into the Worker build
- `scripts/build.sh` — build command used for deployment
- `.openai/hosting.json` — Sites project manifest and D1 binding

The calendar uses the site's D1 database, so events are shared across devices for people who can access the site. The checklist and quick notes are intentionally saved per browser.

## Editing

Most content edits can be made in `site/index.html`. Weather locations and starter map stops are in `site/app.js`. The calendar form and API endpoints are also in `site/app.js` and `worker/index.js`.

Do not remove the `DB` binding or the calendar migration unless the calendar is being redesigned.
