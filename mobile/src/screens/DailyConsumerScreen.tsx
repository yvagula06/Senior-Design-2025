import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useFoodContext } from '../context/FoodContext';
import { AppColors, Spacing, Typography, BorderRadius } from '../theme';
import { FoodEntry } from '../types/nutrition';

export const DailyConsumerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { foodEntries, deleteFoodEntry, getTotals, calorieGoal } = useFoodContext();
  const [refreshing, setRefreshing] = useState(false);
  const totals = getTotals();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert(
      'Delete Entry',
      `Remove "${entry.foodName}" from today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFoodEntry(entry.id),
        },
      ]
    );
  };

  const renderFoodItem = ({ item, index }: { item: FoodEntry; index: number }) => (
    <Animatable.View animation="fadeInUp" delay={index * 80} duration={400}>
      <View style={styles.foodCard}>
        <View style={styles.foodItemHeader}>
          <View style={styles.foodNameContainer}>
            <View style={styles.foodIconBadge}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={AppColors.accent} />
            </View>
            <Text style={styles.foodName} numberOfLines={1}>{item.foodName}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton} activeOpacity={0.7}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.calories.toFixed(0)}</Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.protein.toFixed(1)}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.carbs.toFixed(1)}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.fats.toFixed(1)}g</Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
          </View>
        </View>
      </View>
    </Animatable.View>
  );

  const progressPercent = Math.min(totals.calories / calorieGoal, 1);
  const progressColor =
    progressPercent >= 1 ? AppColors.error :
    progressPercent >= 0.85 ? AppColors.warning :
    AppColors.success;
  const caloriesRemaining = Math.max(calorieGoal - totals.calories, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
      </View>

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
        ListHeaderComponent={
          <Animatable.View animation="fadeInDown" duration={600}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressCalories}>{Math.round(totals.calories)}</Text>
                  <Text style={styles.progressLabel}>of {calorieGoal} kcal goal</Text>
                </View>
                <View style={styles.remainingBadge}>
                  <MaterialCommunityIcons name="fire" size={18} color={progressColor} />
                  <Text style={[styles.remainingText, { color: progressColor }]}>
                    {progressPercent >= 1 ? 'Goal reached!' : `${Math.round(caloriesRemaining)} left`}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.round(progressPercent * 100)}%` as any, backgroundColor: progressColor }]} />
              </View>
              <Text style={styles.progressPercent}>{Math.round(progressPercent * 100)}% of daily goal</Text>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.protein.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.carbs.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.fats.toFixed(1)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            {foodEntries.length > 0 && (
              <Text style={styles.entriesLabel}>
                {foodEntries.length} {foodEntries.length === 1 ? 'entry' : 'entries'} today
              </Text>
            )}
          </Animatable.View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Animatable.View animation="bounceIn" duration={1200}>
              <MaterialCommunityIcons name="food-off" size={64} color={AppColors.textTertiary} style={{ alignSelf: 'center', marginBottom: Spacing.lg }} />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>
                Analyze a dish on the Label tab and save it to start tracking!
              </Text>
            </Animatable.View>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: AppColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.xxl,
    color: AppColors.text,
  },
  headerSubtitle: { fontSize: Typography.fontSize.sm, color: AppColors.textSecondary, marginTop: 2 },
  listContent: { padding: Spacing.lg, paddingBottom: 80 },
  progressCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  progressCalories: { fontSize: 36, fontWeight: '700', color: AppColors.text, lineHeight: 40 },
  progressLabel: { fontSize: Typography.fontSize.sm, color: AppColors.textSecondary, marginTop: 2 },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  remainingText: { fontSize: Typography.fontSize.sm, fontWeight: '600' },
  progressBarTrack: {
    height: 8,
    backgroundColor: AppColors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressPercent: { fontSize: 11, color: AppColors.textTertiary, textAlign: 'right' },
  macroRow: {
    flexDirection: 'row',
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  macroItem: { flex: 1, alignItems: 'center' },
  macroDivider: { width: 1, backgroundColor: AppColors.border },
  macroValue: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: AppColors.text },
  macroLabel: { fontSize: 11, color: AppColors.textSecondary, marginTop: 2 },
  entriesLabel: { fontSize: Typography.fontSize.sm, color: AppColors.textSecondary, marginBottom: Spacing.sm, marginLeft: 2 },
  foodCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  foodNameContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  foodIconBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  foodName: { fontSize: Typography.fontSize.md, fontWeight: '600', color: AppColors.text, flex: 1 },
  deleteButton: { padding: 4, borderRadius: BorderRadius.sm },
  nutritionGrid: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  nutritionItem: { flex: 1, alignItems: 'center' },
  nutritionDivider: { width: 1, backgroundColor: AppColors.border },
  nutritionValue: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: AppColors.text },
  nutritionLabel: { fontSize: 10, color: AppColors.textSecondary, marginTop: 2 },
  emptyContainer: { paddingTop: 40, alignItems: 'center', paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: AppColors.text, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtext: { fontSize: Typography.fontSize.sm, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
