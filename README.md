# EduNotes

A local-first learning library and markdown lesson studio.

## Structure

- `index.html` — main application shell
- `styles.css` — all styles
- `app.js` — application logic, routing, rendering
- `studio/editor.html` — the student preview iframe document used inside Studio

## Running

Open `index.html` in a browser. No build step is required. The app uses CDN scripts for
Markdown parsing, sanitization, KaTeX math, and fonts.

## Notes

- Content, bookmarks, notes, and progress are stored in `localStorage` under `edunotes.v1`.
- The Studio live preview loads `studio/editor.html` in an iframe and injects the same
  stylesheet, so the preview matches the student reader exactly.
- Export lessons as `.md` from Studio to keep a portable copy.
