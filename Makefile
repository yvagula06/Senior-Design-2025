.PHONY: setup up down logs migrate seed verify lint fmt help
help:
	@echo "NutriLabelAI - Available Commands"
	@echo "=================================="
	@echo "make setup    - Complete backend setup (build, migrate, seed)"
	@echo "make up       - Start containers"
	@echo "make down     - Stop and remove containers"
	@echo "make logs     - View container logs"
	@echo "make migrate  - Run database migrations"
	@echo "make seed     - Load dish data"
	@echo "make verify   - Check system status"
	@echo "make lint     - Run linter"
	@echo "make fmt      - Format code"

setup: up migrate seed verify

up: ; docker-compose up -d --build

down: ; docker-compose down -v

logs: ; docker-compose logs -f --tail=200

migrate: ; docker-compose exec api alembic upgrade head

seed:
	@echo "📊 Loading dish data..."
	@docker-compose exec api python /app/scripts/ingest_seed.py || \
	 docker-compose exec api python /app/scripts/embed_dishes.py || \
	 echo "⚠️  No ingestion script found"

verify:
	@echo "🔍 Verifying setup..."
	@echo "API Health:"
	@curl -s http://localhost:8000/health || echo "❌ API not responding"
	@echo "\nDish Count:"
	@docker-compose exec -T api python -c "from app.db.session import get_db; from app.db.models import Dish; db = next(get_db()); print(f'✅ {db.query(Dish).count()} dishes loaded')"

lint: ; ruff check .

fmt: ; ruff check . --fix
