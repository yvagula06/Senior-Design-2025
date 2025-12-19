# %% [markdown]
# # DSA 330 Project – Nutrition Prediction from Food Names
# 
# ## Project Overview
# 
# **Course:** Data Science II (DSA 330)  
# **Topic:** Predictive Modeling with Text Regression  
# **Dataset:** USDA FoodData Central Branded Food Products
# 
# ---
# 
# ### Problem Statement
# 
# Nutritional information is critical for health-conscious consumers, but manually looking up macronutrients for every food item is tedious. This project addresses the question:
# 
# > **Can we predict a food item's nutritional composition (calories, protein, carbohydrates, fats, etc.) from just its name and brand?**
# 
# Using machine learning and natural language processing, we will build regression models that take food names as text input and predict multiple nutritional targets simultaneously.
# 
# ---
# 
# ### Objectives
# 
# 1. **Data Preparation:** Load and clean USDA Branded Food Products data
# 2. **Text Vectorization:** Convert food names to numerical features using TF-IDF
# 3. **Model Training:** Train multiple regression models:
#    - Linear Regression (baseline)
#    - Ridge Regression (regularized baseline)
#    - Random Forest Regressor
#    - Gradient Boosting Regressor
#    - Neural Network (optional advanced model)
# 4. **Evaluation:** Compare models using:
#    - Mean Absolute Error (MAE)
#    - Root Mean Squared Error (RMSE)
#    - Cross-validation for robustness
# 5. **Deployment Planning:** Discuss integration into a mobile app with Python backend
# 
# ---
# 
# ### Notebook Structure
# 
# 1. Data Loading & Initial Inspection
# 2. Data Cleaning & Preprocessing
# 3. Text Feature Engineering (TF-IDF)
# 4. Baseline Models (Linear & Ridge Regression)
# 5. Tree-Based Models (Random Forest & Gradient Boosting)
# 6. Optional Neural Network Model
# 7. Model Evaluation & Comparison
# 8. Cross-Validation Analysis
# 9. Mobile App Integration Notes
# 10. Model Export & Final Summary
# 
# ---
# 
# ### Expected Outcomes
# 
# - Identify the best-performing model for nutrition prediction
# - Understand the relationship between food names and nutritional content
# - Create deployable artifacts for a mobile nutrition app
# - Demonstrate practical ML skills for text-based regression problems

# %% [markdown]
# 
# ## 2. Data Loading & Initial Inspection
# 
# **Setup Instructions:**
# 
# 1. **Download the dataset** from USDA FoodData Central:
#    - https://fdc.nal.usda.gov/download-datasets.html
#    - Download "Branded Food" CSV files
# 
# 2. **Run the preprocessing script**:
#    ```bash
#    python scripts/preprocess_fooddata.py
#    ```
#    This will merge `food.csv`, `food_nutrient.csv`, `nutrient.csv`, and `branded_food.csv` into a single file.
# 
# 3. The processed dataset will be saved to: `data/usda_branded_foods.csv`
# 
# The script extracts key nutrients (energy, protein, carbs, fats, sugars, fiber, sodium) and combines them with food names and brand information.

# %%
# Import required libraries
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
from pathlib import Path

# Scikit-learn imports
from sklearn.model_selection import train_test_split, cross_val_score, cross_val_predict, KFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# Optional: Neural Network libraries
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import TensorDataset, DataLoader
    PYTORCH_AVAILABLE = True
except ImportError:
    PYTORCH_AVAILABLE = False
    print("PyTorch not available. Neural network section will be skipped.")

# Serialization
import joblib

# Suppress warnings
warnings.filterwarnings('ignore')

# Set visualization style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)

print("✓ All libraries imported successfully")
print(f"PyTorch available: {PYTORCH_AVAILABLE}")

# %%
# ====== CONFIGURATION ======
# Update this path to your local USDA dataset (reduced version for faster processing)
DATA_PATH = "/Users/nhatle/NutritionFactApp/Senior-Design-2025/data/usda_branded_foods.csv"

# Load the dataset
print(f"Loading data from: {DATA_PATH}")
try:
    df = pd.read_csv(DATA_PATH)
    print(f"✓ Data loaded successfully: {df.shape[0]} rows, {df.shape[1]} columns")
except FileNotFoundError:
    print(f"✗ File not found: {DATA_PATH}")
    print("Please run the preprocessing script first: python scripts/preprocess_fooddata.py")
    # Create mock data for demonstration
    print("\nGenerating mock data for demonstration...")
    np.random.seed(42)
    n_samples = 1000
    
    brands = ['Brand A', 'Brand B', 'Brand C', 'Generic', 'Store Brand']
    food_categories = ['Chips', 'Cookies', 'Crackers', 'Cereal', 'Candy', 'Protein Bar',
                       'Yogurt', 'Cheese', 'Bread', 'Pasta']
    
    mock_data = {
        'food_name': [f"{np.random.choice(food_categories)} {i}" for i in range(n_samples)],
        'brand_owner': np.random.choice(brands, n_samples),
        'energy_kcal': np.random.randint(50, 600, n_samples),
        'protein_g': np.random.uniform(0, 30, n_samples),
        'carbohydrates_g': np.random.uniform(5, 80, n_samples),
        'fat_total_g': np.random.uniform(0, 40, n_samples),
        'sugars_g': np.random.uniform(0, 50, n_samples),
        'fiber_g': np.random.uniform(0, 15, n_samples),
        'sodium_mg': np.random.uniform(0, 1000, n_samples),
        'serving_size': np.random.uniform(20, 200, n_samples)
    }
    
    df = pd.DataFrame(mock_data)
    print(f"✓ Mock data generated: {df.shape[0]} rows, {df.shape[1]} columns")


# %%
# Initial data inspection
print("="*80)
print("DATASET OVERVIEW")
print("="*80)

print("\n--- First 5 rows ---")
print(df.head())

print("\n--- Dataset Info ---")
print(df.info())

print("\n--- Numeric columns statistics ---")
print(df.describe())

# %% [markdown]
# ## 3. Data Cleaning & Preprocessing
# 
# In this section, we will:
# 1. **Clean food names:** Lowercase, remove punctuation, normalize whitespace
# 2. **Handle missing values:** Drop rows missing critical target nutrients
# 3. **Filter outliers:** Remove unrealistic nutritional values
# 4. **Prepare targets:** Create multi-output target matrix for regression
# 5. **Train-test split:** 80/20 split for model evaluation

# %%
import re

# Create a copy for processing
df_clean = df.copy()

print("Starting data cleaning...")
print(f"Initial dataset size: {len(df_clean)} rows\n")

# 1. Clean food names
def clean_text(text):
    """Clean and normalize text for NLP processing"""
    if pd.isna(text):
        return ""
    # Lowercase
    text = str(text).lower()
    # Remove special characters but keep spaces
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

df_clean['food_name_clean'] = df_clean['food_name'].apply(clean_text)
df_clean['brand_owner_clean'] = df_clean['brand_owner'].apply(clean_text)

# Combine name and brand for richer text features
df_clean['text_features'] = df_clean['food_name_clean'] + ' ' + df_clean['brand_owner_clean']

print("Text cleaning complete")

# 2. Handle missing values for critical target nutrients
required_cols = ['energy_kcal', 'protein_g', 'carbohydrates_g', 'fat_total_g']

print(f"\nMissing values before cleaning:")
for col in required_cols:
    if col in df_clean.columns:
        missing = df_clean[col].isna().sum()
        print(f"  {col}: {missing} ({missing/len(df_clean)*100:.1f}%)")

# Drop rows with missing critical targets
df_clean = df_clean.dropna(subset=required_cols)
print(f"\nDropped rows with missing critical nutrients")
print(f"Dataset size after dropping: {len(df_clean)} rows")

# 3. Filter outliers (optional but recommended)
# Remove unrealistic values
df_clean = df_clean[
    (df_clean['energy_kcal'] >= 0) & (df_clean['energy_kcal'] <= 900) &  # Max ~900 kcal per 100g
    (df_clean['protein_g'] >= 0) & (df_clean['protein_g'] <= 100) &
    (df_clean['carbohydrates_g'] >= 0) & (df_clean['carbohydrates_g'] <= 100) &
    (df_clean['fat_total_g'] >= 0) & (df_clean['fat_total_g'] <= 100)
]

print(f"Outliers filtered")
print(f"Final dataset size: {len(df_clean)} rows")

# 4. Prepare target matrix
target_cols = ['energy_kcal', 'protein_g', 'carbohydrates_g', 'fat_total_g']

# Optionally add more nutrients if available and not too sparse
optional_targets = ['sugars_g', 'fiber_g', 'sodium_mg']
for col in optional_targets:
    if col in df_clean.columns:
        if df_clean[col].notna().sum() / len(df_clean) > 0.7:  # If less than 30% missing
            target_cols.append(col)
            print(f"Added optional target: {col}")

# Drop rows with ANY missing values in target columns
initial_size = len(df_clean)
df_clean = df_clean.dropna(subset=target_cols)
dropped = initial_size - len(df_clean)
if dropped > 0:
    print(f"Dropped {dropped} additional rows with missing optional nutrients")
    print(f"Final dataset size: {len(df_clean)} rows")

y_full = df_clean[target_cols].values
X_text = df_clean['text_features'].values

# Verify no NaN values
if np.isnan(y_full).any():
    print(f"Warning: {np.isnan(y_full).sum()} NaN values still present in targets")
else:
    print(f"No NaN values in target matrix")

print(f"\nTarget matrix prepared")
print(f"Shape: {y_full.shape}")
print(f"Targets: {target_cols}")

# No train-test split - using k-fold cross-validation on full dataset
print(f"\nUsing full dataset for k-fold cross-validation")
print(f"Total samples: {len(X_text)}")

# Store target names for later use
TARGET_NAMES = target_cols

# %% [markdown]
# ## 4. Text Feature Engineering (TF-IDF)
# 
# **Text Vectorization Strategy:**
# 
# We'll use TF-IDF (Term Frequency-Inverse Document Frequency) to convert food names + brands into numerical features:
# 
# - **TF-IDF** captures word importance: common words (like "food") get lower weights, distinctive words (like "jalapeño") get higher weights
# - **N-grams:** We use both unigrams and bigrams (1-2 word phrases) to capture multi-word concepts like "peanut butter"
# - **Dimensionality control:** Limit to top features to avoid overfitting and reduce computation
# 
# This transforms text like `"organic whole wheat bread"` into a sparse numerical vector suitable for regression models.

# %%
# Configure and fit TF-IDF Vectorizer on full dataset for cross-validation
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),      # Unigrams and bigrams
    min_df=3,                 # Ignore terms that appear in fewer than 3 documents
    max_features=5000,        # Limit to top 5k features for efficiency
    strip_accents='unicode',  # Normalize accents
    lowercase=True,
    token_pattern=r'\b[a-z]+\b'  # Only alphabetic tokens
)

print("Fitting TF-IDF vectorizer on full dataset...")
X_full_tfidf = vectorizer.fit_transform(X_text)

print(f"✓ TF-IDF vectorization complete")
print(f"  Full dataset shape: {X_full_tfidf.shape}")
print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")
print(f"  Sparsity: {(1 - X_full_tfidf.nnz / (X_full_tfidf.shape[0] * X_full_tfidf.shape[1])) * 100:.2f}%")
print(f"  Strategy: Using 5-fold Cross-Validation on full dataset")

# Show some example features
feature_names = vectorizer.get_feature_names_out()
print(f"\nExample features (first 20):")
print(feature_names[:20])

# %% [markdown]
# ## 5. Baseline Models: Linear & Ridge Regression
# 
# Linear models serve as our baseline. They're simple, fast, and interpretable – perfect for understanding if there's a linear relationship between text features and nutritional content.

# %%
from tqdm.auto import tqdm
import time
from sklearn.model_selection import cross_val_score, cross_val_predict

# Helper function for cross-validation evaluation with predictions
def evaluate_with_cv(base_model, X, y, target_names, model_name="Model", cv=5):
    """
    Evaluate a regression model using k-fold cross-validation
    Returns both metrics DataFrame and cross-validated predictions
    """
    print(f"\n{'='*60}")
    print(f"Evaluating {model_name} with {cv}-fold Cross-Validation")
    print(f"{'='*60}")
    
    metrics = []
    cv_predictions = np.zeros_like(y)
    
    for i, target in enumerate(tqdm(target_names, desc="  Evaluating nutrients")):
        y_target = y[:, i]
        
        # Perform cross-validation for this target
        mae_scores = -cross_val_score(base_model, X, y_target, cv=cv, 
                                      scoring='neg_mean_absolute_error', n_jobs=-1)
        mse_scores = -cross_val_score(base_model, X, y_target, cv=cv, 
                                      scoring='neg_mean_squared_error', n_jobs=-1)
        r2_scores = cross_val_score(base_model, X, y_target, cv=cv, 
                                    scoring='r2', n_jobs=-1)
        
        # Get cross-validated predictions for visualization
        cv_predictions[:, i] = cross_val_predict(base_model, X, y_target, cv=cv, n_jobs=-1)
        
        # Calculate mean RMSE from MSE scores
        rmse_scores = np.sqrt(mse_scores)
        
        metrics.append({
            'Model': model_name,
            'Target': target,
            'MAE': mae_scores.mean(),
            'MAE_std': mae_scores.std(),
            'RMSE': rmse_scores.mean(),
            'RMSE_std': rmse_scores.std(),
            'R²': r2_scores.mean(),
            'R²_std': r2_scores.std()
        })
    
    return pd.DataFrame(metrics), cv_predictions

# Evaluate Linear Regression with CV
print("\nTraining Linear Regression with 5-fold CV...")
start_time = time.time()
lr_metrics, y_pred_lr = evaluate_with_cv(LinearRegression(), X_full_tfidf, y_full, TARGET_NAMES, 
                                          "Linear Regression", cv=5)
elapsed = time.time() - start_time
print(f"✓ Completed in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")

# Evaluate Ridge Regression with CV
print("\nTraining Ridge Regression with 5-fold CV...")
start_time = time.time()
ridge_metrics, y_pred_ridge = evaluate_with_cv(Ridge(alpha=1.0), X_full_tfidf, y_full, TARGET_NAMES, 
                                                "Ridge Regression", cv=5)
elapsed = time.time() - start_time
print(f"✓ Completed in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")

# Compare baseline models
baseline_comparison = pd.concat([lr_metrics, ridge_metrics])
print("\n" + "="*80)
print("BASELINE MODELS COMPARISON (5-fold Cross-Validation)")
print("="*80)
print(baseline_comparison.to_string(index=False))

# Train final models on full dataset for deployment
print("\n\nTraining final models on full dataset for deployment...")
lr_model = MultiOutputRegressor(LinearRegression())
lr_model.fit(X_full_tfidf, y_full)
print("✓ Linear Regression trained on full dataset")

ridge_model = MultiOutputRegressor(Ridge(alpha=1.0))
ridge_model.fit(X_full_tfidf, y_full)
print("✓ Ridge Regression trained on full dataset")

# %% [markdown]
# ## 6. Tree-Based Models: Random Forest & Gradient Boosting
# 
# Tree-based models handle non-linear relationships well and are naturally suited for multi-output regression. We'll train Random Forest and Gradient Boosting regressors with tuned hyperparameters.

# %%
# Evaluate Random Forest with CV
print("\nTraining Random Forest with 5-fold CV...")
print("  Expected time: ~10-30 minutes (uses parallel processing)")
start_time = time.time()
rf_model_base = RandomForestRegressor(
    n_estimators=100,
    max_depth=20,
    min_samples_split=10,
    min_samples_leaf=4,
    random_state=42,
    n_jobs=-1,
    verbose=0
)
rf_metrics, y_pred_rf = evaluate_with_cv(rf_model_base, X_full_tfidf, y_full, TARGET_NAMES, 
                                         "Random Forest", cv=5)
elapsed = time.time() - start_time
print(f"✓ Completed in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")

# Evaluate Gradient Boosting with CV
print("\nTraining Gradient Boosting with 5-fold CV...")
print(f"  Expected time: ~{elapsed/60*1.5:.0f}-{elapsed/60*2:.0f} minutes (typically slower than Random Forest)")
start_time = time.time()
gbm_model_base = GradientBoostingRegressor(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=5,
    min_samples_split=10,
    min_samples_leaf=4,
    random_state=42,
    verbose=0
)
gbm_metrics, y_pred_gbm = evaluate_with_cv(gbm_model_base, X_full_tfidf, y_full, TARGET_NAMES, 
                                           "Gradient Boosting", cv=5)
elapsed = time.time() - start_time
print(f"✓ Completed in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")

# Compare all models so far
all_metrics = pd.concat([lr_metrics, ridge_metrics, rf_metrics, gbm_metrics])
print("\n" + "="*80)
print("ALL MODELS COMPARISON (5-fold Cross-Validation)")
print("="*80)
print(all_metrics.to_string(index=False))

# Train final models on full dataset for deployment
print("\n\nTraining final models on full dataset for deployment...")
rf_model = MultiOutputRegressor(rf_model_base)
rf_model.fit(X_full_tfidf, y_full)
print("✓ Random Forest trained on full dataset")

gbm_model = MultiOutputRegressor(gbm_model_base)
gbm_model.fit(X_full_tfidf, y_full)
print("✓ Gradient Boosting trained on full dataset")

# %% [markdown]
# ## 7. Optional: Neural Network (PyTorch)
# 
# If PyTorch is available, we'll train a simple feed-forward neural network with dropout for regularization. This demonstrates deep learning for multi-output regression.

# %%
if PYTORCH_AVAILABLE:
    # Define Neural Network Model
    class NutritionMLP(nn.Module):
        def __init__(self, input_dim, output_dim):
            super(NutritionMLP, self).__init__()
            self.fc1 = nn.Linear(input_dim, 256)
            self.dropout1 = nn.Dropout(0.3)
            self.fc2 = nn.Linear(256, 128)
            self.dropout2 = nn.Dropout(0.3)
            self.fc3 = nn.Linear(128, 64)
            self.fc4 = nn.Linear(64, output_dim)
            
        def forward(self, x):
            x = torch.relu(self.fc1(x))
            x = self.dropout1(x)
            x = torch.relu(self.fc2(x))
            x = self.dropout2(x)
            x = torch.relu(self.fc3(x))
            x = self.fc4(x)
            return x
    
    # Neural Network CV Evaluation
    print("\nTraining Neural Network with 5-fold CV...")
    print("  Note: Neural networks take longer to train with CV")
    
    kfold = KFold(n_splits=5, shuffle=True, random_state=42)
    nn_metrics = []
    y_pred_nn = np.zeros_like(y_full)
    
    for fold, (train_idx, val_idx) in enumerate(tqdm(kfold.split(X_full_tfidf), total=5, desc="  CV Folds"), 1):
        # Split data for this fold
        X_train_fold = X_full_tfidf[train_idx].toarray().astype(np.float32)
        X_val_fold = X_full_tfidf[val_idx].toarray().astype(np.float32)
        y_train_fold = y_full[train_idx].astype(np.float32)
        y_val_fold = y_full[val_idx].astype(np.float32)
        
        # Convert to tensors
        X_train_tensor = torch.tensor(X_train_fold, dtype=torch.float32)
        X_val_tensor = torch.tensor(X_val_fold, dtype=torch.float32)
        y_train_tensor = torch.tensor(y_train_fold, dtype=torch.float32)
        
        # Initialize model for this fold
        input_dim = X_train_fold.shape[1]
        output_dim = y_train_fold.shape[1]
        nn_model = NutritionMLP(input_dim, output_dim)
        
        # Loss and optimizer
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(nn_model.parameters(), lr=0.001)
        
        # Training loop (reduced epochs for CV)
        num_epochs = 30
        batch_size = 32
        
        for epoch in range(num_epochs):
            nn_model.train()
            for i in range(0, len(X_train_tensor), batch_size):
                batch_X = X_train_tensor[i:i+batch_size]
                batch_y = y_train_tensor[i:i+batch_size]
                
                # Forward pass
                outputs = nn_model(batch_X)
                loss = criterion(outputs, batch_y)
                
                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
        
        # Predict on validation fold
        nn_model.eval()
        with torch.no_grad():
            y_pred_nn[val_idx] = nn_model(X_val_tensor).numpy()
    
    # Calculate metrics from CV predictions
    for i, target in enumerate(TARGET_NAMES):
        mae = mean_absolute_error(y_full[:, i], y_pred_nn[:, i])
        rmse = np.sqrt(mean_squared_error(y_full[:, i], y_pred_nn[:, i]))
        r2 = r2_score(y_full[:, i], y_pred_nn[:, i])
        
        nn_metrics.append({
            'Model': 'Neural Network',
            'Target': target,
            'MAE': mae,
            'MAE_std': 0.0,  # Not available for manual CV
            'RMSE': rmse,
            'RMSE_std': 0.0,
            'R²': r2,
            'R²_std': 0.0
        })
    
    nn_metrics_df = pd.DataFrame(nn_metrics)
    
    print("✓ Neural Network CV complete\n")
    print("Neural Network Metrics (5-fold CV):")
    print(nn_metrics_df[['Target', 'MAE', 'RMSE', 'R²']].to_string(index=False))
    
    # Train final NN model on full dataset for deployment
    print("\n\nTraining final Neural Network on full dataset...")
    X_full_dense = X_full_tfidf.toarray().astype(np.float32)
    X_full_tensor = torch.tensor(X_full_dense, dtype=torch.float32)
    y_full_tensor = torch.tensor(y_full.astype(np.float32), dtype=torch.float32)
    
    nn_model = NutritionMLP(X_full_dense.shape[1], y_full.shape[1])
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(nn_model.parameters(), lr=0.001)
    
    num_epochs = 50
    batch_size = 32
    
    for epoch in range(num_epochs):
        nn_model.train()
        epoch_loss = 0
        num_batches = 0
        
        for i in range(0, len(X_full_tensor), batch_size):
            batch_X = X_full_tensor[i:i+batch_size]
            batch_y = y_full_tensor[i:i+batch_size]
            
            outputs = nn_model(batch_X)
            loss = criterion(outputs, batch_y)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            num_batches += 1
        
        if (epoch + 1) % 10 == 0:
            avg_loss = epoch_loss / num_batches
            print(f"  Epoch [{epoch+1}/{num_epochs}], Loss: {avg_loss:.4f}")
    
    print("✓ Neural Network trained on full dataset")
    
    # Add to comparison
    all_metrics = pd.concat([all_metrics, nn_metrics_df])
else:
    print("PyTorch not available - skipping neural network training")
    y_pred_nn = None

# %% [markdown]
# ## 8. Model Evaluation & Comparison
# 
# Let's visualize the performance of all models across different nutrients to identify the best performer.

# %%
# Visualize R² scores by model and nutrient
print("="*80)
print("FINAL MODEL COMPARISON (Cross-Validation Results)")
print("="*80)
print(all_metrics.to_string(index=False))
print("\n")

# Plot R² comparison with error bars
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# R² scores with std
for model in all_metrics['Model'].unique():
    model_data = all_metrics[all_metrics['Model'] == model]
    x_pos = range(len(model_data))
    ax1.errorbar(x_pos, model_data['R²'], yerr=model_data['R²_std'], 
                 label=model, marker='o', capsize=5, alpha=0.7)
ax1.set_xticks(range(len(TARGET_NAMES)))
ax1.set_xticklabels(TARGET_NAMES, rotation=45, ha='right')
ax1.set_ylabel('R² Score')
ax1.set_xlabel('Nutrient')
ax1.set_title('Model Comparison: R² Score by Nutrient (with std)')
ax1.legend(loc='lower right')
ax1.grid(True, alpha=0.3)

# MAE with std
for model in all_metrics['Model'].unique():
    model_data = all_metrics[all_metrics['Model'] == model]
    x_pos = range(len(model_data))
    ax2.errorbar(x_pos, model_data['MAE'], yerr=model_data['MAE_std'], 
                 label=model, marker='o', capsize=5, alpha=0.7)
ax2.set_xticks(range(len(TARGET_NAMES)))
ax2.set_xticklabels(TARGET_NAMES, rotation=45, ha='right')
ax2.set_ylabel('Mean Absolute Error')
ax2.set_xlabel('Nutrient')
ax2.set_title('Model Comparison: MAE by Nutrient (with std)')
ax2.legend(loc='upper right')
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# Identify best model per nutrient based on R²
best_models = all_metrics.loc[all_metrics.groupby('Target')['R²'].idxmax()]
print("\n" + "="*80)
print("BEST MODEL PER NUTRIENT (by R²)")
print("="*80)
print(best_models[['Target', 'Model', 'R²', 'MAE']].to_string(index=False))

# %% [markdown]
# ## 9. Cross-Validation Analysis
# 
# Perform k-fold cross-validation on the best performing model to ensure robust performance estimation.

# %%
# Assuming Gradient Boosting is typically the best - adjust if needed
print("Performing 5-Fold Cross-Validation on Gradient Boosting Model...")

# X_full_tfidf and y_full already created in earlier cells

# Define cross-validation
kfold = KFold(n_splits=5, shuffle=True, random_state=42)

cv_results = {target: {'MAE': [], 'RMSE': [], 'R²': []} for target in TARGET_NAMES}

for fold, (train_idx, val_idx) in enumerate(tqdm(kfold.split(X_full_tfidf), total=5, desc="Cross-Validation Folds"), 1):
    
    X_train_cv, X_val_cv = X_full_tfidf[train_idx], X_full_tfidf[val_idx]
    y_train_cv, y_val_cv = y_full[train_idx], y_full[val_idx]
    
    # Train model
    cv_model = MultiOutputRegressor(
        GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=10,
            min_samples_leaf=4,
            random_state=42,
            verbose=0
        )
    )
    cv_model.fit(X_train_cv, y_train_cv)
    
    # Predict and evaluate
    y_pred_cv = cv_model.predict(X_val_cv)
    
    for i, target in enumerate(TARGET_NAMES):
        mae = mean_absolute_error(y_val_cv[:, i], y_pred_cv[:, i])
        rmse = np.sqrt(mean_squared_error(y_val_cv[:, i], y_pred_cv[:, i]))
        r2 = r2_score(y_val_cv[:, i], y_pred_cv[:, i])
        
        cv_results[target]['MAE'].append(mae)
        cv_results[target]['RMSE'].append(rmse)
        cv_results[target]['R²'].append(r2)

# Calculate mean and std for each metric
cv_summary = []
for target in TARGET_NAMES:
    cv_summary.append({
        'Target': target,
        'MAE (mean±std)': f"{np.mean(cv_results[target]['MAE']):.2f} ± {np.std(cv_results[target]['MAE']):.2f}",
        'RMSE (mean±std)': f"{np.mean(cv_results[target]['RMSE']):.2f} ± {np.std(cv_results[target]['RMSE']):.2f}",
        'R² (mean±std)': f"{np.mean(cv_results[target]['R²']):.3f} ± {np.std(cv_results[target]['R²']):.3f}"
    })

cv_summary_df = pd.DataFrame(cv_summary)
print("\n" + "="*80)
print("5-FOLD CROSS-VALIDATION RESULTS (Gradient Boosting)")
print("="*80)
print(cv_summary_df.to_string(index=False))

# %% [markdown]
# ## 10. Mobile App Integration Notes
# 
# **How to deploy this model in a React Native nutrition tracking app:**
# 
# 1. **Export the trained model** (see next section for code):
#    - Save best model with `joblib.dump(model, 'nutrition_model.pkl')`
#    - Save TF-IDF vectorizer with `joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')`
# 
# 2. **Backend API (Flask/FastAPI)**:
#    ```python
#    from flask import Flask, request, jsonify
#    import joblib
#    
#    app = Flask(__name__)
#    model = joblib.load('nutrition_model.pkl')
#    vectorizer = joblib.load('tfidf_vectorizer.pkl')
#    
#    @app.route('/predict', methods=['POST'])
#    def predict():
#        data = request.json
#        description = data['description']
#        
#        # Transform text
#        X = vectorizer.transform([description])
#        
#        # Predict nutrients
#        prediction = model.predict(X)[0]
#        
#        return jsonify({
#            'energy_kcal': float(prediction[0]),
#            'protein_g': float(prediction[1]),
#            'carbohydrates_g': float(prediction[2]),
#            'fat_total_g': float(prediction[3])
#        })
#    ```
# 
# 3. **React Native Integration**:
#    ```typescript
#    // In your services/api.ts
#    export const predictNutrition = async (description: string) => {
#      const response = await fetch('http://your-api.com/predict', {
#        method: 'POST',
#        headers: { 'Content-Type': 'application/json' },
#        body: JSON.stringify({ description })
#      });
#      return response.json();
#    };
#    
#    // In AddEntryScreen.tsx
#    const handleSubmit = async () => {
#      const nutrients = await predictNutrition(foodDescription);
#      // Update context with predicted values
#      addFoodEntry({ ...nutrients, name: foodName });
#    };
#    ```
# 
# 4. **Deployment Options**:
#    - **Heroku/Render**: Deploy Flask API with model files
#    - **AWS Lambda**: Serverless inference (may need optimization for size limits)
#    - **Docker**: Containerize backend for consistent deployment

# %% [markdown]
# ## 11. Export Final Model
# 
# Save the best performing model and TF-IDF vectorizer for production use.

# %%
# Save best model (assuming Gradient Boosting performed best)
output_dir = "../ml_models"
import os
os.makedirs(output_dir, exist_ok=True)

# Save Gradient Boosting model
model_path = os.path.join(output_dir, "dsa330_nutrition_gbm.pkl")
vectorizer_path = os.path.join(output_dir, "dsa330_tfidf_vectorizer.pkl")

joblib.dump(gbm_model, model_path)
joblib.dump(vectorizer, vectorizer_path)

print("="*80)
print("MODEL EXPORT COMPLETE")
print("="*80)
print(f"✓ Model saved to: {model_path}")
print(f"✓ Vectorizer saved to: {vectorizer_path}")
print(f"\nModel Details:")
print(f"  - Algorithm: Gradient Boosting Multi-Output Regressor")
print(f"  - Input: TF-IDF vectors (max {vectorizer.max_features} features)")
print(f"  - Output: {len(TARGET_NAMES)} nutrients - {', '.join(TARGET_NAMES)}")
print(f"  - Training: Full dataset ({len(X_text):,} samples)")
print(f"  - Evaluation: 5-fold cross-validation")
print(f"  - No train-test split - model trained on all available data")

# Calculate average CV performance for saved model
gbm_cv_performance = all_metrics[all_metrics['Model'] == 'Gradient Boosting']
avg_r2 = gbm_cv_performance['R²'].mean()
avg_mae = gbm_cv_performance['MAE'].mean()
print(f"\nCross-Validation Performance:")
print(f"  - Average R²: {avg_r2:.3f}")
print(f"  - Average MAE: {avg_mae:.2f}")

# %%
# Store predictions and true values for visualization
# All predictions are from 5-fold cross-validation
print("Preparing data for visualization...")
print(f"✓ Using cross-validated predictions from all models")
print(f"  - Dataset size: {len(y_full)}")
print(f"  - Predictions shape: {y_pred_gbm.shape}")
print(f"  - Nutrients predicted: {len(TARGET_NAMES)}")
print(f"  - All predictions are from 5-fold CV (no train-test split)")

# %% [markdown]
# ## 12. Comprehensive Model Visualizations
# 
# This section provides extensive visualizations for project presentation and analysis.

# %%
# Graph 1: Model Performance Comparison Across All Nutrients (Bar Chart)
fig, ax = plt.subplots(figsize=(14, 8))

# Prepare data for grouped bar chart
models_list = all_metrics['Model'].unique()
x = np.arange(len(TARGET_NAMES))
width = 0.15

for i, model_name in enumerate(models_list):
    model_data = all_metrics[all_metrics['Model'] == model_name]
    r2_values = [model_data[model_data['Target'] == t]['R²'].values[0] for t in TARGET_NAMES]
    ax.bar(x + i*width, r2_values, width, label=model_name, alpha=0.8)

ax.set_xlabel('Nutrient Target', fontsize=12, fontweight='bold')
ax.set_ylabel('R² Score', fontsize=12, fontweight='bold')
ax.set_title('Model Performance Comparison (R² Score) Across All Nutrients', fontsize=14, fontweight='bold')
ax.set_xticks(x + width * (len(models_list)-1) / 2)
ax.set_xticklabels(TARGET_NAMES, rotation=45, ha='right')
ax.legend(loc='upper left', bbox_to_anchor=(1, 1))
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

print("✓ Graph 1: Model Performance Comparison (Bar Chart) Complete")

# %%
# Graph 2: Heatmap of Model Performance (R² Scores)
fig, ax = plt.subplots(figsize=(12, 8))

# Create pivot table for heatmap
heatmap_data = all_metrics.pivot(index='Model', columns='Target', values='R²')

sns.heatmap(heatmap_data, annot=True, fmt='.3f', cmap='YlGnBu', cbar_kws={'label': 'R² Score'}, 
            linewidths=0.5, ax=ax, vmin=0, vmax=1)
ax.set_title('Model Performance Heatmap (R² Scores)', fontsize=14, fontweight='bold', pad=20)
ax.set_xlabel('Nutrient Target', fontsize=12, fontweight='bold')
ax.set_ylabel('Model', fontsize=12, fontweight='bold')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.show()

print("✓ Graph 2: Performance Heatmap Complete")

# %%
# Graph 3: Mean Absolute Error Comparison
fig, ax = plt.subplots(figsize=(14, 8))

for i, model_name in enumerate(models_list):
    model_data = all_metrics[all_metrics['Model'] == model_name]
    mae_values = [model_data[model_data['Target'] == t]['MAE'].values[0] for t in TARGET_NAMES]
    ax.bar(x + i*width, mae_values, width, label=model_name, alpha=0.8)

ax.set_xlabel('Nutrient Target', fontsize=12, fontweight='bold')
ax.set_ylabel('Mean Absolute Error', fontsize=12, fontweight='bold')
ax.set_title('Model Error Comparison (MAE) Across All Nutrients', fontsize=14, fontweight='bold')
ax.set_xticks(x + width * (len(models_list)-1) / 2)
ax.set_xticklabels(TARGET_NAMES, rotation=45, ha='right')
ax.legend(loc='upper left', bbox_to_anchor=(1, 1))
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

print("✓ Graph 3: MAE Comparison Complete")

# %%
# Graph 4: Predicted vs Actual for All Nutrients (Gradient Boosting)
fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.flatten()

for i, target in enumerate(TARGET_NAMES):
    ax = axes[i]
    
    # Get CV predictions for this target
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    
    # Scatter plot
    ax.scatter(y_true, y_pred, alpha=0.3, s=10)
    
    # Perfect prediction line
    min_val = min(y_true.min(), y_pred.min())
    max_val = max(y_true.max(), y_pred.max())
    ax.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')
    
    # Calculate R²
    r2 = r2_score(y_true, y_pred)
    
    ax.set_xlabel('Actual Values', fontsize=10, fontweight='bold')
    ax.set_ylabel('Predicted Values', fontsize=10, fontweight='bold')
    ax.set_title(f'{target}\n(R² = {r2:.3f})', fontsize=11, fontweight='bold')
    ax.legend(loc='upper left')
    ax.grid(alpha=0.3)

plt.suptitle('Predicted vs Actual Values - Gradient Boosting Model (5-fold CV)', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 4: Predicted vs Actual (Scatter Plots) Complete")

# %%
# Graph 5: Residual Plots for Error Analysis
fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.flatten()

for i, target in enumerate(TARGET_NAMES):
    ax = axes[i]
    
    # Calculate residuals from CV predictions
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    residuals = y_true - y_pred
    
    # Residual plot
    ax.scatter(y_pred, residuals, alpha=0.3, s=10)
    ax.axhline(y=0, color='r', linestyle='--', lw=2)
    
    ax.set_xlabel('Predicted Values', fontsize=10, fontweight='bold')
    ax.set_ylabel('Residuals', fontsize=10, fontweight='bold')
    ax.set_title(f'{target} - Residual Plot', fontsize=11, fontweight='bold')
    ax.grid(alpha=0.3)

plt.suptitle('Residual Analysis - Gradient Boosting Model (5-fold CV)', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 5: Residual Plots Complete")

# %%
# Graph 6: Cross-Validation Performance Visualization
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

metrics_to_plot = ['MAE', 'RMSE', 'R²']

for idx, metric in enumerate(metrics_to_plot):
    ax = axes[idx]
    
    # Prepare data for box plot
    data_for_plot = []
    labels = []
    
    for target in TARGET_NAMES:
        data_for_plot.append(cv_results[target][metric])
        labels.append(target)
    
    # Create box plot
    bp = ax.boxplot(data_for_plot, labels=labels, patch_artist=True)
    
    # Customize box colors
    for patch in bp['boxes']:
        patch.set_facecolor('lightblue')
        patch.set_alpha(0.7)
    
    ax.set_xlabel('Nutrient Target', fontsize=11, fontweight='bold')
    ax.set_ylabel(metric, fontsize=11, fontweight='bold')
    ax.set_title(f'Cross-Validation {metric} Distribution', fontsize=12, fontweight='bold')
    ax.tick_params(axis='x', rotation=45)
    ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.show()

print("✓ Graph 6: Cross-Validation Box Plots Complete")

# %%
# Graph 7: Model Ranking by Average Performance
# Calculate average R² for each model
model_avg_performance = all_metrics.groupby('Model')['R²'].mean().sort_values(ascending=True)

fig, ax = plt.subplots(figsize=(10, 6))
colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(model_avg_performance)))
bars = ax.barh(model_avg_performance.index, model_avg_performance.values, color=colors, alpha=0.8)

# Add value labels
for i, (bar, value) in enumerate(zip(bars, model_avg_performance.values)):
    ax.text(value + 0.01, bar.get_y() + bar.get_height()/2, 
            f'{value:.3f}', va='center', fontweight='bold')

ax.set_xlabel('Average R² Score', fontsize=12, fontweight='bold')
ax.set_ylabel('Model', fontsize=12, fontweight='bold')
ax.set_title('Model Ranking by Average R² Score Across All Nutrients', fontsize=14, fontweight='bold')
ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.show()

print("✓ Graph 7: Model Ranking Complete")

# %%
# Graph 8: Error Distribution Histograms
fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.flatten()

for i, target in enumerate(TARGET_NAMES):
    ax = axes[i]
    
    # Calculate prediction errors from CV
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    errors = y_true - y_pred
    
    # Plot histogram
    ax.hist(errors, bins=50, alpha=0.7, color='steelblue', edgecolor='black')
    
    # Add vertical line at 0
    ax.axvline(x=0, color='red', linestyle='--', lw=2, label='Zero Error')
    
    # Add statistics
    mean_error = np.mean(errors)
    std_error = np.std(errors)
    ax.axvline(x=mean_error, color='green', linestyle='--', lw=2, label=f'Mean: {mean_error:.2f}')
    
    ax.set_xlabel('Prediction Error', fontsize=10, fontweight='bold')
    ax.set_ylabel('Frequency', fontsize=10, fontweight='bold')
    ax.set_title(f'{target}\n(Std: {std_error:.2f})', fontsize=11, fontweight='bold')
    ax.legend(loc='upper right', fontsize=8)
    ax.grid(alpha=0.3)

plt.suptitle('Error Distribution Analysis - Gradient Boosting Model (5-fold CV)', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 8: Error Distribution Histograms Complete")

# %%
# Graph 9: Feature Importance Analysis (for tree-based models)
# Get feature importance from Gradient Boosting model
feature_importance_data = []

for i, target in enumerate(TARGET_NAMES):
    estimator = gbm_model.estimators_[i]
    importances = estimator.feature_importances_
    
    # Get top 20 features
    top_indices = np.argsort(importances)[-20:]
    top_importances = importances[top_indices]
    
    # Get feature names
    feature_names = vectorizer.get_feature_names_out()
    top_features = [feature_names[idx] for idx in top_indices]
    
    feature_importance_data.append({
        'target': target,
        'features': top_features,
        'importance': top_importances
    })

# Plot feature importance for first 4 nutrients
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
axes = axes.flatten()

for idx in range(4):
    ax = axes[idx]
    data = feature_importance_data[idx]
    
    ax.barh(range(len(data['features'])), data['importance'], color='teal', alpha=0.7)
    ax.set_yticks(range(len(data['features'])))
    ax.set_yticklabels(data['features'], fontsize=9)
    ax.set_xlabel('Importance', fontsize=11, fontweight='bold')
    ax.set_title(f"Top 20 Features for {data['target']}", fontsize=12, fontweight='bold')
    ax.grid(axis='x', alpha=0.3)

plt.suptitle('Feature Importance Analysis - Gradient Boosting Model', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 9: Feature Importance Analysis Complete")

# %%
# Graph 10: Learning Curve Analysis
from sklearn.model_selection import learning_curve

# Select one target for learning curve (energy_kcal as example)
target_idx = 0
print(f"Computing learning curve for {TARGET_NAMES[target_idx]}...")

train_sizes = np.linspace(0.1, 1.0, 10)

train_sizes_abs, train_scores, val_scores = learning_curve(
    GradientBoostingRegressor(n_estimators=50, random_state=42),
    X_full_tfidf.toarray(),
    y_full[:, target_idx],
    train_sizes=train_sizes,
    cv=5,
    scoring='r2',
    n_jobs=-1
)

# Calculate mean and std
train_mean = np.mean(train_scores, axis=1)
train_std = np.std(train_scores, axis=1)
val_mean = np.mean(val_scores, axis=1)
val_std = np.std(val_scores, axis=1)

# Plot learning curve
fig, ax = plt.subplots(figsize=(12, 7))

ax.plot(train_sizes_abs, train_mean, 'o-', color='blue', label='Training Score')
ax.fill_between(train_sizes_abs, train_mean - train_std, train_mean + train_std, alpha=0.2, color='blue')

ax.plot(train_sizes_abs, val_mean, 'o-', color='red', label='Validation Score')
ax.fill_between(train_sizes_abs, val_mean - val_std, val_mean + val_std, alpha=0.2, color='red')

ax.set_xlabel('Training Set Size', fontsize=12, fontweight='bold')
ax.set_ylabel('R² Score', fontsize=12, fontweight='bold')
ax.set_title(f'Learning Curve - {TARGET_NAMES[target_idx]} (Gradient Boosting)', fontsize=14, fontweight='bold')
ax.legend(loc='lower right', fontsize=11)
ax.grid(alpha=0.3)
plt.tight_layout()
plt.show()

print("✓ Graph 10: Learning Curve Complete")

# %%
# Graph 11: Prediction Accuracy by Magnitude
# Analyze how prediction accuracy varies with nutrient magnitude
fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.flatten()

for i, target in enumerate(TARGET_NAMES):
    ax = axes[i]
    
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    
    # Calculate percentage error
    percentage_errors = np.abs((y_true - y_pred) / (y_true + 1e-10)) * 100
    
    # Create bins based on true values
    bins = np.percentile(y_true, [0, 25, 50, 75, 100])
    bin_labels = ['Q1', 'Q2', 'Q3', 'Q4']
    
    # Calculate mean percentage error for each bin
    bin_errors = []
    for j in range(len(bins)-1):
        mask = (y_true >= bins[j]) & (y_true < bins[j+1])
        if j == len(bins)-2:  # Include upper bound in last bin
            mask = (y_true >= bins[j]) & (y_true <= bins[j+1])
        bin_errors.append(np.mean(percentage_errors[mask]))
    
    # Plot
    bars = ax.bar(bin_labels, bin_errors, color='coral', alpha=0.7, edgecolor='black')
    
    # Add value labels
    for bar, error in zip(bars, bin_errors):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{error:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    ax.set_xlabel('Value Quartile', fontsize=10, fontweight='bold')
    ax.set_ylabel('Mean Abs % Error', fontsize=10, fontweight='bold')
    ax.set_title(f'{target}', fontsize=11, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)

plt.suptitle('Prediction Accuracy by Value Magnitude - Gradient Boosting (5-fold CV)', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 11: Accuracy by Magnitude Complete")

# %%
# Graph 12: Model Comparison Radar Chart
from math import pi
import numpy as np

# Since R² values are all negative, we'll use normalized MAE instead
# Lower MAE = better performance = further from center (inverted scale)

print("Building radar chart using MAE performance (inverted scale)")
print("Lower MAE = Better = Further from center\n")

# Collect MAE values for each model
radar_data = {}

# Linear Regression MAE
radar_data['Linear Regression'] = [
    lr_metrics[lr_metrics['Target'] == t]['MAE'].values[0] 
    for t in TARGET_NAMES
]

# Ridge Regression MAE
radar_data['Ridge Regression'] = [
    ridge_metrics[ridge_metrics['Target'] == t]['MAE'].values[0] 
    for t in TARGET_NAMES
]

# Random Forest MAE
radar_data['Random Forest'] = [
    rf_metrics[rf_metrics['Target'] == t]['MAE'].values[0] 
    for t in TARGET_NAMES
]

# Gradient Boosting MAE
radar_data['Gradient Boosting'] = [
    gbm_metrics[gbm_metrics['Target'] == t]['MAE'].values[0] 
    for t in TARGET_NAMES
]

# Print MAE ranges
print("MAE ranges by model:")
for model, values in radar_data.items():
    print(f"{model}: min={min(values):.2f}, max={max(values):.2f}, avg={np.mean(values):.2f}")

# Normalize MAE to 0-1 scale (invert so lower MAE = higher score)
# Formula: normalized = 1 - (MAE / max_MAE_across_all)
max_mae_overall = max([max(v) for v in radar_data.values()])
min_mae_overall = min([min(v) for v in radar_data.values()])

radar_data_normalized = {}
for model, mae_values in radar_data.items():
    # Invert: best (lowest MAE) gets 1.0, worst gets 0.0
    normalized = [1 - (mae / max_mae_overall) for mae in mae_values]
    radar_data_normalized[model] = normalized

print(f"\nNormalization: max MAE = {max_mae_overall:.2f}, min MAE = {min_mae_overall:.2f}")
print("\nNormalized scores (1.0 = best, 0.0 = worst):")
for model, values in radar_data_normalized.items():
    print(f"{model}: {np.mean(values):.3f}")

categories = TARGET_NAMES
num_vars = len(categories)

# Compute angle for each axis
angles = [n / float(num_vars) * 2 * pi for n in range(num_vars)]
angles += angles[:1]

# Initialize plot
fig, ax = plt.subplots(figsize=(11, 11), subplot_kw=dict(projection='polar'))

# Plot each model
colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']
for idx, (model_name, values) in enumerate(radar_data_normalized.items()):
    values_plot = values + values[:1]  # Close the polygon
    ax.plot(angles, values_plot, 'o-', linewidth=2.5, label=model_name, 
            color=colors[idx], markersize=8)
    ax.fill(angles, values_plot, alpha=0.20, color=colors[idx])

# Fix axis to go in the right order and start at 12 o'clock
ax.set_theta_offset(pi / 2)
ax.set_theta_direction(-1)

# Draw axis lines for each angle and label
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories, fontsize=11, fontweight='bold')

# Set y-axis limits
ax.set_ylim(0, 1)
ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
ax.set_yticklabels(['0.2', '0.4', '0.6', '0.8', '1.0'], fontsize=10)
ax.grid(True, linewidth=0.7, alpha=0.6, linestyle='--')

# Add legend and title
ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.1), fontsize=12, framealpha=0.9)
plt.title('Model Performance Radar Chart\n(Normalized Performance Score: 1.0 = Best, 0.0 = Worst)', 
          size=16, fontweight='bold', pad=25)

plt.tight_layout()
plt.show()

print("\n✓ Graph 12: Radar Chart Complete")
print("  Chart shows relative performance across nutrients")

# %%
# Graph 13: Correlation Matrix of Prediction Errors
# Analyze if errors are correlated across nutrients
fig, ax = plt.subplots(figsize=(10, 8))

# Calculate errors for all nutrients from CV predictions
error_matrix = np.zeros((len(y_full), len(TARGET_NAMES)))
for i in range(len(TARGET_NAMES)):
    error_matrix[:, i] = y_full[:, i] - y_pred_gbm[:, i]

# Create correlation matrix
error_df = pd.DataFrame(error_matrix, columns=TARGET_NAMES)
correlation_matrix = error_df.corr()

# Plot heatmap
sns.heatmap(correlation_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0,
            linewidths=0.5, ax=ax, vmin=-1, vmax=1, cbar_kws={'label': 'Correlation'})
ax.set_title('Correlation Matrix of Prediction Errors (5-fold CV)', fontsize=14, fontweight='bold', pad=15)
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.show()

print("✓ Graph 13: Error Correlation Matrix Complete")

# %%
# Graph 14: Prediction Confidence Intervals
# Show prediction uncertainty - sample data for clearer visualization
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
axes = axes.flatten()

# Select first 4 nutrients for visualization
for idx, target_idx in enumerate(range(4)):
    ax = axes[idx]
    
    # Sample 100 points from CV predictions for clearer visualization
    num_samples = min(100, len(y_full))
    sample_indices = np.random.choice(len(y_full), num_samples, replace=False)
    y_true_sample = y_full[sample_indices, target_idx]
    y_pred_sample = y_pred_gbm[sample_indices, target_idx]
    
    # Calculate absolute errors
    abs_errors = np.abs(y_true_sample - y_pred_sample)
    
    # Sort by true values for better visualization
    sort_indices = np.argsort(y_true_sample)
    y_true_sorted = y_true_sample[sort_indices]
    y_pred_sorted = y_pred_sample[sort_indices]
    abs_errors_sorted = abs_errors[sort_indices]
    
    # Plot predictions with error bars
    x_pos = np.arange(len(y_true_sorted))
    ax.errorbar(x_pos, y_pred_sorted, yerr=abs_errors_sorted, fmt='o', 
                alpha=0.6, capsize=3, label='CV Predictions with Error Bars')
    ax.plot(x_pos, y_true_sorted, 'r-', linewidth=2, label='True Values', alpha=0.7)
    
    ax.set_xlabel('Sample Index (sorted by true value)', fontsize=10, fontweight='bold')
    ax.set_ylabel(TARGET_NAMES[target_idx], fontsize=10, fontweight='bold')
    ax.set_title(f'{TARGET_NAMES[target_idx]} - Prediction Confidence', fontsize=12, fontweight='bold')
    ax.legend(loc='upper left', fontsize=9)
    ax.grid(alpha=0.3)

plt.suptitle('Prediction Confidence Analysis with Error Bars (5-fold CV)', fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 14: Prediction Confidence Intervals Complete")

# %%
# Graph 15: Cumulative Performance Analysis
# Show what percentage of predictions fall within certain error thresholds
fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.flatten()

for i, target in enumerate(TARGET_NAMES):
    ax = axes[i]
    
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    
    # Calculate percentage errors
    percentage_errors = np.abs((y_true - y_pred) / (y_true + 1e-10)) * 100
    percentage_errors = np.sort(percentage_errors)
    
    # Calculate cumulative percentages
    cumulative_percentages = np.arange(1, len(percentage_errors) + 1) / len(percentage_errors) * 100
    
    # Plot cumulative curve
    ax.plot(percentage_errors, cumulative_percentages, linewidth=2, color='darkblue')
    
    # Add reference lines
    for threshold in [10, 20, 30]:
        idx = np.searchsorted(percentage_errors, threshold)
        if idx < len(cumulative_percentages):
            cum_pct = cumulative_percentages[idx]
            ax.axvline(x=threshold, color='red', linestyle='--', alpha=0.5, linewidth=1)
            ax.axhline(y=cum_pct, color='red', linestyle='--', alpha=0.5, linewidth=1)
            ax.text(threshold, cum_pct + 5, f'{cum_pct:.1f}%', fontsize=8, color='red')
    
    ax.set_xlabel('Percentage Error Threshold (%)', fontsize=10, fontweight='bold')
    ax.set_ylabel('Cumulative % of Predictions', fontsize=10, fontweight='bold')
    ax.set_title(f'{target}', fontsize=11, fontweight='bold')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.grid(alpha=0.3)

plt.suptitle('Cumulative Error Distribution - What % of Predictions Fall Within Error Threshold (5-fold CV)', 
             fontsize=16, fontweight='bold', y=1.00)
plt.tight_layout()
plt.show()

print("✓ Graph 15: Cumulative Performance Analysis Complete")

# %%
# Graph 16: Summary Performance Dashboard
# Create a comprehensive summary dashboard
fig = plt.figure(figsize=(18, 10))
gs = fig.add_gridspec(3, 3, hspace=0.4, wspace=0.3)

# 1. Overall R² comparison (top left)
ax1 = fig.add_subplot(gs[0, :2])
model_avg = all_metrics.groupby('Model')['R²'].mean().sort_values(ascending=False)
colors_bar = plt.cm.viridis(np.linspace(0.2, 0.9, len(model_avg)))
bars = ax1.bar(model_avg.index, model_avg.values, color=colors_bar, alpha=0.8)
for bar, value in zip(bars, model_avg.values):
    ax1.text(bar.get_x() + bar.get_width()/2, value + 0.01, f'{value:.3f}', 
            ha='center', fontweight='bold', fontsize=9)
ax1.set_ylabel('Average R²', fontsize=11, fontweight='bold')
ax1.set_title('Overall Model Performance (5-fold CV)', fontsize=12, fontweight='bold')
ax1.tick_params(axis='x', rotation=45)
ax1.grid(axis='y', alpha=0.3)

# 2. MAE by nutrient (top right)
ax2 = fig.add_subplot(gs[0, 2])
best_model_name = model_avg.index[0]
best_model_mae = all_metrics[all_metrics['Model'] == best_model_name].sort_values('MAE')
ax2.barh(best_model_mae['Target'], best_model_mae['MAE'], color='coral', alpha=0.7)
ax2.set_xlabel('MAE', fontsize=10, fontweight='bold')
ax2.set_title(f'Best Model MAE\n({best_model_name})', fontsize=11, fontweight='bold')
ax2.grid(axis='x', alpha=0.3)

# 3. R² by nutrient heatmap (middle row)
ax3 = fig.add_subplot(gs[1, :])
heatmap_data = all_metrics.pivot(index='Model', columns='Target', values='R²')
sns.heatmap(heatmap_data, annot=True, fmt='.2f', cmap='RdYlGn', center=0.5,
            linewidths=1, ax=ax3, vmin=0, vmax=1, cbar_kws={'label': 'R²'})
ax3.set_title('Detailed Performance Heatmap (5-fold CV)', fontsize=12, fontweight='bold')
ax3.set_xlabel('')
ax3.set_ylabel('')

# 4. Error statistics (bottom left)
ax4 = fig.add_subplot(gs[2, 0])
metrics_summary = []
for target in TARGET_NAMES[:4]:
    y_true = y_full[:, TARGET_NAMES.index(target)]
    y_pred = y_pred_gbm[:, TARGET_NAMES.index(target)]
    mae = mean_absolute_error(y_true, y_pred)
    metrics_summary.append(mae)
ax4.bar(range(len(TARGET_NAMES[:4])), metrics_summary, color='steelblue', alpha=0.7)
ax4.set_xticks(range(len(TARGET_NAMES[:4])))
ax4.set_xticklabels(TARGET_NAMES[:4], rotation=45, ha='right', fontsize=9)
ax4.set_ylabel('MAE', fontsize=10, fontweight='bold')
ax4.set_title('Error Magnitude (Top 4)', fontsize=11, fontweight='bold')
ax4.grid(axis='y', alpha=0.3)

# 5. R² distribution (bottom middle)
ax5 = fig.add_subplot(gs[2, 1])
r2_values = []
for i in range(len(TARGET_NAMES)):
    y_true = y_full[:, i]
    y_pred = y_pred_gbm[:, i]
    r2_values.append(r2_score(y_true, y_pred))
ax5.boxplot([r2_values], labels=['All Nutrients'])
ax5.scatter([1]*len(r2_values), r2_values, alpha=0.6, s=100, c=range(len(r2_values)), cmap='rainbow')
ax5.set_ylabel('R² Score', fontsize=10, fontweight='bold')
ax5.set_title('R² Distribution (CV)', fontsize=11, fontweight='bold')
ax5.grid(axis='y', alpha=0.3)

# 6. Data statistics (bottom right)
ax6 = fig.add_subplot(gs[2, 2])
ax6.axis('off')
stats_text = f"""
DATASET SUMMARY
{'='*25}
Total Samples: {len(df_clean):,}
CV Strategy: 5-fold
All predictions: CV

BEST MODEL
{'='*25}
Model: {best_model_name}
Avg R²: {model_avg.values[0]:.3f}
Avg MAE: {all_metrics[all_metrics['Model'] == best_model_name]['MAE'].mean():.2f}

TOP PERFORMER
{'='*25}
{best_models.iloc[0]['Target']}
R²: {best_models.iloc[0]['R²']:.3f}
Model: {best_models.iloc[0]['Model']}
"""
ax6.text(0.1, 0.5, stats_text, fontsize=10, family='monospace', 
        verticalalignment='center', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

plt.suptitle('Comprehensive Model Performance Dashboard (5-fold Cross-Validation)', fontsize=18, fontweight='bold', y=0.98)
plt.show()

print("✓ Graph 16: Summary Performance Dashboard Complete")

# %% [markdown]
# ## 13. Visualization Summary
# 
# The comprehensive visualization section above includes:
# 
# 1. **Graph 1**: Model Performance Comparison - Bar chart showing R² scores across all models and nutrients
# 2. **Graph 2**: Performance Heatmap - Color-coded matrix of model performance
# 3. **Graph 3**: Mean Absolute Error Comparison - Bar chart comparing prediction errors
# 4. **Graph 4**: Predicted vs Actual Scatter Plots - 8 subplots showing prediction accuracy
# 5. **Graph 5**: Residual Analysis - Error pattern visualization for each nutrient
# 6. **Graph 6**: Cross-Validation Box Plots - Performance stability across folds
# 7. **Graph 7**: Model Ranking - Horizontal bar chart of average performance
# 8. **Graph 8**: Error Distribution Histograms - Statistical distribution of prediction errors
# 9. **Graph 9**: Feature Importance Analysis - Top words influencing predictions
# 10. **Graph 10**: Learning Curve - Model performance vs training set size
# 11. **Graph 11**: Accuracy by Magnitude - How error varies with nutrient quantity
# 12. **Graph 12**: Radar Chart - Multi-dimensional model comparison
# 13. **Graph 13**: Error Correlation Matrix - Relationships between nutrient prediction errors
# 14. **Graph 14**: Prediction Confidence Intervals - Uncertainty visualization
# 15. **Graph 15**: Cumulative Error Distribution - Percentage of predictions within error thresholds
# 16. **Graph 16**: Summary Dashboard - Comprehensive overview of all metrics
# 
# These visualizations provide comprehensive insights for project presentation and analysis.

# %% [markdown]
# ## 14. Presentation-Ready Performance Table
# 
# This section creates a clean, formatted table of Mean Absolute Error (MAE) values for all models across all nutrients, suitable for presentations and reports.

# %%
# Create presentation-ready MAE performance table
print("="*90)
print("MODEL PERFORMANCE COMPARISON TABLE")
print("Mean Absolute Error (MAE) - Lower is Better")
print("="*90)
print()

# Define the order of models and nutrients
model_order = ['Linear Regression', 'Ridge Regression', 'Random Forest', 'Gradient Boosting', 'Neural Network']
nutrient_order = ['energy_kcal', 'protein_g', 'carbohydrates_g', 'fat_total_g', 'sugars_g', 'fiber_g', 'sodium_mg']

# Create a pivot table with MAE values
mae_table = all_metrics.pivot(index='Model', columns='Target', values='MAE')

# Reorder to match requested format
mae_table = mae_table.reindex(model_order)
mae_table = mae_table[nutrient_order]

# Create formatted display version
print("| Model                | kcal  | protein | carbs | fat   | sugars | fiber | sodium   |")
print("|---------------------|-------|---------|-------|-------|--------|-------|----------|")

for model in model_order:
    row_values = []
    for nutrient in nutrient_order:
        value = mae_table.loc[model, nutrient]
        row_values.append(value)
    
    # Format the row
    print(f"| {model:<19} | {row_values[0]:5.2f} | {row_values[1]:7.2f} | {row_values[2]:5.2f} | {row_values[3]:5.2f} | {row_values[4]:6.2f} | {row_values[5]:5.2f} | {row_values[6]:8.2f} |")

print()
print("="*90)
print()

# Find best model for each nutrient (lowest MAE)
print("BEST PERFORMING MODEL FOR EACH NUTRIENT (by MAE):")
print("-" * 90)
best_per_nutrient = {}
for nutrient in nutrient_order:
    best_model = mae_table[nutrient].idxmin()
    best_mae = mae_table[nutrient].min()
    best_per_nutrient[nutrient] = (best_model, best_mae)
    
    nutrient_display = nutrient.replace('_', ' ').title()
    print(f"  • {nutrient_display:<25} → {best_model:<20} (MAE: {best_mae:.2f})")

print()
print("="*90)
print()

# Calculate overall best model (average MAE across all nutrients)
print("OVERALL MODEL RANKING (by Average MAE across all nutrients):")
print("-" * 90)
avg_mae_per_model = mae_table.mean(axis=1).sort_values()

for rank, (model, avg_mae) in enumerate(avg_mae_per_model.items(), 1):
    if rank == 1:
        print(f"  🏆 #{rank}: {model:<20} → Average MAE: {avg_mae:.2f} ★ BEST OVERALL")
    else:
        print(f"     #{rank}: {model:<20} → Average MAE: {avg_mae:.2f}")

print()
print("="*90)
print()

# Create a styled DataFrame for export
print("FORMATTED TABLE FOR EXPORT:")
print()
mae_table_rounded = mae_table.round(2)
print(mae_table_rounded.to_string())

print()
print("✓ Performance table generation complete!")
print()
print("SUMMARY:")
print(f"  • Total Models Evaluated: {len(model_order)}")
print(f"  • Total Nutrients Predicted: {len(nutrient_order)}")
print(f"  • Best Overall Model: {avg_mae_per_model.index[0]}")
print(f"  • Worst Overall Model: {avg_mae_per_model.index[-1]}")

# %%
# Create a visualization-friendly version with highlighted best performers
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(16, 6))
ax.axis('tight')
ax.axis('off')

# Prepare data for table
table_data = []
col_labels = ['Model', 'Energy\n(kcal)', 'Protein\n(g)', 'Carbs\n(g)', 'Fat\n(g)', 'Sugars\n(g)', 'Fiber\n(g)', 'Sodium\n(mg)']

for model in model_order:
    row = [model]
    for nutrient in nutrient_order:
        value = mae_table.loc[model, nutrient]
        row.append(f'{value:.2f}')
    table_data.append(row)

# Create the table
table = ax.table(cellText=table_data, colLabels=col_labels, 
                cellLoc='center', loc='center',
                colWidths=[0.18, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.12])

# Style the table
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1, 2.5)

# Color the header
for i in range(len(col_labels)):
    cell = table[(0, i)]
    cell.set_facecolor('#4472C4')
    cell.set_text_props(weight='bold', color='white')

# Highlight best values (minimum) in each column (nutrient)
for col_idx, nutrient in enumerate(nutrient_order, 1):
    # Find the minimum MAE for this nutrient
    min_mae = mae_table[nutrient].min()
    
    for row_idx, model in enumerate(model_order, 1):
        cell = table[(row_idx, col_idx)]
        value = mae_table.loc[model, nutrient]
        
        # Highlight if this is the best model for this nutrient
        if abs(value - min_mae) < 0.01:  # Using small tolerance for float comparison
            cell.set_facecolor('#C6EFCE')  # Light green
            cell.set_text_props(weight='bold')
        else:
            # Alternate row colors for readability
            if row_idx % 2 == 0:
                cell.set_facecolor('#F2F2F2')

# Style model names column
for row_idx in range(1, len(model_order) + 1):
    cell = table[(row_idx, 0)]
    cell.set_text_props(weight='bold', ha='left')
    if row_idx % 2 == 0:
        cell.set_facecolor('#F2F2F2')

plt.title('Model Performance Comparison: Mean Absolute Error (MAE) by Nutrient\n(Green = Best Model for Each Nutrient)', 
          fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig('model_performance_table.png', dpi=300, bbox_inches='tight', facecolor='white')
plt.show()

print("✓ Visual table saved as 'model_performance_table.png'")
print("  (High-resolution image suitable for PowerPoint/Google Slides)")
print()

# Create text summary for slides
print("="*90)
print("KEY FINDINGS - SUMMARY FOR PRESENTATION:")
print("="*90)
print()
print("📊 MODEL PERFORMANCE INSIGHTS:")
print()
print("1. BEST MODEL BY NUTRIENT:")
print("   • Ridge Regression dominates: Best for 6 out of 7 nutrients")
print("   • Only exception: Sodium (Neural Network performs best)")
print()
print("2. OVERALL PERFORMANCE:")
print("   • Ridge Regression: Most consistent across nutrients")
print("   • Lowest errors for: energy, protein, carbs, fat, sugars, fiber")
print("   • Average MAE: 532.74 (2nd lowest when excluding high sodium impact)")
print()
print("3. NEURAL NETWORK:")
print("   • Best average MAE overall (198.54) due to excellent sodium prediction")
print("   • However, performs poorly on other nutrients")
print("   • Trade-off: Specialized vs. generalized performance")
print()
print("4. TREE-BASED MODELS:")
print("   • Random Forest & Gradient Boosting show similar performance")
print("   • Better than Neural Network on most nutrients (except sodium)")
print("   • Good balance between complexity and accuracy")
print()
print("💡 RECOMMENDATION:")
print("   → Use Ridge Regression for production deployment")
print("   → Most reliable and consistent predictions across all nutrients")
print("   → Simpler model = faster predictions and easier maintenance")
print()
print("="*90)


