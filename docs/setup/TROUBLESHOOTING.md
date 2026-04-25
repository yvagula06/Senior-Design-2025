# Troubleshooting Guide

This guide covers common issues encountered during setup and development, along with their solutions.

---

## 🔧 Backend Issues

### ❌ Error: "relation 'dish_variants' does not exist"

**Symptom:**
```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) relation "dish_variants" does not exist
```

**Cause:** Backend code was trying to query a `dish_variants` table that doesn't exist in the database schema.

**Solution:** Already fixed in `app/services/retrieval_service.py`. If you encounter this:
1. Pull the latest code: `git pull origin main`
2. Restart the API: `docker-compose restart api`

---

### ❌ Error: "Input should be a valid number [type=float_type, input_value=None]"

**Symptom:**
```
1 validation error for Nutrients
fiber_g
  Input should be a valid number [type=float_type, input_value=None, input_type=NoneType]
```

**Cause:** Some dishes in the database have `NULL` values for optional nutrition fields (fiber, sugar, etc.), but the API schema required all fields to be numbers.

**Solution:** Already fixed with `COALESCE()` in SQL queries. If you encounter this:
1. Pull latest code: `git pull origin main`
2. Restart API: `docker-compose restart api`

**Manual Fix (if needed):**
```sql
-- Update NULL values to 0 in database
UPDATE nutrients SET fiber_g = 0.0 WHERE fiber_g IS NULL;
UPDATE nutrients SET sugar_g = 0.0 WHERE sugar_g IS NULL;
UPDATE nutrients SET sodium_mg = 0.0 WHERE sodium_mg IS NULL;
```

---

### ❌ Database is Empty After Restart

**Symptom:**
```bash
SELECT COUNT(*) FROM dishes;
# Returns: 0
```

**Cause:** Docker volume not configured for persistence.

**Solution:**
1. Check if volume exists:
   ```bash
   docker volume ls | Select-String "nutrition_db_data"
   ```

2. If volume is missing, it's already configured in `docker-compose.yml`:
   ```yaml
   volumes:
     nutrition_db_data:
   ```

3. Repopulate database:
   ```bash
   docker exec nutrition_api python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv
   ```

4. Verify persistence:
   ```bash
   docker-compose restart db
   docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"
   ```

---

### ❌ Alembic Migration Errors in PowerShell

**Symptom:**
```
ERROR: Exception: UndefinedTable
```

**Cause:** PowerShell treats stderr output as errors.

**Solution:** Already fixed in `setup-backend.ps1`. The script now uses:
```powershell
$ErrorActionPreference = "Continue"
# docker commands
$ErrorActionPreference = "Stop"
```

---

### ❌ Backend Won't Start - Port Already in Use

**Symptom:**
```
Error starting userland proxy: listen tcp 0.0.0.0:8000: bind: address already in use
```

**Solution:**
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 instead
```

---

### ❌ Containers Keep Restarting

**Symptom:**
```bash
docker ps
# Shows containers with "Restarting" status
```

**Solution:**
```bash
# Check logs for errors
docker logs nutrition_api
docker logs nutrition_db

# Common fixes:
# 1. Database not ready
docker-compose down
docker-compose up -d db
sleep 10
docker-compose up -d api

# 2. Database credentials wrong
# Check docker-compose.yml for matching credentials
```

---

## 📱 Mobile App Issues

### ❌ Vision API Timeout (10 seconds exceeded)

**Symptom:**
```
ERROR: Vision processing timed out after 10000ms
```

**Cause:** Vision API takes longer than 10 seconds to load models and process images.

**Solution:** Already fixed in `mobile/src/services/visionApi.ts`:
```typescript
// Increased timeout to 60 seconds
timeout: 60000
```

If you still see timeouts:
1. Pull latest code: `git pull origin main`
2. Reinstall mobile dependencies:
   ```bash
   cd mobile
   rm -rf node_modules
   npm install
   ```
3. Restart Metro bundler: `npm start`

---

### ❌ "Network Error" or "Unable to connect"

**Symptom:**
```
ERROR: Network request failed
ERROR: Server error. Please try again later.
```

**Troubleshooting Checklist:**

1. **Check backend is running:**
   ```bash
   docker ps
   # Both nutrition_db and nutrition_api should be "Up"
   ```

2. **Verify IP address in mobile app:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```
   Update `mobile/src/services/api.ts` line 11 with your IP.

3. **Test backend from computer:**
   ```powershell
   Invoke-RestMethod http://localhost:8000/health
   ```

4. **Test backend from your network:**
   ```bash
   curl http://YOUR_IP:8000/health
   ```

5. **Check firewall settings:**
   - Windows: Allow incoming connections on port 8000
   - Mac: System Preferences → Security & Privacy → Firewall → Firewall Options → Allow port 8000

6. **Verify same WiFi network:**
   ```bash
   # Computer
   ipconfig
   # Should show same network (e.g., 192.168.1.x)
   
   # Phone
   # Settings → WiFi → Check network name matches
   ```

---

### ❌ Label Generation Returns Empty Results

**Symptom:**
- Label tab shows no results
- API returns 200 but empty data

**Solution:**
```bash
# Check database has dishes
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"

# Should return > 50000

# If database is empty, import data:
docker exec nutrition_api python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv
```

---

### ❌ "Expo Go" Not Connecting to Metro Bundler

**Symptom:**
- QR code scanned but app won't load
- "Unable to connect to Metro" error

**Solution:**
```bash
# 1. Clear Metro cache
cd mobile
npx expo start --clear

# 2. Try tunnel mode (slower but more reliable)
npx expo start --tunnel

# 3. Check firewall allows Metro bundler (port 8081)
# Windows: Allow incoming on port 8081

# 4. Restart Metro
# Press Ctrl+C, then npm start again
```

---

## 🗄️ Database Issues

### ❌ pgvector Extension Not Loaded

**Symptom:**
```
ERROR: type "vector" does not exist
```

**Solution:**
```bash
# Connect to database
docker exec -it nutrition_db psql -U postgres -d nutrition

# Create extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
# Should show "vector" in list

# Exit
\q
```

---

### ❌ Embeddings Table Missing or Empty

**Symptom:**
```
ERROR: relation "embeddings" does not exist
```

**Solution:**
```bash
# Check if tables exist
docker exec nutrition_db psql -U postgres -d nutrition -c "\dt"

# Should show: dishes, nutrients, embeddings

# If missing, schema needs to be created
docker-compose exec api alembic upgrade head

# Repopulate data
docker exec nutrition_api python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv
```

---

### ❌ Slow Query Performance

**Symptom:**
- Label generation takes > 5 seconds
- API logs show slow database queries

**Solution:**
```bash
# Check if indexes exist
docker exec nutrition_db psql -U postgres -d nutrition -c "\d embeddings"

# Should show: ix_embeddings_vector (ivfflat index)

# Rebuild index if needed
docker exec -it nutrition_db psql -U postgres -d nutrition

# Drop and recreate index
DROP INDEX IF EXISTS ix_embeddings_vector;
CREATE INDEX ix_embeddings_vector ON embeddings USING ivfflat (vector) WITH (lists = 100);

\q
```

---

## 🐳 Docker Issues

### ❌ Docker Desktop Not Running

**Symptom:**
```
error during connect: This error may indicate that the docker daemon is not running
```

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (green indicator)
3. Try again: `docker ps`

---

### ❌ Out of Disk Space

**Symptom:**
```
ERROR: no space left on device
```

**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Check space
docker system df
```

---

### ❌ Volume Mount Issues (Windows)

**Symptom:**
```
ERROR: Mount denied
```

**Solution:**
1. Open Docker Desktop
2. Settings → Resources → File Sharing
3. Add your project directory
4. Apply & Restart

---

## 🔍 Debugging Tips

### Check API Logs
```bash
# View last 50 lines
docker logs nutrition_api --tail 50

# Follow logs in real-time
docker logs -f nutrition_api

# View with timestamps
docker logs -t nutrition_api
```

### Check Database Connection
```bash
# Test connection
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT version();"

# Check table sizes
docker exec nutrition_db psql -U postgres -d nutrition -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Test API Endpoints Manually
```powershell
# Health check
Invoke-RestMethod http://localhost:8000/health

# Label generation
Invoke-RestMethod -Uri "http://localhost:8000/label" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"dish_name": "pizza"}' | ConvertTo-Json

# Check OpenAPI docs
Start-Process "http://localhost:8000/docs"
```

### Mobile App Debug Mode
```bash
# Enable debug mode
cd mobile
npx expo start --dev-client

# View React Native debugger
# Press 'j' in terminal to open Chrome DevTools

# View element inspector
# Press 'i' in terminal or shake phone
```

---

## 🆘 Getting More Help

If you encounter an issue not covered here:

1. **Check logs:**
   ```bash
   docker logs nutrition_api --tail 100
   docker logs nutrition_db --tail 100
   ```

2. **Check GitHub Issues:**
   Search for similar problems in the repository

3. **Create detailed bug report including:**
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment (OS, Docker version, Node version)
   - Relevant logs
   - What you've tried

4. **Check configuration files:**
   - `docker-compose.yml`
   - `mobile/src/services/api.ts`
   - `.env` files (if any)

---

## ✅ Verification Checklist

After fixing issues, verify everything works:

- [ ] Backend containers running: `docker ps`
- [ ] Database has data: `docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"`
- [ ] API responds: `curl http://localhost:8000/health`
- [ ] Label generation works: `curl -X POST http://localhost:8000/label -H "Content-Type: application/json" -d '{"dish_name": "pizza"}'`
- [ ] Mobile app connects: Check logs for "200 OK" responses
- [ ] Vision API working: Test camera tab in mobile app

---

**Last Updated:** February 9, 2026
