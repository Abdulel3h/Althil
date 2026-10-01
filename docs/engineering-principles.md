# Engineering Principles

This repository follows the public portfolio standard used across Abdulelah Alkhathami's AI projects.

## Principles

- Compute what can be computed exactly; label everything that is estimated or simulated.
- Recommend an action, and keep the reasoning that produced it visible.
- Keep analysis services separate from the web layer so each can be tested on its own.
- Ship one deployable unit before adding more cloud services.
- State what is designed but not built, rather than letting a design read as a feature.

## Applied here

- `pysolar` computes the sun position; density, placements and cooling figures are labelled as simulated or estimated.
- Shade type follows the sun altitude, and the PDF repeats the "estimated values" disclaimer.
- `analysis_service`, `image_service` and `report_service` are plain functions with their own tests; `main.py` only routes.
- The app runs as a single stateless container aimed at Cloud Run.
- BigQuery, Cloud Storage and Vertex AI appear only as design and next steps.
