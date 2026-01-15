# Quick Test Guide

## Prerequisites

```bash
# Install test dependencies
pip install pytest pytest-cov fastapi

# Ensure database is seeded (for end-to-end tests)
python scripts/ingest_seed.py
python scripts/embed_dishes.py
```

## Run Tests

### All Tests
```bash
pytest app/tests/ -v
```

### Individual Test Files

**End-to-End Tests** (requires database):
```bash
pytest app/tests/test_end_to_end.py -v
```

**Scaling Edge Cases** (no database required):
```bash
pytest app/tests/test_scaling_edge_cases.py -v
```

**Confidence Bounds** (no database required):
```bash
pytest app/tests/test_confidence_bounds.py -v
```

### Run Specific Test
```bash
pytest app/tests/test_scaling_edge_cases.py::TestScalingEdgeCases::test_extreme_downscaling_clamped -v
```

### Run with Coverage
```bash
pytest app/tests/ --cov=app --cov-report=html
open htmlcov/index.html  # View coverage report
```

### Run as Python Script (Alternative)

Each test file can run standalone:

```bash
# End-to-end
python app/tests/test_end_to_end.py

# Scaling
python app/tests/test_scaling_edge_cases.py

# Confidence
python app/tests/test_confidence_bounds.py
```

## Expected Results

### All Passing
```
===== 31 passed in 2.45s =====
```

### Test Breakdown
- **test_end_to_end.py**: 4 tests
- **test_scaling_edge_cases.py**: 11 tests  
- **test_confidence_bounds.py**: 16 tests

## Troubleshooting

### Import Errors
```bash
# Install missing packages
pip install fastapi pytest sqlalchemy pydantic numpy
```

### Database Connection Errors
```bash
# Check database is running
docker-compose up -d postgres

# Seed database
python scripts/ingest_seed.py
```

### Embedding Model Errors
```bash
# Download sentence-transformers model
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

## Test Summary

| File | Tests | Purpose | Database Required |
|------|-------|---------|-------------------|
| test_end_to_end.py | 4 | Full pipeline validation | ✅ Yes |
| test_scaling_edge_cases.py | 11 | Boundary conditions | ❌ No |
| test_confidence_bounds.py | 16 | Score validation | ❌ No |

**Total**: 31 tests covering all critical paths.
