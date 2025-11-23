import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, Pressable } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { useFoodContext } from '../context/FoodContext';
import { AppColors } from '../theme/colors';
import { FoodEntry } from '../types/nutrition';

export const DailyConsumerScreen: React.FC = () => {
  const { foodEntries, deleteFoodEntry, getTotals } = useFoodContext();
  const [refreshing, setRefreshing] = useState(false);
  const totals = getTotals();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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

  const renderFoodItem = ({ item, index }: { item: FoodEntry; index: number }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={index * 100}
      duration={600}
    >
      <Card style={styles.foodCard} elevation={4}>
        <Card.Content>
          <View style={styles.foodItemHeader}>
            <View style={styles.foodNameContainer}>
              <Text style={styles.foodEmoji}>🍽️</Text>
              <Text style={styles.foodName}>{item.foodName}</Text>
            </View>
            <Pressable
              onPress={() => handleDelete(item)}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed
              ]}
            >
              <IconButton
                icon="delete"
                iconColor={AppColors.white}
                size={20}
                style={styles.deleteIcon}
              />
            </Pressable>
          </View>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionIcon}>🔥</Text>
              <Text style={styles.nutritionValue}>{item.calories.toFixed(0)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionIcon}>💪</Text>
              <Text style={styles.nutritionValue}>{item.protein.toFixed(1)}</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionIcon}>🍞</Text>
              <Text style={styles.nutritionValue}>{item.carbs.toFixed(1)}</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionIcon}>🥑</Text>
              <Text style={styles.nutritionValue}>{item.fats.toFixed(1)}</Text>
              <Text style={styles.nutritionLabel}>Fats</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Animatable.View>
  );

  if (foodEntries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Animatable.View animation="bounceIn" duration={1200}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first food entry to start tracking your nutrition!
          </Text>
        </Animatable.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={800}>
        <Card style={styles.totalsCard} elevation={8}>
          <Card.Content>
            <Text style={styles.totalsTitle}>📊 Daily Totals</Text>
            <View style={styles.totalsGrid}>
              <Animatable.View 
                animation="bounceIn" 
                delay={200}
                style={styles.totalItem}
              >
                <View style={styles.totalCircle}>
                  <Text style={styles.totalEmoji}>🔥</Text>
                  <Text style={styles.totalValue}>{totals.calories.toFixed(0)}</Text>
                  <Text style={styles.totalLabel}>Calories</Text>
                </View>
              </Animatable.View>
              <Animatable.View 
                animation="bounceIn" 
                delay={300}
                style={styles.totalItem}
              >
                <View style={styles.totalCircle}>
                  <Text style={styles.totalEmoji}>💪</Text>
                  <Text style={styles.totalValue}>{totals.protein.toFixed(1)}g</Text>
                  <Text style={styles.totalLabel}>Protein</Text>
                </View>
              </Animatable.View>
              <Animatable.View 
                animation="bounceIn" 
                delay={400}
                style={styles.totalItem}
              >
                <View style={styles.totalCircle}>
                  <Text style={styles.totalEmoji}>🍞</Text>
                  <Text style={styles.totalValue}>{totals.carbs.toFixed(1)}g</Text>
                  <Text style={styles.totalLabel}>Carbs</Text>
                </View>
              </Animatable.View>
              <Animatable.View 
                animation="bounceIn" 
                delay={500}
                style={styles.totalItem}
              >
                <View style={styles.totalCircle}>
                  <Text style={styles.totalEmoji}>🥑</Text>
                  <Text style={styles.totalValue}>{totals.fats.toFixed(1)}g</Text>
                  <Text style={styles.totalLabel}>Fats</Text>
                </View>
              </Animatable.View>
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>

      <FlatList
        data={foodEntries}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.accent]}
            tintColor={AppColors.accent}
          />
        }
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
    padding: 40,
    backgroundColor: AppColors.background,
  },
  emptyEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: AppColors.mediumGray,
    textAlign: 'center',
    lineHeight: 24,
  },
  totalsCard: {
    margin: 20,
    marginBottom: 12,
    backgroundColor: AppColors.accent,
    borderRadius: 20,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  totalsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  totalItem: {
    alignItems: 'center',
    marginVertical: 8,
  },
  totalCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    width: 80,
    height: 80,
    padding: 8,
  },
  totalEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.white,
  },
  totalLabel: {
    fontSize: 10,
    color: AppColors.white,
    marginTop: 2,
    opacity: 0.9,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  foodCard: {
    marginBottom: 16,
    backgroundColor: AppColors.white,
    borderRadius: 16,
    shadowColor: AppColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  foodNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  foodEmoji: {
    fontSize: 24,
  },
  foodName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.text,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: AppColors.error,
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: '#D32F2F',
    transform: [{ scale: 0.95 }],
  },
  deleteIcon: {
    margin: 0,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AppColors.lightGray,
    borderRadius: 12,
    padding: 12,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.text,
  },
  nutritionLabel: {
    fontSize: 11,
    color: AppColors.mediumGray,
    marginTop: 2,
  },
});
