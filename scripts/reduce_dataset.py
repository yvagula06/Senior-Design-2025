"""
Reduce the USDA dataset size by 10x by sampling every 10th row
"""
import pandas as pd
from pathlib import Path

# Paths
input_file = Path(r"C:\Users\Yuvar\Desktop\VSProjects\Senior-Design-2025\data\usda_branded_foods.csv")
output_file = Path(r"C:\Users\Yuvar\Desktop\VSProjects\Senior-Design-2025\data\usda_branded_foods_reduced.csv")

print(f"Reading dataset from: {input_file}")
df = pd.read_csv(input_file)
print(f"Original dataset size: {len(df):,} rows")

# Sample every 10th row (reduces size by 10x)
df_reduced = df.iloc[::10].reset_index(drop=True)
print(f"Reduced dataset size: {len(df_reduced):,} rows")

# Save the reduced dataset
df_reduced.to_csv(output_file, index=False)
print(f"✓ Reduced dataset saved to: {output_file}")
print(f"Size reduction: {len(df) / len(df_reduced):.1f}x")
