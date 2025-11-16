// src/nutritionModel.js

export function nutritionFromJson(json) {
  return {
    foodName: json.foodName ?? "Unknown Food",
    calories: Number(json.calories ?? 0),
    protein: Number(json.protein ?? 0),
    carbs: Number(json.carbs ?? 0),
    fats: Number(json.fats ?? 0),
  };
}
