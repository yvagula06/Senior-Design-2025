# Senior Design 2025 - Nutrition Estimator

A comprehensive nutrition tracking system with AI-powered image analysis, consisting of a **React Native mobile app** and a **FastAPI backend** with PostgreSQL + pgvector.

## 🏗️ Architecture

### Frontend (Mobile App)
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **UI**: React Native Paper (Material Design)
- **Navigation**: React Navigation (Drawer + Bottom Tabs)
- **Location**: `mobile/` directory

### Backend (API)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with pgvector
- **ML/AI**: Nutrition prediction using embeddings
- **Location**: Root directory (`app/`, `alembic/`, etc.)

## 🚀 Quick Start

### Backend Setup

1. **Start the backend services:**
   ```bash
   docker-compose up -d --build
   ```

2. **Run database migrations:**
   ```bash
   docker-compose exec api alembic upgrade head
   ```

3. **Seed the database:**
   ```bash
   docker-compose exec api python -m scripts.ingest_seed data/seed_dishes.csv
   docker-compose exec api python -m scripts.embed_dishes
   ```

4. **Verify backend is running:**
   - Open http://localhost:8000/health
   - API docs at http://localhost:8000/docs

### Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - Scan QR code with Expo Go (Android/iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (macOS only)

See `mobile/README.md` for detailed mobile app documentation.

## 📱 Mobile App Features

- ✅ Manual food entry with detailed macros
- ✅ Camera-based food recognition
- ✅ Daily nutrition tracking with totals
- ✅ Modern, clean UI (inspired by DoorDash/Uber)
- ✅ Bottom tab + drawer navigation
- ✅ Swipe-to-delete entries

## 🔌 API Endpoints

### Search
```bash
curl "http://localhost:8000/dishes/search?q=chicken%20tikka%20masala&k=5"
```

### Generate Nutrition Label
```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{"dish_name":"chicken tikka masala","calories":620}'
```

### Analyze Image (Mobile App Endpoint)
```bash
curl -X POST http://localhost:8000/analyzeImage \
  -F "image=@photo.jpg"
```

## 📂 Project Structure

```
Senior-Design-2025/
├── mobile/                 # React Native Expo app
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── navigation/    # Navigation setup
│   │   ├── services/      # API client
│   │   ├── context/       # State management
│   │   └── theme/         # Styling & colors
│   └── README.md          # Mobile app docs
├── app/                   # FastAPI backend
│   ├── api/              # API routes
│   ├── core/             # Configuration
│   ├── db/               # Database models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── tests/            # Backend tests
├── alembic/              # Database migrations
├── data/                 # Seed data
├── scripts/              # Utility scripts
├── docker-compose.yml    # Docker orchestration
└── README.md            # This file
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile Frontend | React Native, Expo, TypeScript |
| Mobile UI | React Native Paper |
| Backend API | FastAPI (Python) |
| Database | PostgreSQL + pgvector |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Containerization | Docker + Docker Compose |
| HTTP Client | Axios |

## 👥 Team

- Raj
- Harry
- Matthew
- Rached

## 📄 License

Senior Design Project 2025