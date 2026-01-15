# React Native API Integration - Setup Guide

## Overview

This guide explains how to configure the mobile app to connect to your NutriLabelAI backend during development and production.

## Quick Start

1. **Import the API service:**
   ```typescript
   import { requestLabel } from './src/services/labelApi';
   ```

2. **Call the API:**
   ```typescript
   const result = await requestLabel('Chicken Tikka Masala', 600);
   console.log(result.matched_dish);
   console.log(result.nutrition.calories);
   console.log(result.confidence);
   ```

## Development Setup

The mobile app needs to connect to your backend server running on `localhost:8000`. Configuration depends on your device:

### Android Emulator (Automatic)

- ✅ Works out of the box
- Uses special alias: `10.0.2.2:8000` (maps to host machine's `localhost:8000`)
- No configuration needed

### iOS Simulator (Automatic)

- ✅ Works out of the box
- Uses: `localhost:8000`
- No configuration needed

### Physical Device (Requires Setup)

#### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with `192.168.x.x`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for `inet` address under your active network interface (usually starts with `192.168.x.x`)

#### Step 2: Update Mobile App Configuration

Open [mobile/src/services/labelApi.ts](mobile/src/services/labelApi.ts#L33) and update:

```typescript
const PHYSICAL_DEVICE_IP = '192.168.1.100'; // Replace with YOUR computer's IP
```

#### Step 3: Configure Backend to Accept Network Connections

Your FastAPI backend must bind to `0.0.0.0` (not `127.0.0.1`) to accept connections from other devices:

**Update [app/main.py](app/main.py) or run command:**

```python
# In main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Or via command line:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 4: Ensure Same Network

- Your computer and physical device must be on the same WiFi network
- Check firewall settings allow connections on port 8000

#### Step 5: Test Connection

```typescript
import { checkBackendHealth } from './src/services/labelApi';

const isHealthy = await checkBackendHealth();
console.log(`Backend accessible: ${isHealthy}`);
```

## Production Setup

When deploying to production:

1. Deploy backend to a public URL (e.g., `https://api.nutrilabelai.com`)

2. Update [mobile/src/services/labelApi.ts](mobile/src/services/labelApi.ts#L42):
   ```typescript
   return 'https://api.nutrilabelai.com'; // Your production URL
   ```

3. Rebuild mobile app with production configuration

## API Usage Examples

### Basic Request

```typescript
import { requestLabel } from './src/services/labelApi';

try {
  const result = await requestLabel('Grilled Salmon');
  
  console.log(`Matched: ${result.matched_dish}`);
  console.log(`Calories: ${result.nutrition.calories}`);
  console.log(`Protein: ${result.nutrition.protein_g}g`);
  console.log(`Confidence: ${result.confidence}`);
} catch (error) {
  console.error(error.message);
}
```

### With Calorie Target

```typescript
const result = await requestLabel('Chicken Tikka Masala', 600);
// Scales nutrition to target 600 calories
```

### With Style

```typescript
const result = await requestLabel('Burger', 800, 'restaurant');
// Searches for restaurant-style burger with 800 calories
```

### Full Parameters

```typescript
const result = await requestLabel(
  'Pad Thai',     // Dish name
  500,            // Target calories
  'home',         // Style
  10              // Retrieve top 10 similar dishes
);
```

## Error Handling

The API service provides user-friendly error messages:

```typescript
import { requestLabel } from './src/services/labelApi';
import { LabelError } from './src/types/label';

try {
  const result = await requestLabel('Pizza');
  // Use result...
} catch (error) {
  const labelError = error as LabelError;
  
  switch (labelError.type) {
    case 'network':
      alert('No internet connection');
      break;
    case 'timeout':
      alert('Request took too long');
      break;
    case 'server':
      alert('Server error, try again later');
      break;
    case 'validation':
      alert('Invalid input: ' + labelError.message);
      break;
    default:
      alert('Something went wrong');
  }
}
```

## Response Structure

```typescript
{
  matched_dish: "Chicken Tikka Masala",
  nutrition: {
    calories: 600,
    protein_g: 45.2,
    carbs_g: 38.5,
    fat_g: 25.8,
    fiber_g: 3.2,
    sugar_g: 5.1,
    sodium_mg: 890
  },
  confidence: 0.92,
  explanation: "Matched 5 similar recipes. Scaled to target 600 calories. High confidence based on consistent ingredients."
}
```

## Troubleshooting

### "Unable to connect to server"

- ✅ Check backend is running: `curl http://localhost:8000/health`
- ✅ For physical device: Verify IP address in `labelApi.ts`
- ✅ For physical device: Ensure backend uses `0.0.0.0:8000` (not `127.0.0.1:8000`)
- ✅ Check firewall settings
- ✅ Ensure device and computer on same WiFi

### "Request timed out"

- ✅ Check internet connection
- ✅ Backend may be slow - increase timeout in [labelApi.ts](mobile/src/services/labelApi.ts#L52):
  ```typescript
  timeout: 20000, // 20 seconds
  ```

### "Server error"

- ✅ Check backend logs for errors
- ✅ Ensure PostgreSQL database is running
- ✅ Verify backend environment variables

## Files Reference

- **API Service:** [mobile/src/services/labelApi.ts](mobile/src/services/labelApi.ts)
- **Type Definitions:** [mobile/src/types/label.ts](mobile/src/types/label.ts)
- **Backend Endpoint:** [app/api/label_router.py](app/api/label_router.py)

## Next Steps

1. Update `PHYSICAL_DEVICE_IP` if testing on physical device
2. Test API with `checkBackendHealth()`
3. Integrate `requestLabel()` into your React Native components
4. Handle errors gracefully in UI
5. Before production: Update production URL in `labelApi.ts`
