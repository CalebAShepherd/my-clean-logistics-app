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
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'MyRoutes') {
            iconName = 'list-outline';
          } else if (route.name === 'Notifications') {
            iconName = 'notifications-outline';
          } else if (route.name === 'Account') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingTop: 10,
          marginTop: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={TransporterDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyRoutes" component={RoutesScreen} options={{ title: 'My Routes' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function AdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Shipments') {
            iconName = 'list-outline';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics-outline';
          } else if (route.name === 'Announcements') {
            iconName = 'megaphone-outline';
          } else if (route.name === 'Account') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: '#fff',
          paddingTop: 10,
          marginTop: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Shipments' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function DispatcherTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Shipments') {
            iconName = 'list-outline';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics-outline';
          } else if (route.name === 'Account') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: '#fff',
          paddingTop: 10,
          marginTop: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={DispatcherDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} options={{ title: 'Shipments' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function ClientTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'MyShipments') {
            iconName = 'list-outline';
          } else if (route.name === 'TrackShipment') {
            iconName = 'map';
          } else if (route.name === 'Account') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#fff', paddingTop: 10, marginTop: 0 },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyShipments" component={MyShipmentsScreen} options={{ title: 'My Shipments' }} />
      <Tab.Screen name="TrackShipment" component={ShipmentTrackingScreen} options={{ title: 'Track Shipment' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function WarehouseAdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = 'cube-outline';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics-outline';
          } else if (route.name === 'Account') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#fff', paddingTop: 10, marginTop: 0 },
      })}
    >
      <Tab.Screen name="Home" component={WarehouseAdminDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Inventory" component={WarehouseInventoryScreen} options={{ title: 'Inventory' }} />
      <Tab.Screen name="Analytics" component={WarehouseAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Account' }} />
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
    </MainStack.Navigator>
  );
}

export default AppNavigator;
