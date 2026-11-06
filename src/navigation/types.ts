import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Menu: undefined;
  Add: undefined;
  History: undefined;
  Space: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  OrderEditor: { draftId?: string } | undefined;
  CustomerForm: { customerId?: string } | undefined;
  MenuForm: { menuId?: string } | undefined;
  Settings: undefined;
  PosterStudio: undefined;
};
