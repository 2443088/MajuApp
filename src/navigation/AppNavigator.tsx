import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useStore } from '../context/StoreContext';
import { AuthScreen } from '../screens/AuthScreen';
import { CustomerFormScreen } from '../screens/CustomerFormScreen';
import { MenuFormScreen } from '../screens/MenuFormScreen';
import { OrderEditorScreen } from '../screens/OrderEditorScreen';
import { PosterStudioScreen } from '../screens/PosterStudioScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f9fafb', primary: '#dc2626' },
};

/**
 * Native Stack membuat tombol Back fisik Android berfungsi di setiap layar.
 * Tanpa login: layar Auth hanya ada selama belum ada sesi toko.
 */
export function AppNavigator() {
  const { session } = useStore();
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="OrderEditor" component={OrderEditorScreen} />
            <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
            <Stack.Screen name="MenuForm" component={MenuFormScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PosterStudio" component={PosterStudioScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
