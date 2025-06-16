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
import WarehouseHeatmapScreen from '../screens/WarehouseHeatmapScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminCarriersScreen from '../screens/AdminCarriersScreen';
import ShipmentTrackingScreen from '../screens/ShipmentTrackingScreen';
import MyShipmentsScreen from '../screens/MyShipmentsScreen';
import CompanySettingsScreen from '../screens/CompanySettingsScreen';
import FeatureManagementScreen from '../screens/FeatureManagementScreen';
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
import NotificationsScreen from '../screens/NotificationsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TrackingDetailsScreen from '../screens/TrackingDetailsScreen';
import ScheduledInboundShipmentsScreen from '../screens/ScheduledInboundShipmentsScreen';
import ScheduledOutboundShipmentsScreen from '../screens/ScheduledOutboundShipmentsScreen';
import DriversScreen from '../screens/DriversScreen';
import CreateDriverScreen from '../screens/CreateDriverScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import NewAnnouncementScreen from '../screens/NewAnnouncementScreen';
import WhiteLabelThemeScreen from '../screens/WhiteLabelThemeScreen';
import SKUAttributesScreen from '../screens/SKUAttributesScreen';
import CreateSKUAttributeScreen from '../screens/CreateSKUAttributeScreen';
import EditSKUAttributeScreen from '../screens/EditSKUAttributeScreen';
import CreateTransferOrderScreen from '../screens/CreateTransferOrderScreen';
import CreateDamageReportScreen from '../screens/CreateDamageReportScreen';
import DamageReportsScreen from '../screens/DamageReportsScreen';
import AddSupplierScreen from '../screens/AddSupplierScreen';
import Warehouse3DView from '../screens/Warehouse3DView';
import Warehouse3DHeatmapView from '../screens/Warehouse3DHeatmapView';
import ConversationListScreen from '../screens/ConversationListScreen';
import ChatScreen from '../screens/ChatScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import WaveManagementScreen from '../screens/WaveManagementScreen';
import PickListScreen from '../screens/PickListScreen';
import ASNManagementScreen from '../screens/ASNManagementScreen';
import ReceivingManagementScreen from '../screens/ReceivingManagementScreen';
import PutAwayManagementScreen from '../screens/PutAwayManagementScreen';
import DockManagementScreen from '../screens/DockManagementScreen';
import DockDoorDetailsScreen from '../screens/DockDoorDetailsScreen';
import AppointmentSchedulingScreen from '../screens/AppointmentSchedulingScreen';
import AppointmentDetailsScreen from '../screens/AppointmentDetailsScreen';
import CrossDockManagementScreen from '../screens/CrossDockManagementScreen';
import CycleCountManagementScreen from '../screens/CycleCountManagementScreen';
import CycleCountDetailsScreen from '../screens/CycleCountDetailsScreen';
import CreateCycleCountScreen from '../screens/CreateCycleCountScreen';
import MobileCycleCountScreen from '../screens/MobileCycleCountScreen';

const AuthStack = createStackNavigator();
const Drawer = createDrawerNavigator();
const MainStack = createStackNavigator();
const Tab = createBottomTabNavigator();

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

function TransporterTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyRoutes') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              // backgroundColor: focused ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 25,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
          backdropFilter: 'blur(20px)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 20,
          marginHorizontal: 4,
        },
        tabBarBackground: () => (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={TransporterDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyRoutes" component={RoutesScreen} options={{ title: 'Routes' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Shipments') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Announcements') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              // backgroundColor: focused ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { 
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 25,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
          backdropFilter: 'blur(20px)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 20,
          marginHorizontal: 2,
        },
        tabBarBackground: () => (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'News' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function DispatcherTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Shipments') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              // backgroundColor: focused ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { 
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 25,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
          backdropFilter: 'blur(20px)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 20,
          marginHorizontal: 4,
        },
        tabBarBackground: () => (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DispatcherDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function ClientTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyShipments') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'TrackShipment') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              // backgroundColor: focused ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { 
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 25,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
          backdropFilter: 'blur(20px)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 20,
          marginHorizontal: 4,
        },
        tabBarBackground: () => (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyShipments" component={MyShipmentsScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="TrackShipment" component={ShipmentTrackingScreen} options={{ title: 'Track' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function WarehouseAdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              // backgroundColor: focused ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { 
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 25,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
          backdropFilter: 'blur(20px)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 20,
          marginHorizontal: 4,
        },
        tabBarBackground: () => (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={WarehouseAdminDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Inventory" component={WarehouseInventoryScreen} options={{ title: 'Stock' }} />
      <Tab.Screen name="Analytics" component={WarehouseAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
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

  if (user?.role === 'warehouse_admin') {
    return <WarehouseAdminTabsNavigator />;
  }
  if (user?.role === 'transporter') {
    return <TransporterTabsNavigator />;
  }
  if (user?.role === 'admin') {
    return <AdminTabsNavigator />;
  }
  if (user?.role === 'client') {
    return <ClientTabsNavigator />;
  }
  if (user?.role === 'dispatcher') {
    return <DispatcherTabsNavigator />;
  }

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {user?.role === 'warehouse_admin' && (
        <Drawer.Screen name="WarehouseDashboard" component={WarehouseAdminDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'dispatcher' && (
        <Drawer.Screen name="DispatcherDashboard" component={DispatcherDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {user?.role === 'dev' && (
        <Drawer.Screen name="DevDashboard" component={DevDashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      {!['warehouse_admin','transporter','dispatcher','admin','dev'].includes(user?.role) && (
        <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      )}
      <Drawer.Screen name="Create Shipment" component={CreateShipmentScreen} />
      <Drawer.Screen name="Shipment Tracking" component={ShipmentTrackingScreen} />
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Analytics" component={AnalyticsScreen} />}
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Route History" component={RouteHistoryScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Inventory Management" component={InventoryManagementScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Inbound Shipments" component={InboundShipmentsScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Outbound Shipments" component={OutboundShipmentsScreen} />}
      {['admin','dev', 'warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouse Analytics" component={WarehouseAnalyticsScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouse Inventory" component={WarehouseInventoryScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Warehouses" component={WarehousesScreen} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Locations" component={LocationsScreen} options={{ title: 'Locations' }} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="SKU Attributes" component={SKUAttributesScreen} options={{ title: 'SKU Attributes' }} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Transfer Stocks" component={CreateTransferOrderScreen} options={{ title: 'Transfer Stocks' }} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Wave Management" component={WaveManagementScreen} options={{ title: 'Wave Management' }} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Pick Lists" component={PickListScreen} options={{ title: 'Pick Lists' }} />}
      {['admin','dev','warehouse_admin'].includes(user?.role) && <Drawer.Screen name="Cycle Count Management" component={CycleCountManagementScreen} options={{ title: 'Cycle Counting' }} />}
      {['admin','dispatcher'].includes(user?.role) && <Drawer.Screen name="Drivers" component={DriversScreen} options={{ title: 'Drivers' }} />}
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
      <MainStack.Screen name="Drivers" component={DriversScreen} options={{ title: 'Drivers' }} />
      <MainStack.Screen name="Create Driver" component={CreateDriverScreen} options={{ title: 'Add Driver' }} />
      <MainStack.Screen
        name="Transport Management"
        component={TransportManagementScreen}
        options={{ title: 'Transport Management' }}
      />
      <MainStack.Screen
        name="Shipment Details"
        component={ShipmentDetailScreen}
        options={{ title: 'Shipment Details' }}
      />
      <MainStack.Screen
        name="Route Optimization"
        component={RouteOptimizationScreen}
        options={{ title: 'Route Optimization' }}
      />
      <MainStack.Screen
        name="RouteDetail"
        component={RouteDetailScreen}
        options={{ title: 'Route Details' }}
      />
      <MainStack.Screen
        name="Manage Transporters"
        component={ManageTransportersScreen}
        options={{ title: 'Manage Transporters' }}
      />
      <MainStack.Screen
        name="Assign Transporters"
        component={AssignTransportersScreen}
        options={{ title: 'Assign Transporters' }}
      />
      <MainStack.Screen
        name="Create Shipment"
        component={CreateShipmentScreen}
        options={{ title: 'Create Shipment' }}
      />
      <MainStack.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Shipments' }} />
      <MainStack.Screen name="User Management" component={AdminUsersScreen} options={{ title: 'User Management' }} />
      <MainStack.Screen name="Carrier Management" component={AdminCarriersScreen} options={{ title: 'Carrier Management' }} />
      <MainStack.Screen name="Company Settings" component={CompanySettingsScreen} options={{ title: 'Company Settings' }} />
      <MainStack.Screen name="White Label Theme" component={WhiteLabelThemeScreen} options={{ title: 'White Label Theme' }} />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <MainStack.Screen name="My Shipments" component={MyShipmentsScreen} options={{ title: 'My Shipments' }} />
      <MainStack.Screen name="Track Shipment" component={ShipmentTrackingScreen} options={{ title: 'Track Shipment' }} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <MainStack.Screen name="WarehouseHeatmap" component={WarehouseHeatmapScreen} options={{ title: 'Rack Utilization Heatmap' }} />
      <MainStack.Screen name="Inventory Management" component={InventoryManagementScreen} options={{ title: 'Inventory Management' }} />
      <MainStack.Screen name="Create Inventory Item" component={CreateInventoryItemScreen} options={{ title: 'Add Inventory Item' }} />
      <MainStack.Screen name="Inventory Item Detail" component={InventoryItemDetailScreen} options={{ title: 'Inventory Item Detail' }} />
      <MainStack.Screen name="Add New Supplier" component={AddSupplierScreen} options={{ title: 'Add New Supplier' }} />
      <MainStack.Screen name="Warehouse Analytics" component={WarehouseAnalyticsScreen} options={{ title: 'Warehouse Analytics' }} />
      <MainStack.Screen name="Warehouse Inventory" component={WarehouseInventoryScreen} options={{ title: 'Warehouse Inventory' }} />
      <MainStack.Screen name="Locations" component={LocationsScreen} options={{ title: 'Locations' }} />
      <MainStack.Screen name="Create Location" component={CreateLocationScreen} options={{ title: 'Add Location' }} />
      <MainStack.Screen name="Location Detail" component={LocationDetailScreen} options={{ title: 'Location Detail' }} />
      <MainStack.Screen name="Routes" component={RoutesScreen} options={{ title: 'Routes' }} />
      <MainStack.Screen name="Offers" component={OffersScreen} options={{ title: 'Offers' }} />
      <MainStack.Screen name="Tracking Details" component={TrackingDetailsScreen} options={{ title: 'Tracking Details' }} />
      <MainStack.Screen name="Scheduled Inbound Shipments" component={ScheduledInboundShipmentsScreen} options={{ title: 'Scheduled Inbound Shipments' }} />
      <MainStack.Screen name="Scheduled Outbound Shipments" component={ScheduledOutboundShipmentsScreen} options={{ title: 'Scheduled Outbound Shipments' }} />
      <MainStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <MainStack.Screen name="New Announcement" component={NewAnnouncementScreen} options={{ title: 'Create Announcement' }} />
      <MainStack.Screen name="SKU Attributes" component={SKUAttributesScreen} options={{ title: 'SKU Attributes' }} />
      <MainStack.Screen name="Create SKU Attribute" component={CreateSKUAttributeScreen} options={{ title: 'Create SKU Attribute' }} />
      <MainStack.Screen name="Edit SKU Attribute" component={EditSKUAttributeScreen} options={{ title: 'Edit SKU Attribute' }} />
      <MainStack.Screen name="Transfer Stocks" component={CreateTransferOrderScreen} options={{ title: 'Initiate Transfer' }} />
      <MainStack.Screen name="Log Incident" component={CreateDamageReportScreen} options={{ title: 'Log Incident' }} />
      <MainStack.Screen name="Incident Reports" component={DamageReportsScreen} options={{ title: 'Incident Reports' }} />
      <MainStack.Screen name="Warehouse3DView" component={Warehouse3DView} options={{ title: '3D Warehouse View' }} />
      <MainStack.Screen name="Warehouse3DHeatmapView" component={Warehouse3DHeatmapView} options={{ title: '3D Warehouse Heatmap' }} />
      <MainStack.Screen name="Conversations" component={ConversationListScreen} options={{ title: 'Conversations'}} />
      <MainStack.Screen name="NewConversation" component={NewConversationScreen} options={{ title: 'New Conversation'}} />
      <MainStack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.name || 'Chat'})} />
      <MainStack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: 'Group Info'}} />
      <MainStack.Screen name="Feature Management" component={FeatureManagementScreen} options={{ title: 'Feature Management' }} />
      <MainStack.Screen name="Wave Management" component={WaveManagementScreen} options={{ title: 'Wave Management' }} />
      <MainStack.Screen name="Pick Lists" component={PickListScreen} options={{ title: 'Pick Lists' }} />
      
      {/* Phase 3: Receiving & Put-Away Management Screens */}
      <MainStack.Screen name="ASNManagement" component={ASNManagementScreen} options={{ title: 'ASN Management' }} />
      <MainStack.Screen name="ReceivingManagement" component={ReceivingManagementScreen} options={{ title: 'Receiving Management' }} />
      <MainStack.Screen name="PutAwayManagement" component={PutAwayManagementScreen} options={{ title: 'Put-Away Management' }} />
      <MainStack.Screen name="DockManagement" component={DockManagementScreen} options={{ title: 'Dock Management' }} />
      <MainStack.Screen name="DockDoorDetails" component={DockDoorDetailsScreen} options={{ title: 'Dock Door Details' }} />
      <MainStack.Screen name="AppointmentScheduling" component={AppointmentSchedulingScreen} options={{ title: 'Appointments' }} />
      <MainStack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} options={{ title: 'Appointment Details' }} />
      <MainStack.Screen name="CrossDockManagement" component={CrossDockManagementScreen} options={{ title: 'Cross-Docking' }} />
      
      {/* Cycle Counting System Screens */}
      <MainStack.Screen name="CycleCountManagement" component={CycleCountManagementScreen} options={{ title: 'Cycle Count Management' }} />
      <MainStack.Screen name="CycleCountDetails" component={CycleCountDetailsScreen} options={{ title: 'Cycle Count Details' }} />
      <MainStack.Screen name="CreateCycleCount" component={CreateCycleCountScreen} options={{ title: 'Create Cycle Count' }} />
      <MainStack.Screen name="MobileCycleCount" component={MobileCycleCountScreen} options={{ title: 'Cycle Counting' }} />
    </MainStack.Navigator>
  );
}

export default AppNavigator;
