import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Alert,
  RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useFoodContext } from '../context/FoodContext';
import { Spacing, Typography, BorderRadius } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { FoodEntry } from '../types/nutrition';
import { MealCategory } from '../services/storage';

const MEAL_ORDER: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};
const MEAL_ICONS: Record<MealCategory, string> = {
  breakfast: 'weather-sunset-up',
  lunch: 'weather-sunny',
  dinner: 'weather-night',
  snack: 'cookie',
};

function MacroBar({ label, value, goal, color, textSecondary, textMain, textTertiary, surfaceColor }: {
  label: string; value: number; goal: number; color: string;
  textSecondary: string; textMain: string; textTertiary: string; surfaceColor: string;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: textMain, fontWeight: '700' }}>
          {value.toFixed(0)}g <Text style={{ color: textTertiary, fontWeight: '400' }}>/ {goal}g</Text>
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: surfaceColor, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 3, width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }} />
      </View>
    </View>
  );
}

export const DailyConsumerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, displayName } = useAppTheme();
  const { getTodayEntries, deleteFoodEntry, getTotals, calorieGoal, macroGoals, streak } = useFoodContext();
  const [refreshing, setRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hour = new Date().getHours();
  const greetVerb = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingText = displayName ? `${greetVerb}, ${displayName}!` : 'Today';

  const todayEntries = getTodayEntries();
  const totals = getTotals();

  const grouped = useMemo(() => {
    const map = new Map<MealCategory, FoodEntry[]>();
    for (const cat of MEAL_ORDER) map.set(cat, []);
    for (const e of todayEntries) {
      map.get(e.mealCategory)?.push(e);
    }
    return map;
  }, [todayEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert('Delete Entry', `Remove "${entry.foodName}" from today?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFoodEntry(entry.id) },
    ]);
  };

  const progressPercent = calorieGoal > 0 ? Math.min(totals.calories / calorieGoal, 1) : 0;
  const progressColor =
    progressPercent >= 1 ? colors.error :
    progressPercent >= 0.85 ? colors.warning :
    colors.success;
  const caloriesRemaining = Math.max(calorieGoal - totals.calories, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{greetingText}</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={16} color="#F59E0B" />
              <Text style={styles.streakText}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Calorie progress card */}
        <Animatable.View animation="fadeInDown" duration={600}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressCalories}>{Math.round(totals.calories)}</Text>
                <Text style={styles.progressLabel}>of {calorieGoal} kcal goal</Text>
              </View>
              <View style={[styles.remainingBadge, { borderColor: progressColor + '55' }]}>
                <MaterialCommunityIcons name="fire" size={16} color={progressColor} />
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
        </Animatable.View>

        {/* Macro progress bars */}
        <Animatable.View animation="fadeInUp" delay={100} duration={500}>
          <View style={styles.macroCard}>
            <Text style={styles.macroCardTitle}>Macros</Text>
            <MacroBar label="Protein" value={totals.protein} goal={macroGoals.protein} color="#3B82F6"
              textSecondary={colors.textSecondary} textMain={colors.text} textTertiary={colors.textTertiary} surfaceColor={colors.surface} />
            <MacroBar label="Carbs"   value={totals.carbs}   goal={macroGoals.carbs}   color="#F59E0B"
              textSecondary={colors.textSecondary} textMain={colors.text} textTertiary={colors.textTertiary} surfaceColor={colors.surface} />
            <MacroBar label="Fat"     value={totals.fats}    goal={macroGoals.fat}      color="#EF4444"
              textSecondary={colors.textSecondary} textMain={colors.text} textTertiary={colors.textTertiary} surfaceColor={colors.surface} />
          </View>
        </Animatable.View>

        {/* Meal groups */}
        {todayEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animatable.View animation="bounceIn" duration={1200}>
              <MaterialCommunityIcons name="food-off" size={64} color={colors.textTertiary} style={{ alignSelf: 'center', marginBottom: Spacing.lg }} />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>Analyze a dish on the Label tab and save it to start tracking!</Text>
            </Animatable.View>
          </View>
        ) : (
          MEAL_ORDER.map((cat) => {
            const entries = grouped.get(cat) ?? [];
            if (entries.length === 0) return null;
            const catCals = entries.reduce((s, e) => s + e.calories, 0);
            return (
              <Animatable.View key={cat} animation="fadeInUp" duration={400}>
                <View style={styles.mealSection}>
                  <View style={styles.mealSectionHeader}>
                    <MaterialCommunityIcons name={MEAL_ICONS[cat] as any} size={18} color={colors.accent} />
                    <Text style={styles.mealSectionTitle}>{MEAL_LABELS[cat]}</Text>
                    <Text style={styles.mealSectionCals}>{Math.round(catCals)} kcal</Text>
                  </View>
                  {entries.map((item, idx) => (
                    <View key={item.id} style={styles.foodCard}>
                      <View style={styles.foodItemHeader}>
                        <View style={styles.foodNameContainer}>
                          <View style={styles.foodIconBadge}>
                            <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={colors.accent} />
                          </View>
                          <Text style={styles.foodName} numberOfLines={1}>{item.foodName}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton} activeOpacity={0.7}>
                          <MaterialCommunityIcons name="delete-outline" size={20} color={colors.textSecondary} />
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
                  ))}
                </View>
              </Animatable.View>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

type C = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: Spacing.lg },
    header: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontFamily: 'CrimsonPro_700Bold', fontSize: Typography.fontSize.xxl, color: colors.text },
    headerSubtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F59E0B22',
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
      borderColor: '#F59E0B44',
    },
    streakText: { fontSize: Typography.fontSize.md, fontWeight: '700', color: '#F59E0B' },
    streakLabel: { fontSize: 11, color: '#F59E0B', opacity: 0.8 },
    progressCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.md,
    },
    progressCalories: { fontSize: 36, fontWeight: '700', color: colors.text, lineHeight: 40 },
    progressLabel: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    remainingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderWidth: 1,
    },
    remainingText: { fontSize: Typography.fontSize.sm, fontWeight: '600' },
    progressBarTrack: {
      height: 8,
      backgroundColor: colors.surface,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressPercent: { fontSize: 11, color: colors.textTertiary, textAlign: 'right' },
    macroCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    macroCardTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: Spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    mealSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    mealSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mealSectionTitle: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: '700', color: colors.text },
    mealSectionCals: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    foodCard: {
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '80',
    },
    foodItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    foodNameContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
    foodIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    foodName: { flex: 1, fontSize: Typography.fontSize.md, fontWeight: '600', color: colors.text },
    deleteButton: { padding: Spacing.xs },
    nutritionGrid: { flexDirection: 'row', paddingTop: Spacing.xs },
    nutritionItem: { flex: 1, alignItems: 'center' },
    nutritionDivider: { width: 1, backgroundColor: colors.border },
    nutritionValue: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: colors.text },
    nutritionLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    emptyContainer: { alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },
    emptyText: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: Spacing.sm },
    emptySubtext: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl },
  });
}
