// This is the main entry point of the Flutter application.

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'Api.dart';
import 'nutrition_model.dart';

// App-level colors and text styles
class AppColors {
  static const background = Color(0xFFF9FBE7); // pale green/cream
  static const primary = Color(0xFF81C784); // soft green
  static const accent = Color(0xFF4CAF50); // darker green
  static const text = Color(0xFF2E2E2E); // dark gray
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
      title: 'Nutrition Estimator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
        ),
        scaffoldBackgroundColor: AppColors.background,
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

  // A list to store the food entries. This is the main application state.
  final List<Map<String, dynamic>> _foodEntries = [];

  // Controllers for the text input fields.
  final TextEditingController _foodNameController = TextEditingController();
  final TextEditingController _caloriesController = TextEditingController();
  final TextEditingController _proteinController = TextEditingController();
  final TextEditingController _carbsController = TextEditingController();
  final TextEditingController _fatsController = TextEditingController();

  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  // Holds the most recently generated label for the Label tab UI
  final ValueNotifier<Map<String, dynamic>?> _lastGeneratedLabel =
      ValueNotifier<Map<String, dynamic>?>(null);

  // Pages for each bottom tab
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = <Widget>[
      // TAB 0: Label (input page)
      _InputPage(
        foodNameController: _foodNameController,
        caloriesController: _caloriesController,
        proteinController: _proteinController,
        carbsController: _carbsController,
        fatsController: _fatsController,
        onSave: _saveFoodEntry,
        onTakePhoto: _takePhotoAndAnalyze,
        lastGeneratedLabel: _lastGeneratedLabel,
      ),
      // TAB 1: History
      _DailyConsumerPage(
        foodEntries: _foodEntries,
        onDelete: _deleteFoodEntry,
      ),
      // TAB 2: Explore (placeholder for now)
      const _ExplorePage(),
      // TAB 3: Profile (placeholder for now)
      const _ProfilePage(),
    ];
  }

  // This function saves a new food entry to the list.
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

    // Update the "latest generated label" for the Label tab
    _lastGeneratedLabel.value = newEntry;

    _foodNameController.clear();
    _caloriesController.clear();
    _proteinController.clear();
    _carbsController.clear();
    _fatsController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Saved entry for "$foodName"')),
    );

    // We keep the user on the Label tab
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

      _lastGeneratedLabel.value = newEntry;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entry added from photo!')),
      );
    }
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
          'Nutrition Estimator',
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
                      'This is a senior design project app.\nAuthors: Raj, Harry, Matthew, and Rached',
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
        type: BottomNavigationBarType.fixed,
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.label_outline),
            label: 'Label',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.explore),
            label: 'Explore',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        onTap: _onItemTapped,
      ),
    );
  }
}

// ------------------ LABEL TAB (INPUT PAGE) ------------------

class _InputPage extends StatelessWidget {
  final TextEditingController foodNameController;
  final TextEditingController caloriesController;
  final TextEditingController proteinController;
  final TextEditingController carbsController;
  final TextEditingController fatsController;
  final VoidCallback onSave;
  final Future<void> Function() onTakePhoto;

  // Listen to the last generated label
  final ValueNotifier<Map<String, dynamic>?> lastGeneratedLabel;

  const _InputPage({
    required this.foodNameController,
    required this.caloriesController,
    required this.proteinController,
    required this.carbsController,
    required this.fatsController,
    required this.onSave,
    required this.onTakePhoto,
    required this.lastGeneratedLabel,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Describe your dish',
            style: AppTextStyles.heading,
          ),
          const SizedBox(height: 6),
          const Text(
            'Type a dish name and rough macros, or use the camera to estimate them.',
            style: AppTextStyles.body,
          ),
          const SizedBox(height: 16),

          // Main input card
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Dish name',
                    style: AppTextStyles.label,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: foodNameController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Grilled chicken bowl with rice',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.fastfood),
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Text(
                    'Macros',
                    style: AppTextStyles.label,
                  ),
                  const SizedBox(height: 8),

                  // First row: Calories & Protein
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: caloriesController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Calories (kcal)',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.local_fire_department),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: proteinController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Protein (g)',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.fitness_center),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Second row: Carbs & Fats
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: carbsController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Carbs (g)',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.bakery_dining),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: fatsController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Fats (g)',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.oil_barrel),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Camera button in the middle
                  Column(
                    children: [
                      const Text(
                        'Or capture a photo of the dish',
                        style: AppTextStyles.body,
                      ),
                      const SizedBox(height: 10),
                      Center(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(40),
                          onTap: () => onTakePhoto(),
                          child: Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              size: 32,
                              color: AppColors.accent,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Save / generate button
          ElevatedButton(
            onPressed: onSave,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              textStyle: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Generate & Save Label'),
          ),

          const SizedBox(height: 16),

          // "Latest generated label" card
          ValueListenableBuilder<Map<String, dynamic>?>(
            valueListenable: lastGeneratedLabel,
            builder: (context, label, _) {
              if (label == null) return const SizedBox.shrink();

              final String name = label['foodName'] as String;
              final double calories = label['calories'] as double;
              final double protein = label['protein'] as double;
              final double carbs = label['carbs'] as double;
              final double fats = label['fats'] as double;

              return Card(
                elevation: 3,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                margin: const EdgeInsets.only(top: 4),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Latest generated label',
                        style: AppTextStyles.label,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name,
                        style: AppTextStyles.heading.copyWith(fontSize: 18),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Calories: ${calories.toStringAsFixed(0)} kcal',
                        style: AppTextStyles.body,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Protein: ${protein.toStringAsFixed(1)} g  ·  '
                        'Carbs: ${carbs.toStringAsFixed(1)} g  ·  '
                        'Fats: ${fats.toStringAsFixed(1)} g',
                        style: AppTextStyles.body,
                      ),
                      const SizedBox(height: 12),
                      MacroBreakdownBar(
                        protein: protein,
                        carbs: carbs,
                        fats: fats,
                        height: 8,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ------------------ HISTORY TAB ------------------

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

    // --- DAILY TOTALS ---
    final double totalCalories =
        foodEntries.fold(0.0, (sum, entry) => sum + (entry['calories'] as double));
    final double totalProtein =
        foodEntries.fold(0.0, (sum, entry) => sum + (entry['protein'] as double));
    final double totalCarbs =
        foodEntries.fold(0.0, (sum, entry) => sum + (entry['carbs'] as double));
    final double totalFats =
        foodEntries.fold(0.0, (sum, entry) => sum + (entry['fats'] as double));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ---------- TOP SUMMARY CARD ----------
        Card(
          elevation: 3,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(
                  child: Text(
                    "Today's Summary",
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text("Total Calories: ${totalCalories.toStringAsFixed(0)} kcal"),
                const SizedBox(height: 4),
                Text(
                  'Protein: ${totalProtein.toStringAsFixed(1)} g  ·  '
                  'Carbs: ${totalCarbs.toStringAsFixed(1)} g  ·  '
                  'Fats: ${totalFats.toStringAsFixed(1)} g',
                ),
                const SizedBox(height: 16),

                // Macro bar + legend handled INSIDE MacroBreakdownBar
                MacroBreakdownBar(
                  protein: totalProtein,
                  carbs: totalCarbs,
                  fats: totalFats,
                  height: 8,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),

        // ---------- INDIVIDUAL ENTRIES (NO MACRO BAR) ----------
        ...foodEntries.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;

          final String name = item['foodName'] as String;
          final double calories = item['calories'] as double;
          final double protein = item['protein'] as double;
          final double carbs = item['carbs'] as double;
          final double fats = item['fats'] as double;

          return Dismissible(
            key: UniqueKey(),
            onDismissed: (direction) => onDelete(index),
            background: Container(
              color: Colors.red,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.centerRight,
              child: const Icon(Icons.delete, color: Colors.white),
            ),
            child: Card(
              elevation: 2,
              margin: const EdgeInsets.only(bottom: 16),
              child: ListTile(
                title: Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  'Protein: ${protein.toStringAsFixed(1)} g  ·  '
                  'Carbs: ${carbs.toStringAsFixed(1)} g  ·  '
                  'Fats: ${fats.toStringAsFixed(1)} g',
                ),
                trailing: Text(
                  '${calories.toStringAsFixed(0)} kcal',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          );
        }).toList(),
      ],
    );
  }
}

// ------------------ SIMPLE MACRO "CHART" WIDGET ------------------

class MacroBreakdownBar extends StatelessWidget {
  final double protein;
  final double carbs;
  final double fats;
  final double height;

  const MacroBreakdownBar({
    super.key,
    required this.protein,
    required this.carbs,
    required this.fats,
    this.height = 10,
  });

  @override
  Widget build(BuildContext context) {
    final double total = protein + carbs + fats;

    if (total <= 0) {
      return const SizedBox.shrink();
    }

    final int protFlex = (protein / total * 100).round().clamp(1, 100);
    final int carbFlex = (carbs / total * 100).round().clamp(1, 100);
    final int fatFlex = (fats / total * 100).round().clamp(1, 100);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // colored bar
        Container(
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            color: Colors.grey.shade200,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: Row(
              children: [
                Expanded(
                  flex: protFlex,
                  child: Container(
                    color: Colors.deepPurpleAccent.withOpacity(0.9),
                  ),
                ),
                Expanded(
                  flex: carbFlex,
                  child: Container(
                    color: Colors.orangeAccent.withOpacity(0.9),
                  ),
                ),
                Expanded(
                  flex: fatFlex,
                  child: Container(
                    color: Colors.teal.withOpacity(0.9),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        // legend pushed to the RIGHT side
        Align(
          alignment: Alignment.centerRight,
          child: Wrap(
            spacing: 12,
            children: const [
              MacroLegendDot(
                color: Colors.deepPurpleAccent,
                label: 'Protein',
              ),
              MacroLegendDot(
                color: Colors.orangeAccent,
                label: 'Carbs',
              ),
              MacroLegendDot(
                color: Colors.teal,
                label: 'Fats',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class MacroLegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const MacroLegendDot({
    super.key,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

// ------------------ EXPLORE TAB ------------------

class _ExplorePage extends StatelessWidget {
  const _ExplorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text(
          'Explore dishes',
          style: AppTextStyles.heading,
        ),
        SizedBox(height: 12),
        Text(
          'Quick presets to showcase the system in your demo.',
          style: AppTextStyles.body,
        ),
        SizedBox(height: 16),
        _ExploreCard(title: 'Chipotle chicken bowl'),
        _ExploreCard(title: 'Butter chicken (restaurant style)'),
        _ExploreCard(title: 'Margherita pizza'),
      ],
    );
  }
}

class _ExploreCard extends StatelessWidget {
  final String title;

  const _ExploreCard({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 3,
      child: ListTile(
        title: Text(title),
        subtitle: const Text('Tap to prefill the label input (coming soon)'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Preset "$title" tapped (to be wired up).'),
            ),
          );
        },
      ),
    );
  }
}

// ------------------ PROFILE TAB ------------------

class _ProfilePage extends StatelessWidget {
  const _ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text(
          'Profile & Settings',
          style: AppTextStyles.heading,
        ),
        SizedBox(height: 16),
        ListTile(
          leading: Icon(Icons.straighten),
          title: Text('Units'),
          subtitle: Text('Imperial / Metric (UI only for now)'),
        ),
        ListTile(
          leading: Icon(Icons.restaurant),
          title: Text('Default style'),
          subtitle: Text('Home / Restaurant / Ask every time'),
        ),
        Divider(),
        ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('About NutriLabelAI'),
          subtitle: Text(
            'This app estimates nutrition labels from dish names. '
            'Values are approximate and not medical advice.',
          ),
        ),
        ListTile(
          leading: Icon(Icons.code),
          title: Text('Model & Tech (for demo)'),
          subtitle: Text(
            'Built with Flutter frontend and a Python backend using embeddings '
            'and PostgreSQL + pgvector.',
          ),
        ),
      ],
    );
  }
}
