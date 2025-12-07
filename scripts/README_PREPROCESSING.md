# FoodData Central Preprocessing

## Overview

This script (`preprocess_fooddata.py`) merges multiple FoodData Central CSV files into a single dataset suitable for machine learning models.

## Required Source Files

From the FoodData Central "Branded Food" dataset:
- **`food.csv`** - Main food products table (contains food names)
- **`food_nutrient.csv`** - Nutritional values for each food
- **`nutrient.csv`** - Nutrient definitions and names
- **`branded_food.csv`** - Brand information (brand owner, ingredients, etc.)

## Usage

```bash
python scripts/preprocess_fooddata.py
```

## Output

Creates: `data/usda_branded_foods.csv`

### Output Schema

| Column | Type | Description |
|--------|------|-------------|
| `fdc_id` | int | USDA FoodData Central unique ID |
| `food_name` | str | Product description/name |
| `brand_owner` | str | Brand/manufacturer name |
| `energy_kcal` | float | Calories (kcal per 100g) |
| `protein_g` | float | Protein (g per 100g) |
| `carbohydrates_g` | float | Carbohydrates (g per 100g) |
| `fat_total_g` | float | Total fat (g per 100g) |
| `sugars_g` | float | Total sugars (g per 100g) |
| `fiber_g` | float | Dietary fiber (g per 100g) |
| `sodium_mg` | float | Sodium (mg per 100g) |
| `ingredients` | str | Ingredient list |
| `serving_size` | float | Serving size value |
| `serving_size_unit` | str | Serving size unit |

## Processing Steps

1. **Load** all four CSV files
2. **Pivot** nutrients from long format (one row per nutrient) to wide format (one column per nutrient)
3. **Filter** to branded foods only (`data_type == 'branded_food'`)
4. **Merge** food descriptions, nutrients, and brand information
5. **Clean** missing values and invalid entries
6. **Export** final dataset

## Nutrient ID Mappings

The script uses standard USDA nutrient IDs:
- `1008` - Energy (kcal)
- `1003` - Protein (g)
- `1005` - Carbohydrate, by difference (g)
- `1004` - Total lipid (fat) (g)
- `2000` - Sugars, total including NLEA (g)
- `1079` - Fiber, total dietary (g)
- `1093` - Sodium, Na (mg)

## Notes

- All nutritional values are per 100g of product
- Rows with missing food names or brand owners are removed
- Expected output: ~400k-600k branded food products (depends on USDA dataset version)
- Processing time: ~2-5 minutes depending on hardware
