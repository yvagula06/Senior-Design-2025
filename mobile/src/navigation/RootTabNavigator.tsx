import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootTabParamList } from './types';
import { LabelStackNavigator } from './LabelStackNavigator';
import { HistoryStackNavigator } from './HistoryStackNavigator';
import { ExploreStackNavigator } from './ExploreStackNavigator';
import { ProfileScreen } from '../screens';
import { DailyConsumerScreen } from '../screens/DailyConsumerScreen';
import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_CONFIG: {
  route: keyof RootTabParamList;
  label: string;
  active: string;
  inactive: string;
}[] = [
  { route: 'LabelStack',    label: 'Label',   active: 'tag',             inactive: 'tag-outline' },
  { route: 'Today',         label: 'Today',   active: 'chart-donut',     inactive: 'chart-donut-variant' },
  { route: 'HistoryStack',  label: 'History', active: 'clock',           inactive: 'clock-outline' },
  { route: 'ExploreStack',  label: 'Explore', active: 'compass',         inactive: 'compass-outline' },
  { route: 'Profile',       label: 'Profile', active: 'account-circle',  inactive: 'account-circle-outline' },
];

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      tabStyles.bar,
      {
        backgroundColor: colors.cardBackground,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
      },
    ]}>
      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG[index];
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true } as any);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={tabStyles.item}
            activeOpacity={0.65}
          >
            {/* Active pill indicator at top */}
            <View style={[tabStyles.pill, focused && { backgroundColor: colors.accent }]} />

            <MaterialCommunityIcons
              name={(focused ? cfg.active : cfg.inactive) as any}
              size={25}
              color={focused ? colors.accent : colors.textTertiary}
            />
            <Text style={[
              tabStyles.label,
              { color: focused ? colors.accent : colors.textTertiary },
              focused && tabStyles.labelActive,
            ]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 24,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
  },
  pill: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '700',
  },
});

export const RootTabNavigator: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Tab.Screen name="LabelStack"   component={LabelStackNavigator} />
      <Tab.Screen name="Today"        component={DailyConsumerScreen} />
      <Tab.Screen name="HistoryStack" component={HistoryStackNavigator} />
      <Tab.Screen name="ExploreStack" component={ExploreStackNavigator} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
};
