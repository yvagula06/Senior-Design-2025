# API Testing Guide

## Running the Backend

### 1. Start PostgreSQL (if not running)
Ensure PostgreSQL with pgvector extension is running and database is seeded.

### 2. Start the FastAPI Server
```bash
cd c:\Users\Yuvar\Desktop\VSProjects\Senior-Design-2025
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Server will be available at: `http://localhost:8000`

---

## Testing Endpoints with curl

### 1. Health Check
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "db_connected": true
}
```

---

### 2. POST /label - Basic Request (dish name only)

```bash
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"chicken tikka masala\"}"
```

**Expected Response:**
```json
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 520.0,
    "protein_g": 35.2,
    "carbs_g": 38.5,
    "fat_g": 25.8,
    "sugar_g": 5.1,
    "fiber_g": 3.2,
    "sodium_mg": 890,
    "potassium_mg": null
  },
  "confidence": 0.87,
  "explanation": "High confidence match based on 5 similar recipes"
}
```

---

### 3. POST /label - With Target Calories

```bash
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"chicken tikka masala\", \"target_calories\": 600}"
```

**Expected Response:**
```json
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 600.0,
    "protein_g": 40.6,
    "carbs_g": 44.4,
    "fat_g": 29.8,
    "sugar_g": 5.9,
    "fiber_g": 3.7,
    "sodium_mg": 1027,
    "potassium_mg": null
  },
  "confidence": 0.81,
  "explanation": "Good match, scaled to target calories"
}
```

---

### 4. POST /label - With Style

```bash
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"burger\", \"style\": \"restaurant\", \"target_calories\": 800}"
```

**Expected Response:**
```json
{
  "matched_dish": "Restaurant-Style Burger",
  "nutrition": {
    "calories": 800.0,
    "protein_g": 45.0,
    "carbs_g": 55.2,
    "fat_g": 38.5,
    "sugar_g": 8.2,
    "fiber_g": 4.1,
    "sodium_mg": 1200,
    "potassium_mg": null
  },
  "confidence": 0.76,
  "explanation": "Moderate confidence with style hint applied"
}
```

---

### 5. POST /label - No Match (404 Error)

```bash
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"xyzabc123notarealdish\"}"
```

**Expected Response (HTTP 404):**
```json
{
  "detail": "No matching dish found"
}
```

---

### 6. POST /label - Invalid Request (400 Error)

```bash
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"\"}"
```

**Expected Response (HTTP 422):**
```json
{
  "detail": [
    {
      "loc": ["body", "dish_name"],
      "msg": "String should have at least 2 characters",
      "type": "string_too_short"
    }
  ]
}
```

---

## Testing from Expo Mobile App

### 1. Ensure Backend is Running
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Update Mobile App Base URL (if needed)
- **Android Emulator:** Uses `http://10.0.2.2:8000` (automatic)
- **iOS Simulator:** Uses `http://localhost:8000` (automatic)
- **Physical Device:** Update IP in [mobile/src/services/labelApi.ts](mobile/src/services/labelApi.ts#L33)

### 3. Run Mobile App
```bash
cd mobile
npm start
```

### 4. Test in App
1. Navigate to Label tab
2. Enter dish name: "Chicken Tikka Masala"
3. Enter target calories: 600
4. Select style: "restaurant"
5. Tap "Generate Label"
6. See nutrition results displayed

---

## API Documentation

Interactive API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Troubleshooting

### "No matching dish found" (404)
- Database may not be seeded
- Dish name too obscure
- Run: `python scripts/ingest_seed.py` to seed database

### "Internal server error" (500)
- Check backend logs for traceback
- Verify PostgreSQL is running
- Check database connection in logs

### CORS Error from Mobile App
- CORS already enabled in `app/main.py`
- Verify backend is accessible from device
- Check firewall settings

### Connection Refused
- Ensure backend running on `0.0.0.0:8000` (not `127.0.0.1:8000`)
- For physical device: verify IP address matches computer's network IP
- Check device and computer on same WiFi network

---

## Quick Validation Script

Save as `test_api.ps1`:

```powershell
Write-Host "Testing Health Endpoint..." -ForegroundColor Cyan
curl http://localhost:8000/health
Write-Host ""

Write-Host "Testing Label Endpoint..." -ForegroundColor Cyan
curl -X POST http://localhost:8000/label `
  -H "Content-Type: application/json" `
  -d '{"dish_name": "chicken tikka masala", "target_calories": 600}'
Write-Host ""

Write-Host "Testing 404 Case..." -ForegroundColor Cyan
curl -X POST http://localhost:8000/label `
  -H "Content-Type: application/json" `
  -d '{"dish_name": "notarealdish123xyz"}'
```

Run: `.\test_api.ps1`
