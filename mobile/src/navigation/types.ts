import { NavigatorScreenParams } from '@react-navigation/native';

// Root Bottom Tab Navigator
export type RootTabParamList = {
  LabelStack: NavigatorScreenParams<LabelStackParamList>;
  HistoryStack: NavigatorScreenParams<HistoryStackParamList>;
  Explore: undefined;
  Profile: undefined;
};

// Label Stack Navigator
export type LabelStackParamList = {
  LabelHome: {
    prefillDish?: {
      dishName: string;
      targetCalories?: number;
      prepStyle?: 'home' | 'restaurant' | 'unknown';
    };
  };
  LabelResult: {
    dishName: string;
    calories?: number;
    style: 'standard' | 'detailed';
  };
};

// History Stack Navigator
export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryDetail: {
    dishId: string;
    dishName: string;
  };
};

// Navigation prop types
export type LabelStackNavigationProp = import('@react-navigation/native-stack').NativeStackNavigationProp<LabelStackParamList>;
export type HistoryStackNavigationProp = import('@react-navigation/native-stack').NativeStackNavigationProp<HistoryStackParamList>;
export type RootTabNavigationProp = import('@react-navigation/bottom-tabs').BottomTabNavigationProp<RootTabParamList>;
