# Standalone prototype

The team's first version of Althil, kept for reference. It is superseded by
`app/`, which merges these pieces into one FastAPI application and container.

- `backend/` — FastAPI service (`main.py`) with sun position, shade points and
  grey-surface image analysis in `ai_engine.py`. Run it from inside the folder:
  `cd legacy/backend && python main.py` (port 8000).
- `frontend/` — static page that calls the backend at `http://127.0.0.1:8000`.
  Open `index.html` directly or serve it on port 5500; the `app/` service's
  default `ALLOWED_ORIGINS` already includes `localhost:5500`.

This code is not covered by the tests and is not part of the container image.
