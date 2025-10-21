.PHONY: up down logs migrate lint fmt
up: ; docker-compose up -d --build
down: ; docker-compose down -v
logs: ; docker-compose logs -f --tail=200
migrate: ; docker-compose exec api alembic upgrade head
lint: ; ruff check .
fmt: ; ruff check . --fix
