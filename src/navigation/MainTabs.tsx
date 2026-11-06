import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { AddScreen } from '../screens/AddScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { SpaceScreen } from '../screens/SpaceScreen';
import { CustomTabBar } from './CustomTabBar';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Space" component={SpaceScreen} />
    </Tab.Navigator>
  );
}
