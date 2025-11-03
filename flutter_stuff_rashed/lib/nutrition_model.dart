// lib/nutrition_model.dart

class NutritionInfo {
  final String foodName;
  final double calories;
  final double protein;
  final double carbs;
  final double fats;

  NutritionInfo({
    required this.foodName,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fats,
  });

  // A 'factory constructor' to create an instance from a JSON map (Map<String, dynamic>)
  factory NutritionInfo.fromJson(Map<String, dynamic> json) {
    return NutritionInfo(
      // Use ?? to provide default values if a key is missing from the JSON
      foodName: json['foodName'] ?? 'Unknown Food',
      calories: (json['calories'] ?? 0.0).toDouble(),
      protein: (json['protein'] ?? 0.0).toDouble(),
      carbs: (json['carbs'] ?? 0.0).toDouble(),
      fats: (json['fats'] ?? 0.0).toDouble(),
    );
  }
}
