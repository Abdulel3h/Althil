# Case Study: Althil

## Context

Althil was built by a team at the KFUPM × Google Cloud Intelligent Planet Hackathon, a cloud and AI event on environmental and urban challenges. The question it takes on: where should a city in a hot climate add shade so that thermal comfort improves the most?

## Problem

Shade structures and street trees are long-lived investments, and the right answer depends on the site. A high midday sun calls for horizontal cover; a low sun calls for vertical screening. An open asphalt plaza needs intervention far more than a street that is already green. Planners rarely have those signals side by side for a specific point.

## Approach

- Keep the interaction to one click on a map.
- Compute the one input that can be computed exactly — the sun's position — and be explicit about everything that is estimated.
- Turn the sun angle into a shade *type*, not just a score.
- Let a site photo add evidence about the ground surface.
- Give the planner something to take away: a report and a PDF.
- Package the whole thing as one container so it can be deployed during the event.

## My role

Backend development, cloud architecture, and the integration of the analysis services into one deployable application. Althil was a team project; this is my part of it, not the whole.

## What was built

- FastAPI backend with endpoints for analysis, image upload, PDF reports and a scripted assistant
- Sun position with `pysolar`, a rule-based heat score and sun-angle-driven shade recommendations
- OpenCV surface-coverage analysis for site photos
- Leaflet map interface, report page and PDF export
- Cloud Run-ready `Dockerfile`

## Outcome

A working hackathon prototype that runs locally and as a container. It was not adopted by any municipality, and no cooling effect was measured. The publication pass afterwards added tests, fixed interface bugs and documented every simulated input.

## What I would do next

- Replace simulated urban density with land-cover data
- Let planners pick a date and time and compare sun paths across the year
- Rank candidate sites across a district instead of offsetting around one point
- Wire in the designed BigQuery, Cloud Storage and Vertex AI components
- Validate the heat score against street-level temperature readings
