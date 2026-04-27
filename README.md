# Senior Design 2025 - NutriLabelAI

A comprehensive nutrition tracking system with AI-powered meal analysis, consisting of a **React Native mobile app**, **FastAPI backend** with PostgreSQL + pgvector, and **ML experimentation notebooks**.

## 🏗️ Architecture

### Frontend (Mobile App)
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **UI**: React Native Paper (Material Design)
- **Navigation**: React Navigation (Drawer + Bottom Tabs)
- **Location**: `mobile/` directory

### Backend (API)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with pgvector (384-dimensional embeddings)
- **ML/AI**: Multi-model nutrition prediction pipeline
  - Retrieval: Sentence-transformers + nearest neighbor search
  - Scaling: Linear regression calibration
  - Neural Network: PyTorch MLP for complex patterns
- **Location**: Root directory (`app/`, `alembic/`, etc.)

### Machine Learning
- **ML Models**: Pre-trained models in `ml_models/`
  - Nearest neighbors retrieval model
  - Linear regression scaling model
  - PyTorch neural network (256→128→64 architecture)
  - TF-IDF vectorizers and encoders
- **Notebooks**: Jupyter notebooks for experimentation
  - `NutriLabelAI_ML_Draft.ipynb` - Main ML pipeline development
  - `DSA330_Nutrition_TextRegression.ipynb` - Text-based regression experiments
- **Documentation**: `NOTEBOOK_README.md` for ML setup and usage

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

## 📚 Additional Documentation

- **`QUICKSTART.md`** - Quick setup guide
- **`NOTEBOOK_README.md`** - ML notebook documentation and tutorials
- **`MIGRATION.md`** - Database migration guide
- **`mobile/README.md`** - React Native app documentation
- **API Docs** - Interactive docs at http://localhost:8000/docs (when running)

## 📱 Mobile App Features

- ✅ Manual food entry with detailed macros
- ✅ Camera-based food recognition
- ✅ Daily nutrition tracking with totals
- ✅ Modern, clean UI (inspired by DoorDash/Uber)
- ✅ Bottom tab + drawer navigation
- ✅ Swipe-to-delete entries

## 🧠 ML Features

- **Hybrid Prediction Pipeline**: Combines retrieval, scaling, and neural networks
- **Embedding-Based Search**: 384-dim sentence-transformers for semantic similarity
- **Multi-Model Ensemble**: Retrieval baseline + linear regression + PyTorch MLP
- **Confidence Scoring**: Uncertainty quantification for predictions
- **Text Regression**: TF-IDF + Gradient Boosting for USDA dataset experiments
- **Model Artifacts**: Pre-trained models saved in `ml_models/` directory

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

## 🧪 Testing & Development

### Backend Tests
```bash
# Run all tests
docker-compose exec api pytest

# Run specific test file
docker-compose exec api pytest app/tests/test_label_flow.py

# Run with coverage
docker-compose exec api pytest --cov=app
```

### Database Utilities
```bash
# Inspect database contents
docker-compose exec api python -m scripts.inspect_db

# Check dishes and embeddings
docker-compose exec api python -m scripts.check_dishes

# Query specific dishes
docker-compose exec api python -m scripts.query_db
```

### Development Commands
```bash
# View API logs
docker-compose logs -f api

# Access database directly
docker-compose exec postgres psql -U postgres -d nutrition

# Rebuild after code changes
docker-compose up -d --build api
```

## 📂 Project Structure

```
Senior-Design-2025/
├── mobile/                          # React Native Expo app
│   ├── src/
│   │   ├── screens/                # App screens
│   │   ├── navigation/             # Navigation setup
│   │   ├── services/               # API client
│   │   ├── context/                # State management
│   │   └── theme/                  # Styling & colors
│   └── README.md                   # Mobile app docs
├── app/                            # FastAPI backend
│   ├── api/                        # API routes
│   ├── core/                       # Configuration
│   ├── db/                         # Database models
│   ├── schemas/                    # Pydantic schemas
│   ├── services/                   # Business logic
│   │   ├── retrieval_service.py   # Embedding search
│   │   ├── scaling_service.py     # Linear regression
│   │   ├── mixture_service.py     # Model ensemble
│   │   ├── confidence_service.py  # Uncertainty estimation
│   │   └── rebalance_service.py   # Nutrition rebalancing
│   ├── tests/                      # Backend tests
│   └── utils/                      # Embedding utilities
├── alembic/                        # Database migrations
├── data/                           # Seed data
│   ├── seed_dishes.csv            # Initial dish database
│   └── fastfood.csv               # Fast food dataset
├── ml_models/                      # Pre-trained ML models
│   ├── nearest_neighbors_model.pkl
│   ├── linear_regression_model.pkl
│   ├── neural_network_model.pth
│   ├── cuisine_encoder.pkl
│   ├── target_scaler.pkl
│   └── model_metadata.pkl
├── scripts/                        # Utility scripts
│   ├── ingest_seed.py             # Load seed data
│   ├── embed_dishes.py            # Generate embeddings
│   ├── inspect_db.py              # Database inspection
│   └── check_dishes.py            # Data validation
├── NutriLabelAI_ML_Draft.ipynb    # Main ML experimentation notebook
├── DSA330_Nutrition_TextRegression.ipynb  # Text regression experiments
├── NOTEBOOK_README.md             # ML notebook documentation
├── docker-compose.yml             # Docker orchestration
├── pyproject.toml                 # Python dependencies
└── README.md                      # This file
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile Frontend | React Native, Expo, TypeScript |
| Mobile UI | React Native Paper |
| Backend API | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + pgvector |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| ML Framework | PyTorch, scikit-learn |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Vector Search | pgvector + nearest neighbors |
| Containerization | Docker + Docker Compose |
| HTTP Client | Axios |
| Data Processing | NumPy, Pandas, SciPy |
| Notebooks | Jupyter, IPython |

## 🔬 ML Development

### Running the Notebooks

1. **Install Jupyter dependencies:**
   ```bash
   pip install jupyter notebook ipykernel
   ```

2. **Launch Jupyter:**
   ```bash
   jupyter notebook
   ```

3. **Open notebooks:**
   - `NutriLabelAI_ML_Draft.ipynb` - Main ML pipeline with retrieval + scaling + neural network
   - `DSA330_Nutrition_TextRegression.ipynb` - Text-based regression with TF-IDF + Gradient Boosting

4. **Run all cells** to train models and generate artifacts in `ml_models/`

See `NOTEBOOK_README.md` for detailed ML documentation, troubleshooting, and integration examples.

### Backend ML Services

The backend implements several ML services that work together:

- **`retrieval_service.py`**: Finds similar dishes using embedding cosine similarity
- **`scaling_service.py`**: Calibrates predictions with linear regression
- **`mixture_service.py`**: Combines multiple models (retrieval + neural network)
- **`confidence_service.py`**: Estimates prediction uncertainty
- **`rebalance_service.py`**: Adjusts nutrition totals to match known calories

## � Troubleshooting

Having issues? We've got you covered with comprehensive troubleshooting guides:

### Quick Reference
📋 **[Quick Troubleshooting Guide](docs/QUICK_TROUBLESHOOTING.md)** - Common errors and immediate solutions

**Common issues:**
- 🚨 "Dish not found" errors → Clear cache: `npx expo start --clear`
- 🌐 "Unable to connect to server" → Check backend URL and ngrok
- 🧹 Stale data/cache → Clear Metro + AsyncStorage
- 🔌 Connection issues → Verify network and backend binding

### Detailed Guides
📚 **[Mobile App Troubleshooting](mobile/TROUBLESHOOTING.md)** - Complete mobile app troubleshooting guide
- API & Backend Issues
- Cache & Data Problems  
- Build & Development Issues
- Network & Connection Problems
- Platform-Specific Solutions (iOS/Android)
- Diagnostic Commands & Nuclear Options

### Quick Diagnostic Commands
```powershell
# Check backend health
curl http://localhost:8000/health

# Check database
python scripts/check_db_status.py

# Check dishes count
python scripts/check_dishes.py

# Clear mobile cache
cd mobile && npx expo start --clear

# Run Expo diagnostics
cd mobile && npx expo-doctor
```

## �👥 Team

- Raj
- Harry
- Matthew
- Rached

## 📄 License

Senior Design Project 2025