import React from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { useFoodContext } from '../context/FoodContext';
import { AppColors } from '../theme/colors';
import { FoodEntry } from '../types/nutrition';

export const DailyConsumerScreen: React.FC = () => {
  const { foodEntries, deleteFoodEntry, getTotals } = useFoodContext();
  const totals = getTotals();

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${entry.foodName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFoodEntry(entry.id);
            Alert.alert('Deleted', `Deleted entry for "${entry.foodName}"`);
          },
        },
      ]
    );
  };

  const renderFoodItem = ({ item }: { item: FoodEntry }) => (
    <Card style={styles.foodCard}>
      <Card.Content>
        <View style={styles.foodItemHeader}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <IconButton
            icon="delete"
            iconColor={AppColors.error}
            size={24}
            onPress={() => handleDelete(item)}
          />
        </View>
        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionText}>
            Calories: {item.calories.toFixed(0)} kcal
          </Text>
          <Text style={styles.nutritionText}>Protein: {item.protein.toFixed(1)} g</Text>
          <Text style={styles.nutritionText}>Carbs: {item.carbs.toFixed(1)} g</Text>
          <Text style={styles.nutritionText}>Fats: {item.fats.toFixed(1)} g</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (foodEntries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No entries saved yet.</Text>
        <Text style={styles.emptySubtext}>
          Add your first food entry to start tracking!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.totalsCard}>
        <Card.Content>
          <Text style={styles.totalsTitle}>Daily Totals</Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.calories.toFixed(0)}</Text>
              <Text style={styles.totalLabel}>Calories</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.protein.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Protein</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.carbs.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Carbs</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.fats.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Fats</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <FlatList
        data={foodEntries}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: AppColors.background,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: AppColors.mediumGray,
    textAlign: 'center',
  },
  totalsCard: {
    margin: 16,
    backgroundColor: AppColors.accent,
    elevation: 6,
    borderRadius: 16,
  },
  totalsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.white,
  },
  totalLabel: {
    fontSize: 12,
    color: AppColors.white,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  foodCard: {
    marginBottom: 12,
    backgroundColor: AppColors.white,
    elevation: 3,
    borderRadius: 12,
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.text,
    flex: 1,
  },
  nutritionInfo: {
    gap: 4,
  },
  nutritionText: {
    fontSize: 14,
    color: AppColors.darkGray,
  },
});
