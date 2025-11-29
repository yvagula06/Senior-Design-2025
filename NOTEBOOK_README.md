# NutriLabelAI ML Notebook - README

## Overview

`NutriLabelAI_ML_Draft.ipynb` is a comprehensive Jupyter notebook for experimenting with machine learning approaches to intelligent food nutrition estimation. This notebook implements and evaluates multiple ML models for inferring complete FDA-style nutrition labels from dish names and target calories.

---

## 🎯 Purpose

This notebook serves as the **ML research and experimentation layer** for the NutriLabelAI backend system. It enables:

- **Data exploration** of dish embeddings and nutrient profiles
- **Model prototyping** for retrieval-based and learned prediction approaches
- **Confidence scoring** development for prediction quality assessment
- **Performance evaluation** across multiple modeling strategies
- **Artifact generation** for backend integration

---

## 🏗️ Architecture

### Problem Statement
Restaurant and recipe dishes often lack complete nutrition labels. When calorie information is available, detailed macronutrient and micronutrient data is frequently missing. Additionally, dish names are inherently ambiguous (e.g., "butter chicken" varies by preparation style, cuisine, region).

### Solution Approach
Build an ML-driven system that infers nutrition labels from:
- **Dish name** (converted to 384-dim embedding via Sentence-BERT)
- **Target calories** (numeric input)

Using:
- **Retrieval:** Find similar canonical dishes via embedding similarity
- **Scaling:** Adjust nutrient profiles to match target calories
- **Confidence scoring:** Quantify prediction uncertainty

---

## 📊 Notebook Structure

### 1. **Prerequisites & Setup**
- Automatic installation of required packages (dotenv, sqlalchemy, psycopg2, torch)
- Library imports (pandas, numpy, sklearn, torch, matplotlib, seaborn)

### 2. **Database Connection**
- Connects to PostgreSQL database with pgvector extension
- **Graceful fallback:** Generates mock data if database unavailable
- Ensures notebook runs in any environment

### 3. **Data Extraction**
- Queries dishes, nutrients, and embeddings tables
- Parses pgvector data to numpy arrays
- Constructs comprehensive DataFrame with 384 embedding dimensions

### 4. **Exploratory Data Analysis (EDA)**
- Descriptive statistics for calories and macronutrients
- Distribution visualizations (histograms, scatter plots)
- Macro ratio analysis (protein/carbs/fat as % of calories)
- PCA visualization of embedding space colored by cuisine

### 5. **Feature Engineering**
- Combines 384-dim embeddings with one-hot encoded cuisine features
- Defines multi-output targets: `[kcal, protein_g, carbs_g, fat_g]`
- 80/20 train-test split with stratification

### 6. **Baseline: Retrieval + Scaling Model**
- Nearest neighbor search in embedding space (cosine similarity)
- Proportional scaling of nutrients to target calories
- Mirrors production `/label` endpoint logic

### 7. **ML Models**

#### 7.1 Multi-output Linear Regression
- Predicts all nutrients simultaneously
- Baseline learned model
- Metrics: MAE, RMSE, R² per nutrient

#### 7.2 Neural Network (PyTorch MLP)
- Architecture: 256 → 128 → 64 hidden layers with ReLU + Dropout
- Trained for 100 epochs with Adam optimizer
- MSE loss function
- Learning curves visualization

### 8. **Confidence Scoring Prototype**
- **Retrieval confidence:** Weighted combination of cosine similarity + calorie consistency
- **ML confidence:** Error-based calibration using historical prediction errors
- Validation of confidence-error correlation

### 9. **Evaluation & Comparison**
- Side-by-side comparison of all models
- MAE/RMSE per nutrient across models
- Bar charts and scatter plots (predicted vs actual)
- Performance insights and recommendations

### 10. **Backend Integration Notes**
- Detailed documentation for production integration
- Enhancement opportunities for FastAPI services
- Data collection recommendations
- Future work roadmap
- Deployment considerations

### 11. **Model Artifacts**
- Saves trained models to `ml_models/` directory:
  - `linear_regression_model.pkl`
  - `neural_network_model.pth`
  - `cuisine_encoder.pkl`
  - `target_scaler.pkl`
  - `nearest_neighbors_model.pkl`
  - `model_metadata.pkl`

---

## 🚀 How to Run

### Prerequisites

1. **Python 3.11+** (notebook uses Python 3.13.5 with Omni kernel)
2. **PostgreSQL with pgvector** (optional - will use mock data if unavailable)
3. **Environment variables:** `.env` file with `DATABASE_URL`

### Running the Notebook

#### Option 1: With Database Connection

```bash
# Ensure Docker containers are running
docker-compose up -d

# Start Jupyter
jupyter notebook NutriLabelAI_ML_Draft.ipynb
```

#### Option 2: Standalone (Mock Data)

Simply open the notebook and run all cells. The notebook will automatically:
1. Detect database unavailability
2. Generate 100 synthetic dishes with realistic nutrients
3. Create normalized 384-dim embeddings
4. Complete all experiments with mock data

### Cell-by-Cell Execution

1. **Cell 1-2:** Install packages (takes ~1-2 minutes first time)
2. **Cell 3-5:** Import libraries and connect to database
3. **Cell 6-7:** Load or generate data
4. **Cell 8-14:** Run EDA visualizations
5. **Cell 15-17:** Feature engineering
6. **Cell 18-20:** Retrieval baseline
7. **Cell 21-28:** Train ML models (Neural Network takes ~2 minutes)
8. **Cell 29-33:** Confidence scoring
9. **Cell 34-38:** Evaluation and comparisons
10. **Cell 39-43:** Save models and final summary

**Total runtime:** ~5-10 minutes (depending on hardware)

---

## 📦 Dependencies

### Automatically Installed
- `python-dotenv` - Environment variable management
- `sqlalchemy` - Database ORM
- `psycopg2-binary` - PostgreSQL adapter
- `torch`, `torchvision`, `torchaudio` - Neural network framework

### Pre-installed (via Omni kernel)
- `numpy`, `pandas` - Data manipulation
- `matplotlib`, `seaborn` - Visualization
- `scikit-learn` - ML models and metrics
- `joblib` - Model serialization

---

## 📈 Expected Outputs

### Visualizations
- **4 distribution histograms** (calories, protein, carbs, fat)
- **3 scatter plots** (calories vs each macronutrient)
- **PCA embedding visualization** (colored by cuisine)
- **Neural network learning curves** (training + validation loss)
- **3 confidence-error scatter plots** (one per model)
- **Bar chart comparison** (MAE across models and nutrients)
- **3 predicted vs actual plots** (calories for each model)

### Metrics
- **Retrieval Baseline:** MAE, RMSE per nutrient
- **Linear Regression:** MAE, RMSE, R² per nutrient
- **Neural Network:** MAE, RMSE, R² per nutrient
- **Confidence scores:** Mean, std, min, max per model

### Saved Artifacts
All models saved to `ml_models/` directory for backend integration.

---

## 🔬 Key Findings (with Real Data)

When using actual database with real dish embeddings and nutrients:

1. **Retrieval+Scaling Baseline:** Excellent for calories (exact match by design), moderate for macros
2. **Linear Regression:** Captures linear relationships between embeddings and nutrients
3. **Neural Network:** Learns non-linear patterns, best for complex dishes

**Note:** With mock data, models show poor performance due to random embeddings with no semantic meaning.

---

## 🛠️ Customization

### Modify Model Architecture

Edit cell containing `NutrientMLP` class:

```python
# Change hidden layer sizes
model = NutrientMLP(
    input_dim=input_dim, 
    hidden_dims=[512, 256, 128],  # Larger network
    output_dim=output_dim
)
```

### Adjust Training Parameters

Edit training configuration cell:

```python
num_epochs = 200  # More epochs
optimizer = optim.Adam(model.parameters(), lr=0.0005)  # Lower learning rate
batch_size = 64  # Larger batches
```

### Add More Nutrients

Modify feature engineering cell:

```python
# Include micronutrients in predictions
y = df[['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg']].values
output_dim = 7  # Update model output dimension
```

---

## 🔗 Integration with Backend

### Loading Saved Models

```python
import joblib
import torch

# Load Linear Regression
lr_model = joblib.load('ml_models/linear_regression_model.pkl')

# Load Neural Network
model = NutrientMLP(input_dim=389, output_dim=4)
model.load_state_dict(torch.load('ml_models/neural_network_model.pth'))
model.eval()

# Load preprocessors
encoder = joblib.load('ml_models/cuisine_encoder.pkl')
scaler = joblib.load('ml_models/target_scaler.pkl')
```

### Using in FastAPI Service

```python
# In app/services/ml_prediction_service.py
from pathlib import Path

class MLPredictionService:
    def __init__(self):
        models_dir = Path("ml_models")
        self.lr_model = joblib.load(models_dir / "linear_regression_model.pkl")
        self.encoder = joblib.load(models_dir / "cuisine_encoder.pkl")
        # Load other models...
    
    def predict_nutrients(self, embedding: np.ndarray, cuisine: str, target_kcal: float):
        # One-hot encode cuisine
        cuisine_features = self.encoder.transform([[cuisine]])
        
        # Combine features
        X = np.hstack([embedding.reshape(1, -1), cuisine_features])
        
        # Predict with Linear Regression
        prediction = self.lr_model.predict(X)[0]
        
        # Scale to target calories
        scale_factor = target_kcal / prediction[0]
        scaled_prediction = prediction * scale_factor
        
        return {
            'kcal': scaled_prediction[0],
            'protein_g': scaled_prediction[1],
            'carbs_g': scaled_prediction[2],
            'fat_g': scaled_prediction[3]
        }
```

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `connection refused` or `database not available`

**Solution:** Notebook automatically uses mock data. To use real database:
1. Ensure Docker is running: `docker-compose up -d`
2. Check `.env` file has correct `DATABASE_URL`
3. Verify database has data: `docker exec -it postgres psql -U postgres -d nutrition -c "SELECT COUNT(*) FROM dishes;"`

### Package Installation Fails

**Error:** `Failed to install torch`

**Solution:** 
```bash
# Install manually before running notebook
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Out of Memory (Neural Network Training)

**Solution:** Reduce batch size or model size:
```python
batch_size = 16  # Smaller batches
hidden_dims = [128, 64]  # Smaller network
```

### Notebook Kernel Crashes

**Solution:** Restart kernel and run cells sequentially (avoid running multiple compute-intensive cells simultaneously)

---

## 📚 References

### Papers & Research
- **Sentence-BERT:** [Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084)
- **pgvector:** [Nearest Neighbor Search in PostgreSQL](https://github.com/pgvector/pgvector)

### Datasets
- **USDA FoodData Central:** https://fdc.nal.usda.gov/
- **Open Food Facts:** https://world.openfoodfacts.org/

### Backend Integration
- See `app/services/` for production service implementations
- See `MIGRATION.md` for database schema details
- See `QUICKSTART.md` for backend setup instructions

---

## 🤝 Contributing

### Adding New Features

1. **Add new cells** at appropriate sections
2. **Update this README** with new functionality
3. **Test with both real and mock data**
4. **Document integration steps** if applicable

### Best Practices

- ✅ Run all cells before committing changes
- ✅ Clear outputs before committing (keep file size small)
- ✅ Add markdown explanations for complex code
- ✅ Update metadata if changing model architectures
- ✅ Test database fallback works correctly

---

## 📝 License

This notebook is part of the NutriLabelAI project. See main project README for license information.

---

## 👥 Authors

Senior Design Team 2025
- Repository: [yvagula06/Senior-Design-2025](https://github.com/yvagula06/Senior-Design-2025)
- Branch: `Raj`

---

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review backend documentation in `README.md`
3. Inspect database with `scripts/inspect_db.py`
4. Check audit logs with `scripts/inspect_audit_logs.py`

---

**Last Updated:** November 29, 2025  
**Notebook Version:** 1.0  
**Python Version:** 3.11+  
**Compatible with:** NutriLabelAI Backend v1.0
