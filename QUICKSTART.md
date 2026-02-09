# NutriLabelAI - Complete Setup Walkthrough

**Complete guide to get the entire app working from scratch**

---

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ **Docker Desktop** installed and running ([download](https://www.docker.com/products/docker-desktop))
- ✅ **Node.js** (v18 or higher) ([download](https://nodejs.org/))
- ✅ **Git** for cloning the repository
- ✅ **Expo Go** app on your phone:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 🚀 Complete Setup (First Time)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yvagula06/Senior-Design-2025.git
cd Senior-Design-2025
```

### Step 2: Start the Backend

```bash
# Start Docker containers (PostgreSQL + FastAPI)
docker-compose up -d --build
```

Wait for containers to be healthy (about 30 seconds). Check status:
```bash
docker ps
```

You should see both `nutrition_db` and `nutrition_api` running.

### Step 3: Set Up the Database

The database is already populated with **50,000+ dishes** and persists across restarts via Docker volume.

**Check database status:**
```bash
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"
```

**Note:** Database automatically persists - you only need to populate once during initial setup!

### Step 4: Configure Mobile App API

**Find your computer's IP address:**
- **Windows:** Open PowerShell and run `ipconfig` (look for IPv4 Address like `192.168.1.x`)
- **Mac/Linux:** Run `ifconfig` or `ip addr` (look for your local network IP)

**Update the mobile app configuration:**

Open `mobile/src/services/api.ts` and update line 11 with your IP:
```typescript
if (Platform.OS === 'ios' && isDevice) {
  return 'http://YOUR_IP_ADDRESS:8000';  // ← Change this to your IP
}
```

Example: `return 'http://192.168.1.191:8000';`

**Important:** Your phone and computer must be on the same WiFi network!

### Step 5: Install Mobile Dependencies

```bash
cd mobile
npm install
```

### Step 6: Start the Mobile App

```bash
npm start
```

Wait for the QR code to appear in your terminal.

### Step 7: Open on Your Phone

1. Open **Expo Go** app on your phone
2. **iOS:** Use Camera app to scan the QR code
3. **Android:** Use Expo Go's built-in scanner to scan the QR code
4. Wait for the app to load (first time takes ~30 seconds)

---

## ✅ Verify Everything Works

### Test Backend (from your computer)

```bash
# Health check
curl http://localhost:8000/health

# Test label generation
curl -X POST http://localhost:8000/label ^
  -H "Content-Type: application/json" ^
  -d "{\"dish_name\": \"pizza\"}"
```

### Test Mobile App

1. Open the app on your phone
2. Go to the **Label** tab
3. Type "pizza" in the search box
4. Tap **Generate Label**
5. You should see nutrition information appear within 2-3 seconds

If it works, you're all set! 🎉

---

## 🔄 Daily Development Workflow

Once everything is set up, you only need:

### Start Backend
```bash
cd Senior-Design-2025
docker-compose up -d
```

### Start Mobile App
```bash
cd mobile
npm start
```

**Note:** Database persists between restarts, so you don't need to repopulate it!

---

## 🛑 Stopping the App

### Stop Mobile App
Press `Ctrl+C` in the terminal running `npm start`

### Stop Backend
```bash
docker-compose down
```

To remove database data (start fresh):
```bash
docker-compose down -v
```

## 📱 Using the App

### Label Tab - Generate Nutrition Labels
1. Tap the **Label** tab at the bottom
2. Type a dish name (e.g., "chicken tikka masala", "Big Mac", "fettuccine alfredo")
3. Optionally enter target calories
4. Tap **Generate Label**
5. View complete nutrition breakdown with confidence score

The app searches through 50,000+ dishes to find the best match!

### History Tab - Track Your Meals
- View previously generated labels
- Access your meal history
- Track nutrition over time

### Explore Tab - Browse Dishes
- Discover available dishes
- Search the database
- Find nutrition info quickly

### Profile Tab - Your Settings
- Manage your preferences
- View app information
- Customize your experience

---

## 🛠️ Development & Customization

### Running on Emulator/Simulator

**Android Emulator:**
```bash
cd mobile
npm run android
```

**iOS Simulator (macOS only):**
```bash
cd mobile
npm run ios
```

**Web Browser:**
```bash
cd mobile
npm run web
```

### API Endpoint Configuration

The app automatically detects your device type and uses the correct API URL:
- **iOS Physical Device:** Uses IP address in `api.ts`
- **Android Emulator:** Uses `10.0.2.2:8000` (auto-mapped to localhost)
- **iOS Simulator:** Uses `localhost:8000`

To change the IP for physical devices, edit `mobile/src/services/api.ts`:
```typescript
if (Platform.OS === 'ios' && isDevice) {
  return 'http://YOUR_IP_ADDRESS:8000';
}
```

### Hot Reload & Developer Tools

- **Hot Reload:** Save any file to see changes instantly
- **Reload App:** Shake your phone or press `r` in terminal
- **Developer Menu:** Shake your phone to open
- **Chrome DevTools:** Press `j` in terminal
- **Element Inspector:** Press `i` in terminal

---

## ❓ Troubleshooting

### Backend Issues

**Containers won't start:**
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs

# Restart containers
docker-compose down
docker-compose up -d --build
```

**Database is empty:**
```bash
# Check database status first
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"

# Database persists automatically - no need to repopulate unless volume was deleted
```

**Backend not responding:**
```bash
# Check health endpoint
curl http://localhost:8000/health

# View API logs
docker logs nutrition_api

# Restart API container
docker restart nutrition_api
```

### Mobile App Issues

**"Network Error" or "Unable to connect":**
- ✅ Check backend is running: `docker ps`
- ✅ Verify your IP address is correct in `api.ts`
- ✅ Ensure phone and computer are on same WiFi
- ✅ Test backend manually: `curl http://YOUR_IP:8000/health`
- ✅ Disable VPN or firewall temporarily

**App won't load on phone:**
- ✅ Make sure Expo Go is installed and up to date
- ✅ Check that `npm start` is running
- ✅ Try pressing `r` in terminal to reload
- ✅ Close and reopen Expo Go app

**Module not found errors:**
```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
```

**Metro bundler issues:**
```bash
cd mobile
npx expo start --clear
```

### Connection Testing

**Test backend from your computer:**
```bash
# Windows PowerShell
Invoke-WebRequest http://localhost:8000/health

# Windows CMD or Mac/Linux
curl http://localhost:8000/health
```

**Test backend from your phone's network:**
```bash
curl http://YOUR_IP_ADDRESS:8000/health
```

If this fails, check your firewall settings.

**For more detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

## 🗄️ Database Information

**Database Details:**
- **Location:** Docker container `nutrition_db`
- **Type:** PostgreSQL 16 with pgvector extension
- **Contents:** 50,000+ dishes from USDA database with embeddings
- **Persistence:** Data persists between container restarts

**View database contents:**
```bash
# Connect to database
docker exec -it nutrition_db psql -U postgres -d nutrition

# Query dishes
SELECT COUNT(*) FROM dishes;
SELECT name, calories FROM dishes LIMIT 10;

# Exit
\q
```

**Reset database (start fresh):**
```bash
# Warning: This deletes all data!
docker-compose down -v
docker-compose up -d

# Database schema is auto-created on startup
# To repopulate with USDA data, see scripts/import_usda_fixed.py
```

---

## � Advanced Features

### Database Management

**Current Database:**
- **50,973 dishes** from USDA branded foods dataset
- **Semantic search** powered by pgvector and sentence-transformers
- **Automatic persistence** via Docker named volumes

**Monitoring Database:**
```bash
# Check current dish count
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"

# View recent dishes
docker exec nutrition_db psql -U postgres -d nutrition -c "SELECT name FROM dishes LIMIT 10;"

# Check database size
docker exec nutrition_db psql -U postgres -d nutrition -c "
  SELECT pg_size_pretty(pg_database_size('nutrition')) as db_size;
"
```

**Adding More Dishes:**
The import script can be run anytime to add more dishes:
```bash
# Import from CSV file
docker exec nutrition_api python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv

# The script automatically:
# - Skips existing dishes
# - Generates embeddings for new dishes
# - Handles missing nutrition data
```

### Vision API Configuration

The vision API timeout has been increased to 60 seconds to handle model loading:
- **Location:** `mobile/src/services/visionApi.ts`
- **Default timeout:** 60000ms (60 seconds)
- **Why:** Model initialization takes 30-40 seconds on first load

### Database Persistence

Data persists across restarts thanks to Docker volumes:
- **Volume name:** `nutrition_db_data`
- **Location:** Defined in `docker-compose.yml`
- **Size:** Scales with number of dishes (~2-3 GB for 50K dishes)

**To completely reset:**
```bash
docker-compose down -v  # Warning: Deletes all data!
docker-compose up -d
# Database will be empty, run import script to repopulate
```

---

## �📚 Additional Resources

- **Backend API Documentation:** Visit `http://localhost:8000/docs` while backend is running
- **Troubleshooting Guide:** See `TROUBLESHOOTING.md` for common issues and solutions
- **Mobile App Architecture:** See `mobile/README.md`
- **Repository Overview:** See main `README.md`
- **Data Sources:** See `DATASET_PLAN.md`
- **API Integration:** See `MOBILE_INTEGRATION.md`

---

## 💡 Pro Tips

1. **Backend First:** Always start the backend before testing label generation
2. **IP Address Changes:** If your IP changes (different WiFi), update `api.ts`
3. **Database Persistence:** Database survives restarts, no need to repopulate
4. **Fast Reload:** Use `r` in terminal instead of restarting app
5. **Live Logs:** Watch backend logs: `docker logs -f nutrition_api`
6. **API Testing:** Use FastAPI docs at `http://localhost:8000/docs` for testing

---

## 🎯 Next Steps

After setup:
- ✅ Try generating labels for different dishes
- ✅ Explore the 50,000+ dishes in the database
- ✅ Test with various calorie targets
- ✅ Check confidence scores for different queries
- ✅ Browse the API documentation

**Need help?** Check the troubleshooting section above or view backend logs:
```bash
docker logs nutrition_api
```

Happy tracking! 🎉
