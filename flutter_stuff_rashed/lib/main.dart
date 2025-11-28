// This is the main entry point of the Flutter application.

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'Api.dart';
import 'nutrition_model.dart';

// put this near the top of main.dart, under the imports

class AppColors {
  static const background = Color(0xFFF9FBE7); // pale green/cream
  static const primary = Color(0xFF81C784);    // soft green
  static const accent = Color(0xFF4CAF50);     // darker green
  static const text = Color(0xFF2E2E2E);       // dark gray
}

class AppTextStyles {
  static const heading = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.text,
  );

  static const label = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.text,
  );

  static const body = TextStyle(
    fontSize: 14,
    color: AppColors.text,
  );
}

// The main function where app execution begins.
void main() {
  runApp(const MyApp());
}

// MyApp is a StatelessWidget, the root widget of the application.
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: ' log Estimator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 23, 182, 84),
        ),
        useMaterial3: true,
      ),
      home: const MainAppTabs(),
    );
  }
}

// MainAppTabs is a StatefulWidget that holds the state for the tab-based navigation.
class MainAppTabs extends StatefulWidget {
  const MainAppTabs({super.key});

  @override
  State<MainAppTabs> createState() => _MainAppTabsState();
}

class _MainAppTabsState extends State<MainAppTabs> {
  int _selectedIndex = 0;

  final List<Map<String, dynamic>> _foodEntries = [];

  final TextEditingController _foodNameController = TextEditingController();
  final TextEditingController _caloriesController = TextEditingController();
  final TextEditingController _proteinController = TextEditingController();
  final TextEditingController _carbsController = TextEditingController();
  final TextEditingController _fatsController = TextEditingController();

  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  void _saveFoodEntry() {
    String foodName = _foodNameController.text;
    double calories = double.tryParse(_caloriesController.text) ?? 0.0;
    double protein = double.tryParse(_proteinController.text) ?? 0.0;
    double carbs = double.tryParse(_carbsController.text) ?? 0.0;
    double fats = double.tryParse(_fatsController.text) ?? 0.0;

    if (foodName.isEmpty || calories <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid food name and calorie count.'),
        ),
      );
      return;
    }

    final newEntry = {
      'foodName': foodName,
      'calories': calories,
      'protein': protein,
      'carbs': carbs,
      'fats': fats,
    };

    setState(() {
      _foodEntries.add(newEntry);
    });

    _foodNameController.clear();
    _caloriesController.clear();
    _proteinController.clear();
    _carbsController.clear();
    _fatsController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Saved entry for "$foodName"')),
    );
    _onItemTapped(1);
  }

  void _deleteFoodEntry(int index) {
    final String foodName = _foodEntries[index]['foodName'];

    setState(() {
      _foodEntries.removeAt(index);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Deleted entry for "$foodName"')),
    );
  }

  Future<void> _takePhotoAndAnalyze() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera);

      if (photo != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Uploading and analyzing photo...')),
        );

        final Map<String, dynamic>? result =
            await _apiService.analyzeImage(photo);

        if (result != null && mounted) {
          final nutritionData = NutritionInfo.fromJson(result);

          await _showVerificationDialog(
            ingredients: [nutritionData.foodName],
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs,
            fats: nutritionData.fats,
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to analyze photo. Please try again.'),
            ),
          );
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to take a photo: $e")),
      );
    }
  }

  Future<void> _showVerificationDialog({
    required List<String> ingredients,
    required double calories,
    required double protein,
    required double carbs,
    required double fats,
  }) async {
    final verified = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Verify and Add Entry'),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                const Text(
                  'The app identified the following ingredients. Please verify and confirm:',
                ),
                const SizedBox(height: 10),
                ...ingredients.map((ingredient) => Text('- $ingredient')),
                const SizedBox(height: 20),
                Text('Estimated Calories: ${calories.toStringAsFixed(0)} kcal'),
                Text('Estimated Protein: ${protein.toStringAsFixed(1)} g'),
                Text('Estimated Carbs: ${carbs.toStringAsFixed(1)} g'),
                Text('Estimated Fats: ${fats.toStringAsFixed(1)} g'),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop(false);
              },
            ),
            TextButton(
              child: const Text('Confirm'),
              onPressed: () {
                Navigator.of(context).pop(true);
              },
            ),
          ],
        );
      },
    );

    if (verified == true) {
      final newEntry = {
        'foodName': ingredients.join(', '),
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fats': fats,
      };

      setState(() {
        _foodEntries.add(newEntry);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entry added from photo!')),
      );
      _onItemTapped(1);
    }
  }

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = <Widget>[
      _InputPage(
        foodNameController: _foodNameController,
        caloriesController: _caloriesController,
        proteinController: _proteinController,
        carbsController: _carbsController,
        fatsController: _fatsController,
        onSave: _saveFoodEntry,
        onTakePhoto: _takePhotoAndAnalyze,
      ),
      _DailyConsumerPage(
        foodEntries: _foodEntries,
        onDelete: _deleteFoodEntry,
      ),
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          ' Nutrition Estimator',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        centerTitle: true,
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: <Widget>[
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.inversePrimary,
              ),
              child: const Text(
                'Settings',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.info),
              title: const Text('About'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'This is a seniordesign project app.\nAuthors: Raj, Harry, Matthew, and Rached',
                    ),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.help),
              title: const Text('Help'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Contact your team for support.'),
                  ),
                );
              },
            ),
          ],
        ),
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.add_box),
            label: 'Add Entry',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list),
            label: 'Daily Consumer',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        onTap: _onItemTapped,
      ),
    );
  }
}

class _InputPage extends StatelessWidget {
  final TextEditingController foodNameController;
  final TextEditingController caloriesController;
  final TextEditingController proteinController;
  final TextEditingController carbsController;
  final TextEditingController fatsController;
  final VoidCallback onSave;
  final Future<void> Function() onTakePhoto;

  const _InputPage({
    required this.foodNameController,
    required this.caloriesController,
    required this.proteinController,
    required this.carbsController,
    required this.fatsController,
    required this.onSave,
    required this.onTakePhoto,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          TextField(
            controller: foodNameController,
            decoration: const InputDecoration(
              labelText: 'Food Name',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.fastfood),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: caloriesController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Total Calories (kcal)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.local_fire_department),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: proteinController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Protein (g)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.fitness_center),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: carbsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Carbohydrates (g)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.bakery_dining),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: fatsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Fats (g)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.oil_barrel),
            ),
          ),
          const SizedBox(height: 30),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: onSave,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    textStyle: const TextStyle(fontSize: 18),
                  ),
                  child: const Text('Save Food Entry'),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: () {
                  onTakePhoto();
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  textStyle: const TextStyle(fontSize: 18),
                ),
                child: const Icon(Icons.camera_alt),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DailyConsumerPage extends StatelessWidget {
  final List<Map<String, dynamic>> foodEntries;
  final Function(int) onDelete;

  const _DailyConsumerPage({
    required this.foodEntries,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    if (foodEntries.isEmpty) {
      return const Center(child: Text("No entries saved yet."));
    }

    final double totalCalories = foodEntries.fold(
      0.0,
      (sum, entry) => sum + entry['calories'],
    );
    final double totalProtein = foodEntries.fold(
      0.0,
      (sum, entry) => sum + entry['protein'],
    );
    final double totalCarbs = foodEntries.fold(
      0.0,
      (sum, entry) => sum + entry['carbs'],
    );
    final double totalFats = foodEntries.fold(
      0.0,
      (sum, entry) => sum + entry['fats'],
    );

    return Column(
      children: [
        Card(
          margin: const EdgeInsets.all(16.0),
          elevation: 4,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Daily Totals',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text('Total Calories: ${totalCalories.toStringAsFixed(0)} kcal'),
                const SizedBox(height: 4),
                Text('Total Protein: ${totalProtein.toStringAsFixed(1)} g'),
                const SizedBox(height: 4),
                Text('Total Carbs: ${totalCarbs.toStringAsFixed(1)} g'),
                const SizedBox(height: 4),
                Text('Total Fats: ${totalFats.toStringAsFixed(1)} g'),
              ],
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 16.0),
            itemCount: foodEntries.length,
            itemBuilder: (context, index) {
              final entry = foodEntries[index];
              return Dismissible(
                key: UniqueKey(),
                onDismissed: (direction) {
                  onDelete(index);
                },
                background: Container(
                  color: Colors.red,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  alignment: Alignment.centerRight,
                  child: const Icon(Icons.delete, color: Colors.white),
                ),
                child: Card(
                  elevation: 4,
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListTile(
                    title: Text(
                      entry['foodName'],
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    subtitle: Text(
                      "Calories: ${entry['calories']} kcal\n"
                      "Protein: ${entry['protein']} g\n"
                      "Carbs: ${entry['carbs']} g\n"
                      "Fats: ${entry['fats']} g",
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
