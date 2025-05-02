import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ShipmentsScreen from '../screens/ShipmentsScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import CreateShipmentScreen from '../screens/CreateShipmentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminCarriersScreen from '../screens/AdminCarriersScreen';
import ShipmentTrackingScreen from '../screens/ShipmentTrackingScreen';
import MyShipmentsScreen from '../screens/MyShipmentsScreen';
import CompanySettingsScreen from '../screens/CompanySettingsScreen';
import WarehousesScreen from '../screens/WarehousesScreen';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const AuthStack = createStackNavigator();
const Drawer = createDrawerNavigator();
const MainStack = createStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function CustomDrawerContent(props) {
  const { logout } = useContext(AuthContext);
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Logout"
        onPress={() => logout()}
      />
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  const { user } = useContext(AuthContext);
  const { settings } = useSettings();
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Shipments" component={ShipmentsScreen} />
      <Drawer.Screen name="Create Shipment" component={CreateShipmentScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="User Management" component={AdminUsersScreen} />
      <Drawer.Screen name="Carrier Management" component={AdminCarriersScreen} />
      {settings?.hasWarehouses && ['admin','dispatcher', 'dev'].includes(user.role) && (
        <Drawer.Screen name="Warehouses" component={WarehousesScreen} />
      )}
      <Drawer.Screen name="Company Settings" component={CompanySettingsScreen} />
      <Drawer.Screen name="Shipment Details" component={ShipmentDetailScreen} />
      <Drawer.Screen name="Shipment Tracking" component={ShipmentTrackingScreen} />
      <Drawer.Screen name="My Shipments" component={MyShipmentsScreen} />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { userToken, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userToken) {
    return <AuthNavigator />;
  }

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Main" component={DrawerNavigator} />
      <MainStack.Screen
        name="ShipmentDetail"
        component={ShipmentDetailScreen}
        options={{ title: 'Shipment Details' }}
      />
    </MainStack.Navigator>
  );
}

export default AppNavigator;
