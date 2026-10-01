# Technical Decisions

## One FastAPI process for UI and API

The map page, the report page, the static assets and the analysis endpoints are served by the same app. There is no CORS dependency for the main interface, and the container is the whole system. `ALLOWED_ORIGINS` only matters for the standalone prototype in `legacy/` or other external clients.

## Solar geometry from `pysolar`

The sun position is the one input that can be computed exactly for any coordinate and time, so it is computed rather than approximated. The prototype uses the current UTC time; a date and time picker is the obvious next step.

## Rules before models

Heat scoring, shade-type selection and surface classification are explicit rules. In a hackathon, with no labelled heat or land-cover data, rules are testable and explainable, and every threshold can be read in the code. A trained model would need data the team did not have.

## Deterministic simulated density

Without a land-cover source, urban density is derived from the coordinates with a seeded generator, so the same point always returns the same value. It keeps demos repeatable and is documented as simulated everywhere it appears.

## Colour thresholds for site photos

HSV thresholds separate vegetation from grey hard surfaces with OpenCV alone, with no model download and with predictable behaviour. Shadows, water and coloured materials are misread, which is acceptable for a first signal and is listed as a limitation.

## Container aimed at Cloud Run

`python:3.10-slim` plus the two system libraries OpenCV needs, pinned dependencies, and uvicorn on port 8080. Cloud Run was the fastest path from code to a public URL during the event, and a stateless app needs nothing else.

## Publication changes

When preparing the public repository, behaviour was kept and only defects were fixed:

- Image results read `urban_density` and `green_coverage`, the fields the API actually returns.
- The assistant uses the Leaflet map instance and tracks the clicked point; the old code read `window.map`, which resolves to the `<div id="map">` element and threw every 500 ms.
- CORS reads explicit origins from `ALLOWED_ORIGINS` instead of allowing every origin with credentials.
- The report page scrolls instead of clipping long reports, and the upload dropzone has the styles its markup expected.
- `__pycache__` files and an unused 9.8 MB video were removed from the unpublished history before the first push.
