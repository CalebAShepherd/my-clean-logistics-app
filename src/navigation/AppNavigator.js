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
import TransportManagementScreen from '../screens/TransportManagementScreen';
import ManageTransportersScreen from '../screens/ManageTransportersScreen';
import CreateTransporterScreen from '../screens/CreateTransporterScreen';
import AssignTransportersScreen from '../screens/AssignTransportersScreen';
import RouteOptimizationScreen from '../screens/RouteOptimizationScreen';
import RouteHistoryScreen from '../screens/RouteHistoryScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import RoutesScreen from '../screens/RoutesScreen';
import OffersScreen from '../screens/OffersScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InventoryManagementScreen from '../screens/InventoryManagementScreen';
import InboundShipmentsScreen from '../screens/InboundShipmentsScreen';
import OutboundShipmentsScreen from '../screens/OutboundShipmentsScreen';
import CreateInventoryItemScreen from '../screens/CreateInventoryItemScreen';
import InventoryItemDetailScreen from '../screens/InventoryItemDetailScreen';
import WarehouseAnalyticsScreen from '../screens/WarehouseAnalyticsScreen';
import WarehouseInventoryScreen from '../screens/WarehouseInventoryScreen';
import LocationsScreen from '../screens/LocationsScreen';
import CreateLocationScreen from '../screens/CreateLocationScreen';
import LocationDetailScreen from '../screens/LocationDetailScreen';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useStockAlerts from '../hooks/useStockAlerts';
import WarehouseAdminDashboardScreen from '../screens/WarehouseAdminDashboardScreen';
import TransporterDashboardScreen from '../screens/TransporterDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import DispatcherDashboardScreen from '../screens/DispatcherDashboardScreen';
import DevDashboardScreen from '../screens/DevDashboardScreen';

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
  useStockAlerts();
  const { user } = useContext(AuthContext);
  const { settings } = useSettings();
  if (!settings) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {user?.role === 'warehouse_admin' && (
        <Drawer.Screen name="WarehouseDashboard" component={WarehouseAdminDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'transporter' && (
        <Drawer.Screen name="TransporterDashboard" component={TransporterDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'dispatcher' && (
        <Drawer.Screen name="DispatcherDashboard" component={DispatcherDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'admin' && (
        <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'dev' && (
        <Drawer.Screen name="DevDashboard" component={DevDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {!['warehouse_admin','transporter','dispatcher','admin','dev'].includes(user?.role) && (
        <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {['transporter'].includes(user?.role) && (
        <Drawer.Screen name="Offers" component={OffersScreen} />
      )}
      <Drawer.Screen name="Create Shipment" component={CreateShipmentScreen} />
      <Drawer.Screen name="Shipment Tracking" component={ShipmentTrackingScreen} />
      
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Analytics" component={AnalyticsScreen} />}
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Routes" component={RoutesScreen} />}
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Route History" component={RouteHistoryScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Inventory Management" component={InventoryManagementScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Inbound Shipments" component={InboundShipmentsScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Outbound Shipments" component={OutboundShipmentsScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouse Analytics" component={WarehouseAnalyticsScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouse Inventory" component={WarehouseInventoryScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouses" component={WarehousesScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Locations" component={LocationsScreen} />}
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
        name="Transport Management"
        component={TransportManagementScreen}
        options={{ title: 'Transport Management', headerShown: true }}
      />
      <MainStack.Screen
        name="ShipmentDetail"
        component={ShipmentDetailScreen}
        options={{ title: 'Shipment Details' }}
      />
      <MainStack.Screen
        name="Route Optimization"
        component={RouteOptimizationScreen}
        options={{ title: 'Route Optimization', headerShown: true }}
      />
      <MainStack.Screen
        name="RouteDetail"
        component={RouteDetailScreen}
        options={{ title: 'Route Details', headerShown: true }}
      />
      <MainStack.Screen
        name="Manage Transporters"
        component={ManageTransportersScreen}
        options={{ title: 'Manage Transporters', headerShown: true }}
      />
      <MainStack.Screen
        name="Assign Transporters"
        component={AssignTransportersScreen}
        options={{ title: 'Assign Transporters', headerShown: true }}
      />
      <MainStack.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Shipments', headerShown: true }} />
      <MainStack.Screen name="User Management" component={AdminUsersScreen} options={{ title: 'User Management', headerShown: true }} />
      <MainStack.Screen name="Carrier Management" component={AdminCarriersScreen} options={{ title: 'Carrier Management', headerShown: true }} />
      <MainStack.Screen name="Company Settings" component={CompanySettingsScreen} options={{ title: 'Company Settings', headerShown: true }} />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerShown: true }} />
      <MainStack.Screen name="My Shipments" component={MyShipmentsScreen} options={{ title: 'My Shipments', headerShown: true }} />
      <MainStack.Screen name="Track Shipment" component={ShipmentTrackingScreen} options={{ title: 'Track Shipment', headerShown: true }} />
      <MainStack.Screen name="Inventory Management" component={InventoryManagementScreen} options={{ title: 'Inventory Management', headerShown: true }} />
      <MainStack.Screen name="Create Inventory Item" component={CreateInventoryItemScreen} options={{ title: 'Add Inventory Item', headerShown: true }} />
      <MainStack.Screen name="Inventory Item Detail" component={InventoryItemDetailScreen} options={{ title: 'Inventory Item Detail', headerShown: true }} />
      <MainStack.Screen name="Warehouse Analytics" component={WarehouseAnalyticsScreen} options={{ title: 'Warehouse Analytics', headerShown: true }} />
      <MainStack.Screen name="Warehouse Inventory" component={WarehouseInventoryScreen} options={{ title: 'Warehouse Inventory', headerShown: true }} />
      <MainStack.Screen name="Locations" component={LocationsScreen} options={{ title: 'Locations', headerShown: true }} />
      <MainStack.Screen name="Create Location" component={CreateLocationScreen} options={{ title: 'Add Location', headerShown: true }} />
      <MainStack.Screen name="Location Detail" component={LocationDetailScreen} options={{ title: 'Location Detail', headerShown: true }} />
    </MainStack.Navigator>
  );
}

export default AppNavigator;
