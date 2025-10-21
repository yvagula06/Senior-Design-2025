# Senior-Design-2025

# Nutrition Label API (Backend)
FastAPI + Postgres + pgvector backend for predicting nutrition facts from dish name + target calories.
- `docker-compose up -d --build`
- `docker-compose exec api alembic upgrade head`
- Open http://localhost:8000/health

## Seed + Embed
```
docker-compose exec api python -m scripts.ingest_seed data/seed_dishes.csv
docker-compose exec api python -m scripts.embed_dishes
```

## Example Requests
### Search
```
curl "http://localhost:8000/dishes/search?q=chicken%20tikka%20masala&k=5"
```

### Label
```
curl -X POST http://localhost:8000/label -Headers @{"Content-Type"="application/json"} -Body '{"dish_name":"chicken tikka masala","calories":620}'
```