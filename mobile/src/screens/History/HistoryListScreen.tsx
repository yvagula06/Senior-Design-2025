import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import type { HistoryStackNavigationProp } from '../../navigation/types';
import { HistoryItemCard, type HistoryEntry } from '../../components/History';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { MacroPieChart } from '../../components/MacroPieChart';
import { 
  fetchHistoryEntries, 
  updateHistoryEntry, 
  deleteHistoryEntry 
} from '../../services/api';
import { 
  cacheHistoryEntries, 
  loadCachedHistory 
} from '../../services/storage';
import { useFoodContext } from '../../context/FoodContext';

type FilterType = 'all' | 'home' | 'restaurant';

export const HistoryListScreen: React.FC = () => {
  const navigation = useNavigation<HistoryStackNavigationProp>();
  const { foodEntries, getTotals, deleteFoodEntry } = useFoodContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletedItemIds, setDeletedItemIds] = useState<Set<string>>(new Set());

  /**
   * Load history entries from backend or cache
   * 
   * TODO: Backend Integration Steps:
   * 1. Implement GET /api/history endpoint
   * 2. Return array of HistoryEntry objects
   * 3. Sort by date descending (newest first)
   * 4. Handle pagination if needed (skip/limit params)
   * 5. Implement pull-to-refresh
   */
  useEffect(() => {
    loadHistory();
  }, [foodEntries]); // Re-load when foodEntries change

  const loadHistory = async () => {
    try {
      setIsLoading(true);

      // Try loading from cache first (offline support)
      const cached = await loadCachedHistory();
      if (cached.length > 0) {
        setHistoryData(mapHistoryData(cached));
      }

      // Then fetch from API
      // TODO: Remove mock data and enable API call
      // const entries = await fetchHistoryEntries();
      // setHistoryData(mapHistoryData(entries));
      // await cacheHistoryEntries(entries);

      // Mock data (remove when backend integrated)
      const mockData: HistoryEntry[] = [
        {
          id: '1',
          dishName: 'Butter Chicken with Basmati Rice',
          calories: 520,
          protein: 35,
          carbs: 45,
          fats: 18,
          confidence: 78,
          date: '2025-11-29',
          prepStyle: 'restaurant',
          isFavorite: true,
        },
        {
          id: '2',
          dishName: 'Chipotle Chicken Bowl',
          calories: 650,
          protein: 42,
          carbs: 58,
          fats: 22,
          confidence: 85,
          date: '2025-11-28',
          prepStyle: 'restaurant',
          isFavorite: false,
        },
      ];

      // Convert FoodContext entries to HistoryEntry format
      // Reverse to get newest first (FoodContext adds to end of array)
      const manualEntries: HistoryEntry[] = [...foodEntries].reverse().map((entry, index) => ({
        id: entry.id,
        dishName: entry.foodName,
        calories: Math.round(entry.calories),
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        confidence: 100, // Manual entries have 100% confidence
        date: new Date().toISOString().split('T')[0], // Today's date
        prepStyle: 'home' as const, // Default to home for manual entries
        isFavorite: false,
        timestamp: Date.now() - index, // Ensure newest entries appear first
      }));

      // Merge manual entries with mock data, excluding deleted items
      const allEntries = [...manualEntries, ...mockData];
      const filteredEntries = allEntries.filter(entry => !deletedItemIds.has(entry.id));
      
      // Sort by date (newest first), then by timestamp if available
      filteredEntries.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        // If dates are equal, use timestamp to maintain insertion order
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      
      setHistoryData(filteredEntries);

    } catch (error) {
      console.error('❌ [History] Failed to load history:', error);
      Alert.alert('Error', 'Failed to load history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Map API response to component format
   * Handles any differences between API schema and UI requirements
   */
  const mapHistoryData = (entries: any[]): HistoryEntry[] => {
    // TODO: Map backend HistoryEntry to component HistoryEntry
    return entries.map(entry => ({
      id: entry.id,
      dishName: entry.dish_name,
      calories: entry.calories,
      confidence: entry.confidence,
      date: entry.date,
      prepStyle: entry.prep_style,
      isFavorite: entry.is_favorite,
    }));
  };

  // Filter logic
  const filteredData = historyData.filter((item) => {
    const matchesSearch = item.dishName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      item.prepStyle === filterType;
    return matchesSearch && matchesFilter;
  });

  // Handle item press
  const handleItemPress = (item: HistoryEntry) => {
    navigation.navigate('HistoryDetail', {
      dishId: item.id,
      dishName: item.dishName,
    });
  };

  // Handle favorite toggle
  const handleFavorite = (itemId: string) => {
    setHistoryData((prevData) =>
      prevData.map((item) =>
        item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  // Calculate totals from all history entries (including mock data)
  const calculateHistoryTotals = () => {
    return historyData.reduce(
      (acc, entry) => {
        // Use actual macro values if available, otherwise estimate from calories
        // Typical ratio: 40% carbs, 30% protein, 30% fats
        const protein = entry.protein || ((entry.calories * 0.3) / 4); // 30% of cals ÷ 4 cal/g
        const carbs = entry.carbs || ((entry.calories * 0.4) / 4); // 40% of cals ÷ 4 cal/g
        const fats = entry.fats || ((entry.calories * 0.3) / 9); // 30% of cals ÷ 9 cal/g
        
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
            
            // Remove from local state
            setHistoryData((prevData) => prevData.filter((item) => item.id !== itemId));
            
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

  // Render hidden swipe actions with slide-in animation
  const renderHiddenItem = ({ item }: { item: HistoryEntry }, rowMap: any) => (
    <Animated.View style={styles.hiddenContainer}>
      {/* Favorite Button */}
      <TouchableOpacity
        style={[styles.hiddenButton, styles.favoriteButton]}
        activeOpacity={0.7}
        onPress={() => {
          handleFavorite(item.id);
          rowMap[item.id]?.closeRow();
        }}
      >
        <MaterialCommunityIcons
          name={item.isFavorite ? 'star' : 'star-outline'}
          size={28}
          color={AppColors.white}
        />
        <Text style={styles.hiddenButtonText}>
          {item.isFavorite ? 'Unfav' : 'Favorite'}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        style={[styles.hiddenButton, styles.deleteButton]}
        activeOpacity={0.7}
        onPress={() => {
          handleDelete(item.id, item.dishName);
          rowMap[item.id]?.closeRow();
        }}
      >
        <MaterialCommunityIcons name="delete" size={28} color={AppColors.white} />
        <Text style={styles.hiddenButtonText}>Delete</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={AppColors.mediumGray}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search past dishes…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={AppColors.mediumGray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={AppColors.mediumGray}
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
            filterType === 'home' && styles.filterChipActive,
          ]}
          onPress={() => setFilterType('home')}
        >
          <MaterialCommunityIcons
            name="home"
            size={16}
            color={filterType === 'home' ? AppColors.white : AppColors.mediumGray}
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
            color={filterType === 'restaurant' ? AppColors.white : AppColors.mediumGray}
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
        swipeToOpenPercent={20}
        swipeToClosePercent={20}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          historyData.length > 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Total Macronutrient Breakdown</Text>
              <MacroPieChart
                protein={historyTotals.protein}
                carbs={historyTotals.carbs}
                fats={historyTotals.fats}
                size={200}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="history"
              size={64}
              color={AppColors.mediumGray}
            />
            <Text style={styles.emptyTitle}>No history found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Start analyzing dishes to build your history'}
            </Text>
          </View>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: AppColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: AppColors.text,
    paddingVertical: Spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  chartCard: {
    backgroundColor: AppColors.background,
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
    color: AppColors.white,
    marginBottom: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipIcon: {
    marginRight: Spacing.xs,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.mediumGray,
  },
  filterChipTextActive: {
    color: AppColors.white,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  hiddenContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  hiddenButton: {
    width: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    backgroundColor: AppColors.accent,
  },
  deleteButton: {
    backgroundColor: AppColors.primary,
  },
  hiddenButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.white,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'CrimsonPro_600SemiBold',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
});
