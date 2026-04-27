# 🔍 Troubleshooting Checklist

Quick diagnostic checklist for common NutriLabelAI issues.

---

## 📱 Mobile App Not Loading

- [ ] Is Metro bundler running? (`npx expo start`)
- [ ] Try clearing cache: `npx expo start --clear`
- [ ] Check if port 8081/8082 is available
- [ ] Verify device is on same WiFi as computer
- [ ] Try restarting Metro: Kill terminal and restart

**If still failing:**
- [ ] Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- [ ] Clear Expo cache: `rm -rf .expo`
- [ ] Restart computer and try again

---

## 🚨 "Dish not found" (404 Error)

- [ ] **Use in-app clear button (FASTEST):**
  - Open app → **Profile** tab → Scroll to **"Testing"** → **"Clear All Local Data"**
  - Confirm alert → Reload app (`r` in terminal or shake device)
- [ ] Clear Metro cache: `npx expo start --clear`
- [ ] Clear app storage manually:
  ```typescript
  import AsyncStorage from '@react-native-async-storage/async-storage';
  await AsyncStorage.clear();
  ```
- [ ] Delete app from device and reinstall
- [ ] Check if backend database has dishes: `python scripts/check_dishes.py`
- [ ] Re-seed database if empty: `python scripts/seed_db.py`
- [ ] Verify `fetchFeaturedDishes` function exists in `mobile/src/services/api.ts`

---

## 🌐 "Unable to connect to server"

- [ ] Is backend running? Check: `curl http://localhost:8000/health`
- [ ] Start backend if not running:
  ```powershell
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- [ ] Verify correct API URL in `mobile/src/services/api.ts`:
  - iOS Simulator: `http://localhost:8000`
  - Android Emulator: `http://10.0.2.2:8000`
  - Physical Device: `https://<ngrok-url>` or `http://<your-ip>:8000`

**For physical devices:**
- [ ] Is ngrok running? Start with: `ngrok http 8000`
- [ ] Update `NGROK_URL` in `mobile/src/services/api.ts` with new URL
- [ ] Backend using `0.0.0.0` (not `127.0.0.1`)? Check uvicorn command
- [ ] Device and computer on same WiFi network?
- [ ] Firewall allowing port 8000?

---

## ⏱️ "Request timed out"

- [ ] Increase timeout in `mobile/src/services/api.ts`:
  ```typescript
  timeout: 60000  // 60 seconds instead of 30
  ```
- [ ] Check backend logs for slow queries or errors
- [ ] Verify OpenAI API key is set (if using vision features)
- [ ] Check database connection and query performance

---

## 🧹 Stale Data / Old Code Showing

- [ ] Clear Metro bundler cache: `npx expo start --clear`
- [ ] Clear watchman: `watchman watch-del-all`
- [ ] Restart VS Code TypeScript server: Cmd/Ctrl+Shift+P → "Restart TS Server"
- [ ] Hard refresh in browser (if using web): Ctrl+Shift+R / Cmd+Shift+R
- [ ] Delete and reinstall app on device

**Nuclear option:**
- [ ] `rm -rf node_modules package-lock.json .expo`
- [ ] `npm install`
- [ ] `npx expo start --clear`

---

## 🏗️ Build Failures

- [ ] Clear all caches and rebuild:
  ```powershell
  cd mobile
  rm -rf node_modules package-lock.json
  npm install
  npx expo start --clear
  ```
- [ ] If using native modules: `npx expo prebuild --clean`
- [ ] Check for dependency conflicts: `npm list --depth=0`
- [ ] Run Expo diagnostics: `npx expo-doctor`
- [ ] Check Node.js version: `node --version` (should be 18+)

---

## 🔌 Connection on Physical Device Failing

**iOS Device:**
- [ ] Computer and iPhone on same WiFi?
- [ ] Using ngrok? Update URL in API config
- [ ] Expo Go app updated to latest version?
- [ ] Try tunnel mode: `npx expo start --tunnel`

**Android Device:**
- [ ] Computer and Android on same WiFi?
- [ ] Using ngrok? Update URL in API config
- [ ] Expo Go app updated to latest version?
- [ ] Try tunnel mode: `npx expo start --tunnel`

**Both platforms:**
- [ ] Test backend accessibility: Open `http://<your-ip>:8000/health` in device browser
- [ ] Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac)
- [ ] Disable VPN or proxy temporarily
- [ ] Check if corporate/school WiFi blocks device-to-device communication

---

## 📦 Module Not Found Errors

- [ ] Install missing module: `npm install <module-name>`
- [ ] Clear cache: `npx expo start --clear`
- [ ] Reinstall all dependencies:
  ```powershell
  rm -rf node_modules package-lock.json
  npm install
  ```
- [ ] Check for typos in import paths
- [ ] Verify module is in `package.json` dependencies

---

## 🍎 iOS Simulator Issues

- [ ] Simulator app is open?
- [ ] Try different simulator: Xcode → Window → Devices and Simulators
- [ ] Reset simulator: `xcrun simctl erase all`
- [ ] Restart simulator: `killall Simulator`
- [ ] Reinstall Expo Go in simulator
- [ ] Check Xcode is installed and up to date

**Pod install failures:**
- [ ] `cd mobile/ios && pod deintegrate && pod install`
- [ ] Clear pod cache: `pod cache clean --all`

---

## 🤖 Android Emulator Issues

- [ ] Emulator is running? Check Android Studio AVD Manager
- [ ] Start emulator before running app
- [ ] Clear app data: `adb shell pm clear com.seniordesign.nutritionestimator`
- [ ] Restart emulator
- [ ] Check BIOS virtualization is enabled (Intel VT-x or AMD-V)

**Rebuild app:**
- [ ] `cd mobile && npx expo prebuild --clean`
- [ ] `npx expo run:android`

---

## 🔍 Backend Issues

**Database connection errors:**
- [ ] PostgreSQL running? `docker ps` or check pgAdmin
- [ ] Run migrations: `alembic upgrade head`
- [ ] Check connection string in `.env` file
- [ ] Restart database: `docker-compose restart postgres`

**No dishes in database:**
- [ ] Seed database: `python scripts/seed_db.py`
- [ ] Check dish count: `python scripts/check_dishes.py`
- [ ] Generate embeddings: `python scripts/embed_dishes.py`

**OpenAI API errors:**
- [ ] API key set in `.env`? Check `OPENAI_API_KEY`
- [ ] API key valid? Test on OpenAI platform
- [ ] Rate limit reached? Check OpenAI dashboard
- [ ] Billing account active?

---

## 🧪 Environment Variables Not Loading

- [ ] `.env` file exists in correct location?
- [ ] Restart Expo after changing `.env`: `npx expo start --clear`
- [ ] Variables prefixed with `EXPO_PUBLIC_` for mobile app?
- [ ] Access with `process.env.EXPO_PUBLIC_*`
- [ ] Check `.env.example` for required variables

---

## 📊 Data Validation Checklist

Before reporting a bug, verify:
- [ ] Backend health endpoint responds: `curl http://localhost:8000/health`
- [ ] Database has dishes: `python scripts/check_dishes.py`
- [ ] API endpoints accessible: Test in Swagger UI at http://localhost:8000/docs
- [ ] App can reach backend: Check console logs for API base URL
- [ ] Error messages are meaningful (not generic network errors)

---

## 🆘 Still Stuck?

If all else fails, try these in order:

1. **Complete system restart:**
   - [ ] Close all terminals, VS Code, Android Studio, Xcode
   - [ ] Stop all Docker containers: `docker-compose down`
   - [ ] Restart computer
   - [ ] Start fresh: `docker-compose up -d && cd mobile && npx expo start --clear`

2. **Full reinstall:**
   - [ ] Backend: `rm -rf node_modules && npm install`
   - [ ] Mobile: `cd mobile && rm -rf node_modules .expo && npm install`
   - [ ] Database: `docker-compose down -v && docker-compose up -d`

3. **Check documentation:**
   - [ ] [Mobile Troubleshooting Guide](../mobile/TROUBLESHOOTING.md)
   - [ ] [Quick Reference](QUICK_TROUBLESHOOTING.md)
   - [ ] [Setup Guide](../mobile/SETUP.md)
   - [ ] [Backend Integration Guide](../mobile/BACKEND_INTEGRATION_GUIDE.md)

4. **Enable debug logging:**
   - [ ] Add console.logs in API calls
   - [ ] Check Metro bundler output
   - [ ] Review backend logs: `docker-compose logs -f api`
   - [ ] Check browser console (if using web)

---

## ✅ Success Indicators

Your setup is working correctly when:
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] Backend shows "Application startup complete" in logs
- [ ] Mobile app shows "Base URL:" log with correct URL
- [ ] Mobile app loads without errors
- [ ] Can create nutrition labels successfully
- [ ] Camera integration works
- [ ] Daily totals display correctly

---

**Last Updated:** April 26, 2026

**Quick Links:**
- 📚 [Full Troubleshooting Guide](../mobile/TROUBLESHOOTING.md)
- 📋 [Quick Reference](QUICK_TROUBLESHOOTING.md)  
- 📖 [Mobile Setup](../mobile/SETUP.md)
- 🏠 [Main README](../README.md)
