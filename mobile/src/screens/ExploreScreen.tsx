import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootTabNavigationProp } from '../navigation/types';
import { DishCard, CategoryHeader, type DishCardData } from '../components/Explore';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../theme';
import { fetchFeaturedDishes } from '../services/api';
import { cacheFeaturedDishes, loadCachedDishes } from '../services/storage';

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<RootTabNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantDishes, setRestaurantDishes] = useState<DishCardData[]>([]);
  const [homeCookedMeals, setHomeCookedMeals] = useState<DishCardData[]>([]);

  /**
   * Load featured dishes from backend or cache
   * 
   * TODO: Backend Integration Steps:
   * 1. Implement GET /api/dishes/featured endpoint
   * 2. Support category filter (restaurant/home)
   * 3. Return DishCatalogEntry array
   * 4. Include image URLs when available
   * 5. Implement popularity scoring algorithm
   * 6. Cache results for offline access
   */
  useEffect(() => {
    loadFeaturedDishes();
  }, []);

  const loadFeaturedDishes = async () => {
    try {
      setIsLoading(true);

      // Try loading from cache first
      const cached = await loadCachedDishes();
      if (cached.length > 0) {
        const { restaurant, home } = categorizesDishes(cached);
        setRestaurantDishes(mapDishData(restaurant));
        setHomeCookedMeals(mapDishData(home));
      }

      // TODO: Fetch from API
      // const allDishes = await fetchFeaturedDishes();
      // const { restaurant, home } = categorizesDishes(allDishes);
      // setRestaurantDishes(mapDishData(restaurant));
      // setHomeCookedMeals(mapDishData(home));
      // await cacheFeaturedDishes(allDishes);

      // Mock data (remove when backend integrated)
      loadMockData();

    } catch (error) {
      console.error('❌ [Explore] Failed to load dishes:', error);
      // Fall back to mock data
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Categorize dishes by prep style
   */
  const categorizesDishes = (dishes: any[]) => {
    const restaurant = dishes.filter(d => d.category === 'restaurant' || d.prep_style === 'restaurant');
    const home = dishes.filter(d => d.category === 'home' || d.prep_style === 'home');
    return { restaurant, home };
  };

  /**
   * Map backend dish catalog entries to component format
   */
  const mapDishData = (dishes: any[]): DishCardData[] => {
    return dishes.map(dish => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      calories: dish.calories,
      prepStyle: dish.prep_style,
      imageUrl: dish.image_url,
      estimatedProtein: dish.estimated_macros?.protein,
      estimatedCarbs: dish.estimated_macros?.carbs,
      estimatedFat: dish.estimated_macros?.fat,
    }));
  };

  /**
   * Load mock data (temporary until backend is ready)
   */
  const loadMockData = () => {
    const restaurantData: DishCardData[] = [
      {
        id: 'r1',
        name: 'Chipotle Chicken Bowl',
        description: 'Rice, beans, chicken, cheese, lettuce, salsa',
        calories: 650,
        prepStyle: 'restaurant',
        estimatedProtein: 35,
        estimatedCarbs: 68,
        estimatedFat: 22,
      },
      {
        id: 'r2',
        name: 'Paneer Tikka Masala',
        description: 'Creamy tomato curry with cottage cheese, served with naan',
        calories: 580,
        prepStyle: 'restaurant',
        estimatedProtein: 24,
        estimatedCarbs: 52,
        estimatedFat: 28,
      },
      {
        id: 'r3',
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, mozzarella, and basil',
        calories: 800,
        prepStyle: 'restaurant',
        estimatedProtein: 32,
        estimatedCarbs: 95,
        estimatedFat: 28,
      },
      {
        id: 'r4',
        name: 'Pad Thai Noodles',
        description: 'Stir-fried rice noodles with shrimp, peanuts, and lime',
        calories: 720,
        prepStyle: 'restaurant',
        estimatedProtein: 28,
        estimatedCarbs: 88,
        estimatedFat: 26,
      },
      {
        id: 'r5',
        name: 'Burger with Fries',
        description: 'Beef patty, cheese, lettuce, tomato, with french fries',
        calories: 920,
        prepStyle: 'restaurant',
        estimatedProtein: 38,
        estimatedCarbs: 85,
        estimatedFat: 48,
      },
    ];

    const homeData: DishCardData[] = [
    {
      id: 'h1',
      name: 'Grilled Chicken Breast',
      description: 'Simple grilled chicken with herbs and lemon',
      calories: 280,
      prepStyle: 'home',
      estimatedProtein: 48,
      estimatedCarbs: 0,
      estimatedFat: 8,
    },
    {
      id: 'h2',
      name: 'Homemade Caesar Salad',
      description: 'Romaine lettuce, croutons, parmesan, caesar dressing',
      calories: 350,
      prepStyle: 'home',
      estimatedProtein: 12,
      estimatedCarbs: 18,
      estimatedFat: 26,
    },
    {
      id: 'h3',
      name: 'Scrambled Eggs with Toast',
      description: '3 eggs scrambled with butter, 2 slices whole wheat toast',
      calories: 420,
      prepStyle: 'home',
      estimatedProtein: 24,
      estimatedCarbs: 32,
      estimatedFat: 20,
    },
    {
      id: 'h4',
      name: 'Spaghetti with Marinara',
      description: 'Pasta with homemade tomato sauce and parmesan',
      calories: 520,
      prepStyle: 'home',
      estimatedProtein: 18,
      estimatedCarbs: 78,
      estimatedFat: 14,
    },
    {
      id: 'h5',
      name: 'Greek Yogurt with Berries',
      description: 'Plain Greek yogurt topped with mixed berries and honey',
      calories: 220,
      prepStyle: 'home',
      estimatedProtein: 18,
      estimatedCarbs: 32,
      estimatedFat: 4,
    },
  ];

    setRestaurantDishes(restaurantData);
    setHomeCookedMeals(homeData);
  };

  // Handle dish selection - Navigate to Label tab and prefill
  const handleDishPress = (dish: DishCardData) => {
    // Navigate to Label tab
    navigation.navigate('LabelStack', {
      screen: 'LabelHome',
      params: {
        prefillDish: {
          dishName: dish.name,
          targetCalories: dish.calories,
          prepStyle: dish.prepStyle,
        },
      },
    });
  };

  // Render horizontal scrollable section
  const renderHorizontalSection = (dishes: DishCardData[]) => (
    <FlatList
      data={dishes}
      renderItem={({ item }) => (
        <DishCard dish={item} onPress={() => handleDishPress(item)} />
      )}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>
            Discover popular dishes and get instant nutrition insights
          </Text>
        </View>

        {/* Quick Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="food-variant"
              size={32}
              color={AppColors.primary}
            />
            <Text style={styles.statValue}>100+</Text>
            <Text style={styles.statLabel}>Dishes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={32}
              color={AppColors.accent}
            />
            <Text style={styles.statValue}>50+</Text>
            <Text style={styles.statLabel}>Restaurants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="home-heart"
              size={32}
              color={AppColors.error}
            />
            <Text style={styles.statValue}>50+</Text>
            <Text style={styles.statLabel}>Home Cooked</Text>
          </View>
        </View>

        {/* Popular Restaurant Dishes Section */}
        <CategoryHeader
          title="Popular Restaurant Dishes"
          subtitle="Most analyzed dishes from restaurants"
          icon="silverware-fork-knife"
        />
        {renderHorizontalSection(restaurantDishes)}

        {/* Spacer */}
        <View style={styles.sectionSpacer} />

        {/* Common Home Cooked Meals Section */}
        <CategoryHeader
          title="Common Home Cooked Meals"
          subtitle="Simple, healthy meals made at home"
          icon="home-heart"
        />
        {renderHorizontalSection(homeCookedMeals)}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color={AppColors.accent}
            />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Tap any dish to instantly prefill the Label screen with its data.
              You can then adjust ingredients or portions to match your exact meal.
            </Text>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.md,
    color: AppColors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  statDivider: {
    width: 1,
    backgroundColor: AppColors.border,
    marginHorizontal: Spacing.md,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionSpacer: {
    height: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  bottomPadding: {
    height: Spacing.xl,
  },
});
