# Ngrok Setup Guide

Connect a physical iOS/Android device to your local backend during development.

## Prerequisites

- ngrok installed (`brew install ngrok`)
- ngrok account at [ngrok.com](https://ngrok.com) (free)
- Auth token configured (one-time setup)

## One-Time Setup

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

---

## Every Time You Develop

### Step 1 — Start Docker
```bash
cd Senior-Design-2025
docker-compose up
```
Verify it's running: http://localhost:8000/health

### Step 2 — Start ngrok (new terminal)
```bash
ngrok http 8000
```

Copy the **Forwarding** URL — it looks like:
```
https://xxxx-xxxx-xxxx.ngrok-free.app
```

> The **Web Interface** URL (`http://127.0.0.1:4040`) is just a local dashboard — do not use that one.

### Step 3 — Update the app
Open `mobile/src/services/api.ts` and update the `NGROK_URL` at the top:

```ts
const NGROK_URL = 'https://xxxx-xxxx-xxxx.ngrok-free.app';
```

### Step 4 — Rebuild on device
```bash
cd mobile
npx expo run:ios --device
```

---

## Notes

- The ngrok URL **changes every time** you restart ngrok (free plan)
- Keep both the Docker terminal and ngrok terminal open while testing
- The iOS Simulator uses `localhost:8000` directly — no ngrok needed
- If the iPad shows no results, first check that ngrok is still running
