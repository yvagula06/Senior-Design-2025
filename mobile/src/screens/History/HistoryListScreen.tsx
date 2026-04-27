import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import type { HistoryStackNavigationProp } from '../../navigation/types';
import { HistoryItemCard, type HistoryEntry } from '../../components/History';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { MacroPieChart } from '../../components/MacroPieChart';
import { useFoodContext } from '../../context/FoodContext';

type FilterType = 'all' | 'today' | 'home' | 'restaurant';

export const HistoryListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HistoryStackNavigationProp>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { foodEntries, getTotals, deleteFoodEntry, calorieGoal } = useFoodContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('today');
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletedItemIds, setDeletedItemIds] = useState<Set<string>>(new Set());
  const rowAnimatedValues = useRef<Record<string, Animated.Value>>({}).current;
  const barAnimValues = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  ).current;

  const getRowAnim = (id: string) => {
    if (!rowAnimatedValues[id]) rowAnimatedValues[id] = new Animated.Value(0);
    return rowAnimatedValues[id];
  };

  const getBarColor = (calories: number) => {
    if (calories <= 0) return 'transparent';
    if (calories > calorieGoal * 1.1) return colors.error;
    if (calories >= calorieGoal * 0.75) return colors.success;
    return colors.warning;
  };

  const onSwipeValueChange = ({ key, value }: { key: string; value: number }) => {
    getRowAnim(key).setValue(value);
  };

  // Derived history: synchronously computed from context + static mock data
  const historyData = useMemo<HistoryEntry[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const manualEntries: HistoryEntry[] = [...foodEntries].reverse().map((entry, index) => ({
      id: entry.id,
      dishName: entry.foodName,
      calories: Math.round(entry.calories),
      protein: entry.protein,
      carbs: entry.carbs,
      fats: entry.fats,
      confidence: 100,
      date: today,
      prepStyle: 'home' as const,
      isFavorite: favoritedIds.has(entry.id),
      timestamp: Date.now() - index,
    }));

    const mockEntries: HistoryEntry[] = [
      { id: 'mock1', dishName: 'Butter Chicken with Basmati Rice', calories: 520, protein: 35, carbs: 45, fats: 18, confidence: 78, date: '2025-11-29', prepStyle: 'restaurant', isFavorite: favoritedIds.has('mock1') },
      { id: 'mock2', dishName: 'Chipotle Chicken Bowl', calories: 650, protein: 42, carbs: 58, fats: 22, confidence: 85, date: '2025-11-28', prepStyle: 'restaurant', isFavorite: favoritedIds.has('mock2') },
    ];

    return [...manualEntries, ...mockEntries]
      .filter(entry => !deletedItemIds.has(entry.id))
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [foodEntries, deletedItemIds, favoritedIds]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Filter logic
  const today = new Date().toISOString().split('T')[0];
  const filteredData = historyData.filter((item) => {
    const matchesSearch = item.dishName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'today' && item.date === today) ||
      item.prepStyle === filterType;
    return matchesSearch && matchesFilter;
  });

  // Handle item press
  const handleItemPress = (item: HistoryEntry) => {
    navigation.navigate('HistoryDetail', {
      dishId: item.id,
      dishName: item.dishName,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      confidence: item.confidence,
      date: item.date,
      prepStyle: item.prepStyle,
    });
  };

  const handleFavorite = (itemId: string) => {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  // Calculate totals from all history entries (including mock data)
  const calculateHistoryTotals = () => {
    return historyData.reduce(
      (acc, entry) => {
        // Use actual macro values if available, otherwise estimate from calories
        // Typical ratio: 40% carbs, 30% protein, 30% fats
        const protein = entry.protein || ((entry.calories * 0.3) / 4); // 30% of cals  4 cal/g
        const carbs = entry.carbs || ((entry.calories * 0.4) / 4); // 40% of cals  4 cal/g
        const fats = entry.fats || ((entry.calories * 0.3) / 9); // 30% of cals  9 cal/g
        
        return {
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fats: acc.fats + fats,
        };
      },
      { protein: 0, carbs: 0, fats: 0 }
    );
  };

  // Calculate totals once to avoid multiple calls
  const historyTotals = calculateHistoryTotals();

  // Weekly calorie data from FoodContext entries (last 7 days)
  const weeklyData = React.useMemo(() => {
    const days: { label: string; date: string; calories: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      const calories = foodEntries
        .filter((e) => e.date === dateStr)
        .reduce((sum, e) => sum + e.calories, 0);
      days.push({ label, date: dateStr, calories });
    }
    return days;
  }, [foodEntries]);

  // Animate bars after any active navigation/interaction completes (prevents JS thread collision with tab fade)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const maxCal = Math.max(...weeklyData.map((d) => d.calories), calorieGoal, 1);
      weeklyData.forEach((day, i) => {
        const targetPx = day.calories > 0
          ? Math.max((day.calories / maxCal) * 72, 3)
          : 0;
        Animated.spring(barAnimValues[i], {
          toValue: targetPx,
          useNativeDriver: false,
          tension: 60,
          friction: 8,
        }).start();
      });
    });
    return () => task.cancel();
  }, [weeklyData, calorieGoal]);

  // Handle delete
  const handleDelete = (itemId: string, dishName: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${dishName}" from your history?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Add to deleted items set
            setDeletedItemIds(prev => new Set(prev).add(itemId));
            
            // If it's a FoodContext entry, also delete from there
            const isFromContext = foodEntries.some(entry => entry.id === itemId);
            if (isFromContext) {
              deleteFoodEntry(itemId);
            }
          },
        },
      ]
    );
  };

  // Render visible item
  const renderItem = ({ item }: { item: HistoryEntry }) => (
    <HistoryItemCard item={item} onPress={() => handleItemPress(item)} />
  );

  // Render hidden swipe actions with animated scale/opacity
  const renderHiddenItem = ({ item }: { item: HistoryEntry }, rowMap: any) => {
    const anim = getRowAnim(item.id);
    const scale = anim.interpolate({
      inputRange: [-170, -85, 0],
      outputRange: [1, 0.9, 0.6],
      extrapolate: 'clamp',
    });
    const opacity = anim.interpolate({
      inputRange: [-170, -60, 0],
      outputRange: [1, 0.9, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.hiddenContainer}>
        {/* Favorite Button */}
        <Animated.View style={[styles.hiddenButton, styles.favoriteButton, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity
            style={styles.hiddenButtonInner}
            activeOpacity={0.7}
            onPress={() => {
              handleFavorite(item.id);
              rowMap[item.id]?.closeRow();
            }}
          >
            <MaterialCommunityIcons
              name={item.isFavorite ? 'star' : 'star-outline'}
              size={28}
              color={colors.white}
            />
            <Text style={styles.hiddenButtonText}>
              {item.isFavorite ? 'Unfav' : 'Favorite'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Delete Button */}
        <Animated.View style={[styles.hiddenButton, styles.deleteButton, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity
            style={styles.hiddenButtonInner}
            activeOpacity={0.7}
            onPress={() => {
              handleDelete(item.id, item.dishName);
              rowMap[item.id]?.closeRow();
            }}
          >
            <MaterialCommunityIcons name="delete" size={28} color={colors.white} />
            <Text style={styles.hiddenButtonText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search past dishes"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterType === 'all' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'today' && styles.filterChipActive,
          ]}
          onPress={() => setFilterType('today')}
        >
          <MaterialCommunityIcons
            name="calendar-today"
            size={16}
            color={filterType === 'today' ? colors.white : colors.textSecondary}
            style={styles.filterChipIcon}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'today' && styles.filterChipTextActive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'home' && styles.filterChipActive,
          ]}
          onPress={() => setFilterType('home')}
        >
          <MaterialCommunityIcons
            name="home"
            size={16}
            color={filterType === 'home' ? colors.white : colors.textSecondary}
            style={styles.filterChipIcon}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'home' && styles.filterChipTextActive,
            ]}
          >
            Home style
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'restaurant' && styles.filterChipActive,
          ]}
          onPress={() => setFilterType('restaurant')}
        >
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={16}
            color={filterType === 'restaurant' ? colors.white : colors.textSecondary}
            style={styles.filterChipIcon}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'restaurant' && styles.filterChipTextActive,
            ]}
          >
            Restaurant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable List */}
      <SwipeListView
        data={filteredData}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        keyExtractor={(item) => item.id}
        rightOpenValue={-170}
        disableRightSwipe
        friction={10}
        tension={40}
        swipeToOpenPercent={20}
        swipeToClosePercent={20}
        onSwipeValueChange={onSwipeValueChange}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          historyData.length > 0 ? (
            <View>
              {/* Weekly calorie bar chart */}
              {weeklyData.some((d) => d.calories > 0) && (
                <View style={styles.weeklyCard}>
                  <View style={styles.weeklyHeader}>
                    <Text style={styles.weeklyTitle}>7-Day Calorie Trend</Text>
                    <Text style={styles.weeklyGoalLabel}>Goal: {calorieGoal} kcal</Text>
                  </View>
                  <View style={styles.weeklyChart}>
                    {weeklyData.map((day, i) => {
                      const isToday = day.date === today;
                      const barColor = getBarColor(day.calories);
                      const calLabel = day.calories >= 1000
                        ? `${(day.calories / 1000).toFixed(1)}k`
                        : day.calories > 0 ? Math.round(day.calories).toString() : '';
                      return (
                        <View key={day.date} style={styles.weeklyBar}>
                          <Text style={[styles.weeklyBarCal, isToday && { color: colors.accent }]}>
                            {calLabel}
                          </Text>
                          <View style={styles.weeklyBarTrack}>
                            <Animated.View style={[
                              styles.weeklyBarFill,
                              { height: barAnimValues[i], backgroundColor: barColor },
                            ]} />
                          </View>
                          <Text style={[styles.weeklyDayLabel, isToday && { color: colors.accent, fontWeight: '700' }]}>
                            {day.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* Legend */}
                  <View style={styles.weeklyLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                      <Text style={styles.legendText}>On target</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                      <Text style={styles.legendText}>Too low</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                      <Text style={styles.legendText}>Over limit</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Total Macronutrient Breakdown</Text>
                <MacroPieChart
                  protein={historyTotals.protein}
                  carbs={historyTotals.carbs}
                  fats={historyTotals.fats}
                  size={200}
                />
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIconContainer}>
              <MaterialCommunityIcons
                name="history"
                size={80}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery || filterType !== 'all'
                ? 'No meals found'
                : 'No History Yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start scanning and tracking meals to build your nutrition history!'}
            </Text>
            {!searchQuery && filterType === 'all' && (
              <View style={styles.emptyStateFeatures}>
                <View style={styles.emptyFeatureRow}>
                  <MaterialCommunityIcons name="food-apple" size={20} color={colors.success} />
                  <Text style={styles.emptyFeatureText}>Analyze dishes instantly</Text>
                </View>
                <View style={styles.emptyFeatureRow}>
                  <MaterialCommunityIcons name="chart-line" size={20} color={colors.success} />
                  <Text style={styles.emptyFeatureText}>Track your nutrition trends</Text>
                </View>
                <View style={styles.emptyFeatureRow}>
                  <MaterialCommunityIcons name="star" size={20} color={colors.success} />
                  <Text style={styles.emptyFeatureText}>Save favorite meals</Text>
                </View>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
};

type CS = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CS) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontFamily: 'CrimsonPro_700Bold',
      fontSize: Typography.fontSize.xxxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.sm,
    },
    searchIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.fontSize.md,
      color: colors.text,
      paddingVertical: Spacing.xs,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    chartCard: {
      backgroundColor: colors.background,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      ...Shadows.md,
      alignItems: 'center',
    },
    chartTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipIcon: {
      marginRight: Spacing.xs,
    },
    filterChipText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.white,
    },
    listContent: {
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xxl,
    },
    hiddenContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      borderRadius: BorderRadius.xl,
    },
    hiddenButton: {
      width: 85,
      alignSelf: 'stretch',
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    hiddenButtonInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteButton: {
      backgroundColor: colors.accent,
    },
    deleteButton: {
      backgroundColor: colors.danger,
    },
    hiddenButtonText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.white,
      marginTop: Spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyStateCard: {
      marginHorizontal: Spacing.xl,
      marginTop: Spacing.xxl,
      padding: Spacing.xxl,
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      ...Shadows.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyStateIconContainer: {
      width: 120,
      height: 120,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    emptyStateTitle: {
      fontFamily: 'CrimsonPro_700Bold',
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      marginBottom: Spacing.lg,
    },
    emptyStateFeatures: {
      width: '100%',
      gap: Spacing.md,
      marginTop: Spacing.sm,
    },
    emptyFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    emptyFeatureText: {
      fontSize: Typography.fontSize.sm,
      color: colors.text,
      fontWeight: Typography.fontWeight.medium,
    },
    weeklyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weeklyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    weeklyTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    weeklyGoalLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    weeklyChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      height: 100,
    },
    weeklyBar: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    weeklyBarCal: {
      fontSize: 9,
      color: colors.textTertiary,
      marginBottom: 2,
      textAlign: 'center',
    },
    weeklyBarTrack: {
      width: '100%',
      height: 72,
      backgroundColor: colors.surface,
      borderRadius: 4,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    weeklyBarFill: {
      width: '100%',
      borderRadius: 4,
    },
    weeklyDayLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
    },
    weeklyLegend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginTop: Spacing.md,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
}

