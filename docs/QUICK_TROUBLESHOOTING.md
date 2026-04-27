# Quick Troubleshooting Reference

Common error codes and their immediate solutions.

---

## 🚨 Critical Errors

### "Dish not found" (404)
```powershell
cd mobile && npx expo start --clear
```
**OR** use the in-app clear button (fastest):
- Open app → **Profile** → **"Testing"** → **"Clear All Local Data"** → Reload

Then in app: Clear AsyncStorage or delete app data.

### "Unable to connect to server"
```powershell
# 1. Check backend is running
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Update ngrok (physical devices)
ngrok http 8000
# Copy URL → mobile/src/services/api.ts → NGROK_URL
```

### "Request timed out"
Increase timeout in `mobile/src/services/api.ts`:
```typescript
timeout: 60000  // Change from 30000
```

---

## 🧹 Cache Issues

### Metro cache / stale code
```powershell
cd mobile
npx expo start --clear
```

### App showing old data
```typescript
// Run once in app
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

### Complete cache nuclear option
```powershell
cd mobile
rm -rf node_modules package-lock.json .expo
npm install
npx expo start --clear
```

---

## 🔌 Connection Issues

### Physical device can't connect
1. Ensure same WiFi network
2. Use ngrok:
   ```powershell
   ngrok http 8000
   ```
3. Backend must use `0.0.0.0` not `127.0.0.1`
4. Update `NGROK_URL` in `mobile/src/services/api.ts`

### Backend URLs by platform
- **iOS Simulator**: `http://localhost:8000`
- **Android Emulator**: `http://10.0.2.2:8000`
- **Physical Device**: Use ngrok or `http://<your-ip>:8000`

---

## 🏗️ Build Issues

### Port 8081 in use
Accept Expo's prompt to use 8082, or:
```powershell
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Module not found
```powershell
cd mobile
rm -rf node_modules
npm install
npx expo start --clear
```

### Prebuild issues (native changes)
```powershell
npx expo prebuild --clean
```

---

## 📱 Platform-Specific

### iOS Simulator won't start
```bash
killall Simulator
xcrun simctl erase all
```

### Android emulator issues
```bash
adb shell pm clear com.seniordesign.nutritionestimator
```

---

## 🔍 Diagnostic Commands

```powershell
# Backend health check
curl http://localhost:8000/health

# Database status
python scripts/check_db_status.py

# Check dishes
python scripts/check_dishes.py

# Expo diagnostics
cd mobile && npx expo-doctor
```

---

## 📚 Full Documentation

For detailed explanations and more solutions:
- **Mobile App**: [`mobile/TROUBLESHOOTING.md`](../mobile/TROUBLESHOOTING.md)
- **Setup Guide**: [`mobile/SETUP.md`](../mobile/SETUP.md)
- **Backend Integration**: [`mobile/BACKEND_INTEGRATION_GUIDE.md`](../mobile/BACKEND_INTEGRATION_GUIDE.md)

---

**Last Updated:** April 26, 2026
