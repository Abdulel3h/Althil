# Reviewer Guide

Use this guide if you are evaluating Althil for backend, cloud or applied-AI roles.

## 30-second review

- Start with `README.md`, especially *Trust and honesty about the numbers*.
- Open `app/main.py` for the endpoints and request models.
- Read `app/services/analysis_service.py` for the sun position, heat score and recommendation rules.
- Check `Dockerfile` for the Cloud Run packaging.
- Run `python -m pytest` to see the service and API tests pass.

## What this project demonstrates

- A FastAPI backend that integrates several analysis services behind one API
- Solar geometry applied to an urban planning decision
- OpenCV image analysis feeding the same decision
- A single stateless container aimed at Cloud Run
- Clear separation between computed, simulated and designed-only parts

## Quick technical path

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements-dev.txt
python -m pytest
uvicorn app.main:app --reload
```

## Prototype boundaries

- Urban density, placements, cooling figures and the heat overlay are simulated or estimated.
- The assistant panel is scripted; no language model is connected.
- BigQuery, Cloud Storage and Vertex AI are part of the design only.
- It is a team hackathon project; the README states which part is mine.

## Related repositories

- [Abdulelah AI Portfolio](https://github.com/Abdulel3h/Abdulelah)
- [absher-insight](https://github.com/Abdulel3h/absher-insight)
- [Stadium](https://github.com/Abdulel3h/Stadium)
