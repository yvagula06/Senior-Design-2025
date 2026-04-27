# Troubleshooting Guide

Common issues and solutions for the NutriLabelAI mobile app.

---

## Table of Contents

- [API & Backend Issues](#api--backend-issues)
- [Cache & Data Issues](#cache--data-issues)
- [Build & Development Issues](#build--development-issues)
- [Network & Connection Issues](#network--connection-issues)
  - [ngrok tunnel expired](#ngrok-tunnel-expired--physical-device-only)
- [Platform-Specific Issues](#platform-specific-issues)

---

## API & Backend Issues

### ERROR: "Dish not found" (404)

**Symptoms:**
```
ERROR  [Label] Failed to generate label: Dish not found
```

**Causes:**
- **Expired ngrok tunnel** (most common on physical devices — ngrok URL goes dead when you close the tunnel)
- Stale cached data referencing dishes that don't exist in the database
- Missing dishes in the backend database
- Old food entries trying to validate against current database
- Navigation state with prefilled parameters from deleted dishes

**Solutions:**

1. **Check if ngrok is running (physical devices ONLY):**
   - If testing on a real phone, the app routes through `NGROK_URL` in `mobile/src/services/api.ts`
   - If ngrok isn't running or the URL has expired, every API call returns a 404 — which shows up as "Dish not found"
   - Check: open the ngrok URL in a browser; if it shows an error page, the tunnel is dead
   - Fix: restart ngrok and update the URL (see [ngrok tunnel expired](#ngrok-tunnel-expired--physical-device-only) below)

2. **Clear app data using built-in Profile button (FASTEST):**
   - Open app → **Profile** tab → Scroll to **"Testing"** → **"Clear All Local Data"**
   - Confirm the deletion
   - Reload app (shake device → Reload, or press `r` in terminal)

3. **Clear Metro cache and restart:**
   ```powershell
   cd mobile
   npx expo start --clear
   ```

4. **Clear app's AsyncStorage data:**
   - Add to FoodContext or run once in the app:
   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```
   - Or shake device → "Clear AsyncStorage" (if dev menu option available)

5. **Verify the local backend is actually receiving requests:**
   ```powershell
   # Check Docker API logs — if no POST /label lines appear when you submit a dish,
   # the phone is NOT reaching your backend (ngrok issue)
   docker compose logs api --tail=50
   ```

6. **Test the local backend directly to rule it out:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8000/label" -Method POST -ContentType "application/json" -Body '{"dish_name":"chicken"}'
   # Should return a nutrition label, not an error
   ```

7. **Verify backend database has dishes:**
   ```powershell
   python scripts/check_dishes.py
   ```

8. **Re-seed the database if empty:**
   ```powershell
   python scripts/seed_db.py
   ```

9. **Check for missing imports in services:**
   - Verify `fetchFeaturedDishes` exists in `mobile/src/services/api.ts`
   - Ensure all exported functions are implemented

---

### ERROR: Network error / Unable to connect to server

**Symptoms:**
```
Unable to connect to server. Please check your internet connection.
```

**Causes:**
- Backend server not running
- Incorrect API base URL
- Firewall blocking connection
- ngrok tunnel expired (for physical devices)

**Solutions:**

1. **Verify backend is running:**
   ```powershell
   cd app
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Check API base URL configuration:**
   - File: `mobile/src/services/api.ts`
   - For **iOS Simulator**: Should use `http://localhost:8000`
   - For **Android Emulator**: Should use `http://10.0.2.2:8000`
   - For **Physical Device**: Update `NGROK_URL` or use your machine's local IP

3. **Update ngrok tunnel (physical devices) — see [ngrok tunnel expired](#ngrok-tunnel-expired--physical-device-only) below**

4. **Test backend health:**
   ```powershell
   curl http://localhost:8000/health
   ```

5. **Check firewall settings:**
   - Ensure port 8000 is not blocked
   - Allow Python/uvicorn through Windows Firewall

---

### ERROR: Request timed out

**Symptoms:**
```
Request timed out. Please check your connection and try again.
```

**Causes:**
- Backend processing taking too long
- Vision API (OpenAI) timeout
- Database query timeout

**Solutions:**

1. **Increase timeout in API client:**
   ```typescript
   // mobile/src/services/api.ts
   export const apiClient = axios.create({
     baseURL: API_BASE_URL,
     timeout: 60000, // Increase from 30000 to 60000 (60 seconds)
   });
   ```

2. **Check backend logs for slow queries:**
   - Look for database performance issues
   - Check OpenAI API response times

3. **Optimize database queries:**
   - Add indexes to frequently queried columns
   - Review retrieval service performance

---

### ngrok tunnel expired — physical device only

**What is ngrok?**
ngrok creates a temporary public URL (e.g. `https://xxxx.ngrok-free.app`) that tunnels traffic from the internet to `localhost:8000` on your machine. Physical phones can't reach `localhost` directly — they need this tunnel.

- **Simulators don't need ngrok** — they run as processes on your computer and share its network stack
- **Physical devices always need ngrok** — they are on WiFi and can't resolve your machine's `localhost`

**How it fails silently:**
When the ngrok tunnel expires, requests from the phone get a generic 404 response from ngrok's servers. The app interprets that 404 as "Dish not found" — not as a connection error — so it looks like a database problem when it isn't.

**How to diagnose:**
```
Phone submits dish → NGROK_URL (dead) → ngrok 404 → label.ts sees 404 → "Dish not found"
```
vs. the correct path:
```
Phone submits dish → NGROK_URL (live) → localhost:8000 → Docker API → PostgreSQL → nutrition label
```

Check the Docker API logs — if no `POST /label` lines appear when you submit a dish from the phone, the tunnel is dead and the backend is never reached.

**Fix:**

1. Start a new ngrok tunnel:
   ```powershell
   ngrok http 8000
   ```

2. Copy the new `https://xxxx.ngrok-free.app` URL from the ngrok output

3. Update `NGROK_URL` in `mobile/src/services/api.ts`:
   ```typescript
   // Line ~22 in mobile/src/services/api.ts
   const NGROK_URL = 'https://your-new-url.ngrok-free.app';
   ```

4. Save the file — Metro will hot-reload automatically

> **Note:** Free ngrok tunnels expire when you close the terminal or after a period of inactivity. You must repeat this every time you restart ngrok.

---

## Cache & Data Issues

### Metro bundler showing stale code

**Symptoms:**
- Code changes not reflecting in app
- Old errors persisting after fixes

**Solutions:**

1. **Clear Metro cache:**
   ```powershell
   cd mobile
   npx expo start --clear
   ```

2. **Clear watchman cache:**
   ```powershell
   watchman watch-del-all
   ```

3. **Delete node_modules and reinstall:**
   ```powershell
   rm -rf node_modules
   npm install
   ```

4. **Clear Expo cache:**
   ```powershell
   npx expo start -c
   ```

---

### App shows old data after database changes

**Symptoms:**
- Old dishes still appearing
- Cached nutrition data not updating

**Solutions:**

1. **Clear AsyncStorage in app:**
   ```typescript
   // In FoodContext or any screen
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   const clearAllData = async () => {
     await AsyncStorage.clear();
     console.log('All app data cleared');
   };
   ```

2. **Remove app from device and reinstall:**
   - iOS: Delete app from home screen
   - Android: Settings → Apps → NutriLabelAI → Uninstall

3. **Clear specific storage keys:**
   ```typescript
   await AsyncStorage.removeItem('@food_entries');
   await AsyncStorage.removeItem('@explore_cache');
   await AsyncStorage.removeItem('@settings');
   ```

---

### ERROR: "Failed to load cached dishes"

**Symptoms:**
```
ERROR  ❌ [Storage] Failed to load cached dishes
```

**Solutions:**

1. **Clear explore cache:**
   ```typescript
   await AsyncStorage.removeItem('@explore_cache');
   ```

2. **Check loadCachedDishes implementation:**
   - File: `mobile/src/services/storage.ts`
   - Ensure proper error handling

---

## Build & Development Issues

### ERROR: Port 8081 already in use

**Symptoms:**
```
Port 8081 is being used by another process
```

**Solutions:**

1. **Use alternative port (accept Expo prompt):**
   ```
   √ Use port 8082 instead? ... yes
   ```

2. **Kill process using port 8081:**
   ```powershell
   # Find process
   netstat -ano | findstr :8081
   
   # Kill process (replace PID)
   taskkill /PID <PID> /F
   ```

3. **Specify custom port:**
   ```powershell
   npx expo start --port 8082
   ```

---

### ERROR: Module not found / Cannot resolve module

**Symptoms:**
```
Error: Unable to resolve module @expo-google-fonts/...
```

**Solutions:**

1. **Install missing dependencies:**
   ```powershell
   cd mobile
   npm install
   ```

2. **Clear cache and rebuild:**
   ```powershell
   npx expo start --clear
   ```

3. **Check for typos in import paths:**
   - Verify file paths are correct
   - Check case sensitivity

4. **Reinstall specific package:**
   ```powershell
   npm uninstall <package-name>
   npm install <package-name>
   ```

---

### Build fails after updating dependencies

**Solutions:**

1. **Clear all caches:**
   ```powershell
   cd mobile
   rm -rf node_modules package-lock.json
   npm install
   npx expo start --clear
   ```

2. **For native builds (after prebuild):**
   ```powershell
   npx expo prebuild --clean
   ```

3. **Check for breaking changes:**
   - Review package changelogs
   - Check Expo SDK compatibility

---

## Network & Connection Issues

### Cannot connect on physical device

**Symptoms:**
- App loads but API calls fail
- "Network error" on all requests

**Solutions:**

1. **Ensure device and computer are on same WiFi network**

2. **Use ngrok for external access:**
   ```powershell
   ngrok http 8000
   ```
   - Update `NGROK_URL` in `mobile/src/services/api.ts`

3. **Check backend is bound to 0.0.0.0:**
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - NOT `127.0.0.1` or `localhost`

4. **Verify device can reach backend:**
   - Open `http://<your-ip>:8000/health` in device browser
   - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

5. **Disable VPN/Proxy** that might block connections

---

### Expo Go fails to load app

**Symptoms:**
- QR code scan fails
- "Unable to connect to Metro" error

**Solutions:**

1. **Ensure same network:**
   - Phone and computer must be on same WiFi
   - Corporate/school WiFi may block connections

2. **Use tunnel mode:**
   ```powershell
   npx expo start --tunnel
   ```

3. **Manually enter URL:**
   - In Expo Go, tap "Enter URL manually"
   - Enter: `exp://<your-computer-ip>:8081`

4. **Check firewall settings:**
   - Allow Metro bundler through firewall
   - Temporarily disable to test

---

## Platform-Specific Issues

### iOS Simulator issues

**ERROR: Unable to boot simulator**

**Solutions:**

1. **Open Xcode and verify simulators:**
   - Xcode → Window → Devices and Simulators
   - Ensure iOS simulator is installed

2. **Reset simulator:**
   ```bash
   xcrun simctl erase all
   ```

3. **Restart Xcode and simulators:**
   ```bash
   killall Simulator
   ```

---

**ERROR: Pod install fails**

**Solutions:**

1. **Update CocoaPods:**
   ```bash
   cd mobile/ios
   pod deintegrate
   pod install
   ```

2. **Clear pod cache:**
   ```bash
   pod cache clean --all
   pod install --repo-update
   ```

---

### Android Emulator issues

**ERROR: Emulator won't start**

**Solutions:**

1. **Verify Android Studio AVD Manager:**
   - Android Studio → Tools → AVD Manager
   - Ensure virtual device is created

2. **Check BIOS virtualization:**
   - Enable Intel VT-x or AMD-V in BIOS

3. **Allocate more RAM to emulator:**
   - AVD Manager → Edit device → Advanced Settings → RAM

---

**ERROR: App crashes on Android**

**Solutions:**

1. **Clear app data:**
   ```bash
   adb shell pm clear com.seniordesign.nutritionestimator
   ```

2. **Rebuild app:**
   ```powershell
   cd mobile
   npx expo prebuild --clean
   npx expo run:android
   ```

3. **Check logcat for errors:**
   ```bash
   adb logcat *:E
   ```

---

## Common Development Workflow Issues

### Changes to app.json not taking effect

**Solutions:**

1. **Prebuild again (for native config changes):**
   ```powershell
   npx expo prebuild --clean
   ```

2. **Restart Metro bundler:**
   ```powershell
   npx expo start --clear
   ```

3. **For icon/splash changes, rebuild the app**

---

### TypeScript errors but app still runs

**Solutions:**

1. **Check TypeScript version:**
   ```powershell
   npm list typescript
   ```

2. **Restart VS Code TypeScript server:**
   - Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

3. **Fix type imports:**
   - Ensure all `@types/*` packages are installed
   - Check `tsconfig.json` configuration

---

### Environment variables not loading

**Solutions:**

1. **Restart Expo dev server after .env changes:**
   ```powershell
   npx expo start --clear
   ```

2. **Verify .env file format:**
   ```
   EXPO_PUBLIC_API_URL=https://api.example.com
   ```

3. **Access with `process.env.EXPO_PUBLIC_*`:**
   ```typescript
   const apiUrl = process.env.EXPO_PUBLIC_API_URL;
   ```

---

## Quick Diagnostic Commands

### Check all systems
```powershell
# Backend health
curl http://localhost:8000/health

# Database status
python scripts/check_db_status.py

# Check dishes count
python scripts/check_dishes.py

# App dependencies
cd mobile && npm list --depth=0

# Expo diagnostics
npx expo-doctor
```

---

## Nuclear Options (Last Resort)

If all else fails, try these in order:

### 1. Complete cache clear
```powershell
cd mobile
npx expo start --clear
rm -rf node_modules package-lock.json
npm install
```

### 2. Reset app storage
```typescript
// In app, run once
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

### 3. Complete reinstall
```powershell
cd mobile
rm -rf node_modules package-lock.json .expo ios android
npm install
npx expo prebuild
```

### 4. Reset Expo
```powershell
npx expo start -c
rm -rf ~/.expo
```

### 5. Delete app and reinstall on device

---

## Getting Help

1. **Check Expo documentation**: https://docs.expo.dev/
2. **Check FastAPI documentation**: https://fastapi.tiangolo.com/
3. **Review project documentation**:
   - `mobile/README.md`
   - `mobile/SETUP.md`
   - `mobile/BACKEND_INTEGRATION_GUIDE.md`
4. **Check backend logs** for detailed error messages
5. **Enable verbose logging** in API client for debugging

---

## Prevention Tips

1. **Always clear cache after major changes:**
   ```powershell
   npx expo start --clear
   ```

2. **Keep dependencies updated:**
   ```powershell
   npx expo install --fix
   ```

3. **Test on both platforms** (iOS & Android) regularly

4. **Commit working states** before major refactors

5. **Document custom configurations** and environment setup

6. **Use TypeScript strict mode** to catch errors early

7. **Monitor backend logs** during development

8. **Keep ngrok URL updated** when using physical devices

---

**Last Updated:** April 26, 2026
