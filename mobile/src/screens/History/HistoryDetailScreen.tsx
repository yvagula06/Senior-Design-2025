import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { HistoryStackParamList } from '../../navigation/types';
import {
  ConfidenceBar,
  NutritionLabelCard,
  type NutritionData,
} from '../../components/Label';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useFoodContext } from '../../context/FoodContext';

type HistoryDetailRouteProp = RouteProp<HistoryStackParamList, 'HistoryDetail'>;

export const HistoryDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { deleteFoodEntry } = useFoodContext();
  const route = useRoute<HistoryDetailRouteProp>();
  const navigation = useNavigation();
  const { dishId, dishName, calories, protein, carbs, fats, confidence, date, prepStyle } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: 'bold', color: '#FFFFFF' },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 17 }}>History List</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Build dishData from real navigation params
  const dishData = {
    dishName,
    date: date ?? new Date().toISOString().split('T')[0],
    prepStyle: (prepStyle ?? 'home') as 'home' | 'restaurant',
    confidence: confidence ?? 75,
    nutrition: {
      servingSize: '1 serving',
      calories: calories ?? 0,
      protein: protein ?? 0,
      totalCarbohydrate: carbs ?? 0,
      totalFat: fats ?? 0,
      saturatedFat: 0,
      transFat: 0,
      sodium: 0,
      totalSugars: 0,
      addedSugars: 0,
      dietaryFiber: 0,
      cholesterol: 0,
      vitaminD: 0,
      calcium: 0,
      iron: 0,
      potassium: 0,
    } as NutritionData,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPrepStyleLabel = () => {
    switch (dishData.prepStyle) {
      case 'home':
        return 'Home-cooked';
      case 'restaurant':
        return 'Restaurant';
      default:
        return 'Unknown';
    }
  };

  const getPrepStyleIcon = () => {
    switch (dishData.prepStyle) {
      case 'home':
        return 'home';
      case 'restaurant':
        return 'silverware-fork-knife';
      default:
        return 'help-circle-outline';
    }
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    // TODO: Persist to storage/API
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${dishData.dishName}\n\nCalories: ${dishData.nutrition.calories}\nProtein: ${dishData.nutrition.protein}g\nCarbs: ${dishData.nutrition.totalCarbohydrate}g\nFat: ${dishData.nutrition.totalFat}g\n\nAnalyzed with NutriLabelAI`,
        title: `${dishData.dishName} - Nutrition Info`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete History Item',
      `Are you sure you want to delete "${dishData.dishName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFoodEntry(dishId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.dishName}>{dishData.dishName}</Text>
              <View style={styles.metadataRow}>
                <MaterialCommunityIcons
                  name={getPrepStyleIcon()}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.metadataText}>{getPrepStyleLabel()}</Text>
                <MaterialCommunityIcons
                  name="circle-small"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.metadataText}>{formatDate(dishData.date)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleFavoriteToggle} style={styles.favoriteButton}>
              <MaterialCommunityIcons
                name={isFavorite ? 'star' : 'star-outline'}
                size={28}
                color={isFavorite ? colors.warning : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confidence Bar */}
        <ConfidenceBar confidence={dishData.confidence} showDetails={true} />

        {/* Quick Summary Panel */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="fire" size={32} color={colors.error} />
              <Text style={styles.summaryValue}>{dishData.nutrition.calories}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="food-steak" size={32} color={colors.primary} />
              <Text style={styles.summaryValue}>{dishData.nutrition.protein}g</Text>
              <Text style={styles.summaryLabel}>Protein</Text>
            </View>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="bread-slice" size={32} color="#FF9800" />
              <Text style={styles.summaryValue}>{dishData.nutrition.totalCarbohydrate}g</Text>
              <Text style={styles.summaryLabel}>Carbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="water" size={32} color="#2196F3" />
              <Text style={styles.summaryValue}>{dishData.nutrition.totalFat}g</Text>
              <Text style={styles.summaryLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Nutrition Label Card */}
        <NutritionLabelCard
          dishName={dishData.dishName}
          nutrition={dishData.nutrition}
          scrollable={true}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="delete" size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

type CD = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CD) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  headerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  dishName: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metadataText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.cardBackground,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    ...Shadows.sm,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.primary,
  },
  deleteButton: {
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
  },
  });
}


