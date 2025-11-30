import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </CardWrapper>
  );
};

interface NutritionCardProps {
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  dishName,
  calories,
  protein,
  carbs,
  fats,
  onPress,
  style,
}) => {
  return (
    <Card style={style} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{dishName}</Text>
        {onPress && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={AppColors.mediumGray}
          />
        )}
      </View>
      
      <View style={styles.caloriesContainer}>
        <Text style={styles.caloriesValue}>{calories}</Text>
        <Text style={styles.caloriesLabel}>calories</Text>
      </View>

      <View style={styles.macrosContainer}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{protein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{carbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{fats}g</Text>
          <Text style={styles.macroLabel}>Fats</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.darkGray,
    flex: 1,
  },
  caloriesContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: AppColors.accentLight,
    borderRadius: 8,
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: AppColors.accent,
  },
  caloriesLabel: {
    fontSize: 14,
    color: AppColors.mediumGray,
    marginTop: 4,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.darkGray,
  },
  macroLabel: {
    fontSize: 12,
    color: AppColors.mediumGray,
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    height: 40,
    backgroundColor: AppColors.lightGray,
  },
});
