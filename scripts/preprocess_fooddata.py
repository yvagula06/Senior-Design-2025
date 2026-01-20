#!/usr/bin/env python3
"""
USDA FoodData Central Preprocessing Script

This script merges the following USDA FoodData Central CSV files:
- food.csv
- food_nutrient.csv
- nutrient.csv
- branded_food.csv

It extracts key nutrients (energy, protein, carbs, fats, sugars, fiber, sodium)
and combines them with food names and brand information into a single CSV file.

Output: data/usda_branded_foods.csv

Usage:
    python scripts/preprocess_fooddata.py --data-dir <path_to_usda_csv_folder>
"""

import argparse
import pandas as pd
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(
        description="Preprocess USDA FoodData Central CSV files into a single dataset"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        required=True,
        help="Path to directory containing USDA CSV files (food.csv, food_nutrient.csv, etc.)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/usda_branded_foods.csv",
        help="Output path for the merged dataset (default: data/usda_branded_foods.csv)"
    )
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    output_path = Path(args.output)
    
    # Validate input directory exists
    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}")
        sys.exit(1)
    
    # Define required files
    required_files = {
        'food': data_dir / 'food.csv',
        'food_nutrient': data_dir / 'food_nutrient.csv',
        'nutrient': data_dir / 'nutrient.csv',
        'branded_food': data_dir / 'branded_food.csv'
    }
    
    # Check all required files exist
    for name, path in required_files.items():
        if not path.exists():
            print(f"Error: Required file not found: {path}")
            sys.exit(1)
    
    print("="*80)
    print("USDA FoodData Central Preprocessing")
    print("="*80)
    print(f"\nData directory: {data_dir}")
    print(f"Output file: {output_path}")
    print("\nLoading CSV files...")
    
    # Load all CSV files
    print("  Loading food.csv...")
    food_df = pd.read_csv(required_files['food'])
    print(f"    Loaded {len(food_df)} rows")
    
    print("  Loading food_nutrient.csv...")
    food_nutrient_df = pd.read_csv(required_files['food_nutrient'])
    print(f"    Loaded {len(food_nutrient_df)} rows")
    
    print("  Loading nutrient.csv...")
    nutrient_df = pd.read_csv(required_files['nutrient'])
    print(f"    Loaded {len(nutrient_df)} rows")
    
    print("  Loading branded_food.csv...")
    branded_food_df = pd.read_csv(required_files['branded_food'])
    print(f"    Loaded {len(branded_food_df)} rows")
    
    # Define nutrients of interest
    # Common nutrient IDs from USDA FoodData Central
    nutrient_mapping = {
        1008: 'energy_kcal',       # Energy (kcal)
        1003: 'protein_g',          # Protein
        1005: 'carbohydrates_g',    # Carbohydrate, by difference
        1004: 'fat_total_g',        # Total lipid (fat)
        2000: 'sugars_g',           # Sugars, total including NLEA
        1079: 'fiber_g',            # Fiber, total dietary
        1093: 'sodium_mg'           # Sodium, Na
    }
    
    print("\n" + "="*80)
    print("Processing nutrients...")
    print("="*80)
    
    # Filter nutrient data for nutrients of interest
    nutrient_ids = list(nutrient_mapping.keys())
    food_nutrient_filtered = food_nutrient_df[
        food_nutrient_df['nutrient_id'].isin(nutrient_ids)
    ].copy()
    
    print(f"\nFiltered to {len(food_nutrient_filtered)} nutrient records")
    
    # Pivot nutrient data to wide format
    print("Pivoting nutrient data to wide format...")
    nutrient_wide = food_nutrient_filtered.pivot_table(
        index='fdc_id',
        columns='nutrient_id',
        values='amount',
        aggfunc='first'  # Use first value if duplicates exist
    ).reset_index()
    
    # Rename columns using nutrient mapping
    nutrient_wide.columns = ['fdc_id'] + [
        nutrient_mapping.get(col, f'nutrient_{col}') 
        for col in nutrient_wide.columns[1:]
    ]
    
    print(f"  Pivoted to {len(nutrient_wide)} foods with nutrient columns")
    print(f"  Columns: {list(nutrient_wide.columns)}")
    
    # Merge with food names
    print("\nMerging with food names...")
    merged = food_df[['fdc_id', 'description']].merge(
        nutrient_wide,
        on='fdc_id',
        how='inner'
    )
    print(f"  After merge with food.csv: {len(merged)} rows")
    
    # Merge with branded food data
    print("\nMerging with branded food data...")
    merged = merged.merge(
        branded_food_df[['fdc_id', 'brand_owner', 'serving_size', 'serving_size_unit', 'household_serving_fulltext']],
        on='fdc_id',
        how='inner'
    )
    print(f"  After merge with branded_food.csv: {len(merged)} rows")
    
    # Rename description column to food_name
    merged.rename(columns={'description': 'food_name'}, inplace=True)
    
    # Reorder columns for better readability
    column_order = ['fdc_id', 'food_name', 'brand_owner', 'serving_size', 
                    'serving_size_unit', 'household_serving_fulltext']
    
    # Add nutrient columns
    nutrient_cols = [col for col in merged.columns if col not in column_order]
    column_order.extend(nutrient_cols)
    
    # Keep only columns that exist
    column_order = [col for col in column_order if col in merged.columns]
    merged = merged[column_order]
    
    print("\n" + "="*80)
    print("Data Quality Summary")
    print("="*80)
    print(f"\nTotal rows: {len(merged)}")
    print(f"Total columns: {len(merged.columns)}")
    print("\nMissing values per column:")
    for col in merged.columns:
        missing = merged[col].isna().sum()
        pct = (missing / len(merged)) * 100
        print(f"  {col}: {missing} ({pct:.1f}%)")
    
    # Create output directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save to CSV
    print(f"\n" + "="*80)
    print(f"Saving to: {output_path}")
    print("="*80)
    merged.to_csv(output_path, index=False)
    print(f"✓ Successfully saved {len(merged)} rows to {output_path}")
    
    # Print sample rows
    print("\nFirst 5 rows of processed data:")
    print(merged.head())
    
    print("\n" + "="*80)
    print("Preprocessing complete!")
    print("="*80)
    print(f"\nYou can now use this file in your notebook:")
    print(f"  df = pd.read_csv('{output_path}')")


if __name__ == "__main__":
    main()
