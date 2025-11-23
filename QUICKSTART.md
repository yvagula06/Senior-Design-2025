# Quick Start Guide - Nutrition Estimator

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Backend (Optional for now)

The mobile app can work independently, but for full image analysis features:

```bash
# In the project root
docker-compose up -d --build
docker-compose exec api alembic upgrade head
docker-compose exec api python -m scripts.ingest_seed data/seed_dishes.csv
docker-compose exec api python -m scripts.embed_dishes
```

### Step 2: Run the Mobile App

```bash
cd mobile
npm install
npm start
```

### Step 3: Open on Your Phone

1. **Install Expo Go** on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code** shown in your terminal
   - iOS: Use Camera app
   - Android: Use Expo Go app

3. **Start tracking!**

## 📱 Using the App

### Add Entry Tab
- **Manual Entry**: Fill in food name and macros, tap "Save Food Entry"
- **Camera Entry**: Tap the camera icon, take a photo, verify the analysis

### Daily Consumer Tab
- View your daily nutrition totals in the green card
- See all food entries below
- Tap the delete icon to remove entries

### Drawer Menu
- Swipe from the left edge or tap the menu icon
- Access About and Help sections

## 🛠️ Development Tips

### Running on Emulator/Simulator

**Android Emulator:**
```bash
npm run android
```

**iOS Simulator (macOS only):**
```bash
npm run ios
```

**Web Browser:**
```bash
npm run web
```

### Connecting to Local Backend

When testing with your local FastAPI backend on a physical device:

1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `mobile/src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:8000';
   // Example: 'http://192.168.1.100:8000'
   ```

3. Make sure your phone and computer are on the same WiFi network

### Hot Reload

The app supports hot reload - just save your files and see changes instantly!

## 🎨 Customization

### Change Colors

Edit `mobile/src/theme/colors.ts`:

```typescript
export const AppColors = {
  background: '#F9FBE7',  // Change these!
  primary: '#81C784',
  accent: '#4CAF50',
  text: '#2E2E2E',
};
```

### Modify API Endpoint

Edit `mobile/src/services/api.ts`:

```typescript
const API_BASE_URL = 'YOUR_API_URL_HERE';
```

## ❓ Troubleshooting

**"Unable to connect to server"**
- Make sure you ran `npm start` in the mobile directory
- Check if Expo Go is up to date

**Camera not working**
- Grant camera permissions when prompted
- Make sure you're testing on a physical device (not web)

**Backend connection issues**
- Use your computer's IP address, not `localhost`
- Ensure both devices are on the same network
- Check if backend is running: `http://YOUR_IP:8000/health`

**Module not found errors**
```bash
cd mobile
rm -rf node_modules
npm install
```

## 📚 Next Steps

- Read the full docs: `mobile/README.md`
- Explore the backend API: `http://localhost:8000/docs`
- Check out the codebase structure in the main `README.md`

## 💡 Pro Tips

1. **Use Expo Go for quick testing** - no need to build native apps
2. **Enable Shake Gesture** - shake your phone to open the developer menu
3. **Use Chrome DevTools** - press `j` in the terminal to debug
4. **Live Reload** - press `r` in the terminal to reload the app

Happy coding! 🎉
