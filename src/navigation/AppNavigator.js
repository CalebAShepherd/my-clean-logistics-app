import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';

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
import { TouchableOpacity } from 'react-native';
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
import Warehouse2DBuilder from '../screens/Warehouse2DBuilder';
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
import CycleCountTaskDetailScreen from '../screens/CycleCountTaskDetailScreen';
import CreateCycleCountScreen from '../screens/CreateCycleCountScreen';
import MobileCycleCountScreen from '../screens/MobileCycleCountScreen';
import WarehouseWorkerDashboardScreen from '../screens/WarehouseWorkerDashboardScreen';
import WarehouseWorkerTasksScreen from '../screens/WarehouseWorkerTasksScreen';
import LoadingTaskDetailScreen from '../screens/LoadingTaskDetailScreen';
import QuickScanner from '../components/QuickScanner';
import AuditTrailScreen from '../screens/AuditTrailScreen';
import SoxControlsScreen from '../screens/SoxControlsScreen';
import SoxTestsScreen from '../screens/SoxTestsScreen';
import InsuranceClaimsScreen from '../screens/InsuranceClaimsScreen';
import CreateSoxControlScreen from '../screens/CreateSoxControlScreen';
import CreateInsuranceClaimScreen from '../screens/CreateInsuranceClaimScreen';
import CreateSoxTestScreen from '../screens/CreateSoxTestScreen';
import CRMAdminDashboardScreen from '../screens/CRMAdminDashboardScreen';
import CRMUsersScreen from '../screens/CRMUsersScreen';
import SalesRepDashboardScreen from '../screens/SalesRepDashboardScreen';
import AccountManagerDashboardScreen from '../screens/AccountManagerDashboardScreen';
import AccountsListScreen from '../screens/AccountsListScreen';
import LeadsPipelineScreen from '../screens/LeadsPipelineScreen';
import TicketsListScreen from '../screens/TicketsListScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import TasksListScreen from '../screens/TasksListScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';

// ERP Financial System Screens
import ERPFinancialDashboardScreen from '../screens/ERPFinancialDashboardScreen';
import InvoiceManagementScreen from '../screens/InvoiceManagementScreen';
import ExpenseManagementScreen from '../screens/ExpenseManagementScreen';
import FinancialReportsScreen from '../screens/FinancialReportsScreen';
import ChartOfAccountsScreen from '../screens/ChartOfAccountsScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import RecordExpenseScreen from '../screens/RecordExpenseScreen';
import JournalEntryScreen from '../screens/JournalEntryScreen';
import BudgetPlanningScreen from '../screens/BudgetPlanningScreen';

// Phase 2: Procurement & Vendor Management Screens
import ProcurementAnalyticsScreen from '../screens/ProcurementAnalyticsScreen';
import PurchaseRequisitionScreen from '../screens/PurchaseRequisitionScreen';
import PurchaseOrderScreen from '../screens/PurchaseOrderScreen';
import VendorScorecardScreen from '../screens/VendorScorecardScreen';
import SuppliersScreen from '../screens/SuppliersScreen';

// Phase 3: Asset & Maintenance Management Screens
import AssetManagementScreen from '../screens/AssetManagementScreen';
import AssetDetailsScreen from '../screens/AssetDetailsScreen';
import CreateAssetScreen from '../screens/CreateAssetScreen';
import AssetAnalyticsScreen from '../screens/AssetAnalyticsScreen';
import MaintenanceManagementScreen from '../screens/MaintenanceManagementScreen';
import WorkOrderDetailsScreen from '../screens/WorkOrderDetailsScreen';
import CreateWorkOrderScreen from '../screens/CreateWorkOrderScreen';
import FacilityManagementScreen from '../screens/FacilityManagementScreen';
import FacilityDetailsScreen from '../screens/FacilityDetailsScreen';
// Phase 3.2: Facility Maintenance & Compliance Screens
import FacilityMaintenanceScreen from '../screens/FacilityMaintenanceScreen';
import FacilityComplianceScreen from '../screens/FacilityComplianceScreen';
import FacilityMaintenanceLogsScreen from '../screens/FacilityMaintenanceLogsScreen';
import SafetyIncidentsScreen from '../screens/SafetyIncidentsScreen';
import EnvironmentalMonitoringScreen from '../screens/EnvironmentalMonitoringScreen';
import ComplianceAuditsScreen from '../screens/ComplianceAuditsScreen';
import FacilityMaintenanceAnalyticsScreen from '../screens/FacilityMaintenanceAnalyticsScreen';
import CreateMaintenanceLogScreen from '../screens/CreateMaintenanceLogScreen';
import CreateFacilityScreen from '../screens/CreateFacilityScreen';
import UtilityManagementScreen from '../screens/UtilityManagementScreen';
import FacilityAnalyticsScreen from '../screens/FacilityAnalyticsScreen';

// Phase 3.2: Space Optimization Screens
import SpaceOptimizationDashboardScreen from '../screens/SpaceOptimizationDashboardScreen';
import SlottingOptimizationScreen from '../screens/SlottingOptimizationScreen';
import SpaceTrendAnalysisScreen from '../screens/SpaceTrendAnalysisScreen';
import LayoutOptimizationScreen from '../screens/LayoutOptimizationScreen';
import SpaceOptimizationRecommendationsScreen from '../screens/SpaceOptimizationRecommendationsScreen';

// Phase 4: Advanced Cost Management Screens
import ActivityBasedCostingScreen from '../screens/ActivityBasedCostingScreen';
import BudgetingForecastingScreen from '../screens/BudgetingForecastingScreen';
import CostManagementDashboardScreen from '../screens/CostManagementDashboardScreen';

// Phase 5: Advanced Compliance & Risk Management Screens
import ComplianceDashboardScreen from '../screens/ComplianceDashboardScreen';
import DocumentManagementScreen from '../screens/DocumentManagementScreen';
import RiskAssessmentScreen from '../screens/RiskAssessmentScreen';
import ComplianceReportsScreen from '../screens/ComplianceReportsScreen';

// Phase 6: Integration & Optimization Screens
import IntegrationDashboardScreen from '../screens/IntegrationDashboardScreen';

import { MaterialCommunityIcons } from '@expo/vector-icons';

const AuthStack = createStackNavigator();
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
          } else if (route.name === 'Procurement') {
            iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
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

function WarehouseWorkerTabsNavigator() {
  const [showScanner, setShowScanner] = React.useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Tasks') {
              iconName = focused ? 'list-circle' : 'list-circle-outline';
            } else if (route.name === 'Scanner') {
              iconName = 'barcode';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 50,
                height: 50,
                borderRadius: 25,
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
        screenListeners={{
          tabPress: (e) => {
            if (e.target?.includes('Scanner')) {
              e.preventDefault();
              setShowScanner(true);
            }
          },
        }}
      >
        <Tab.Screen name="Dashboard" component={WarehouseWorkerDashboardScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Tasks" component={WarehouseWorkerTasksScreen} options={{ title: 'Tasks' }} />
        <Tab.Screen 
          name="Scanner" 
          component={View} 
          options={{ 
            title: 'Scanner',
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => setShowScanner(true)}
                style={props.style}
              >
                {props.children}
              </TouchableOpacity>
            )
          }} 
        />
        <Tab.Screen name="Profile" component={SettingsScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>

      <QuickScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(scanData) => {
          setShowScanner(false);
          // Handle scan result here if needed
          console.log('Scanned:', scanData);
        }}
        title="Warehouse Scanner"
      />
    </>
  );
}

function WarehouseWorkerNavigator() {
  const Stack = createStackNavigator();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WarehouseWorkerTabs" component={WarehouseWorkerTabsNavigator} />
      <Stack.Screen name="TaskDetail" component={CycleCountTaskDetailScreen} />
      <Stack.Screen name="CycleCountTaskDetail" component={CycleCountTaskDetailScreen} />
      <Stack.Screen name="LoadingTaskDetail" component={LoadingTaskDetailScreen} />
      <Stack.Screen name="MobileCycleCount" component={MobileCycleCountScreen} />
    </Stack.Navigator>
  );
}

function CRMAdminTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'domain' : 'domain';
          } else if (route.name === 'Leads') {
            iconName = focused ? 'account-multiple-plus' : 'account-multiple-plus-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: 25,
              marginBottom: focused ? 4 : 0,
            }}>
              <MaterialCommunityIcons name={iconName} size={focused ? 26 : 22} color={color} />
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
      })}
    >
      <Tab.Screen name="Home" component={CRMAdminDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Users" component={CRMUsersScreen} options={{ title: 'Users' }} />
      <Tab.Screen name="Accounts" component={AccountsListScreen} options={{ title: 'Accounts' }} />
      <Tab.Screen name="Leads" component={LeadsPipelineScreen} options={{ title: 'Leads' }} />
      <Tab.Screen name="Profile" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function SalesRepTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Pipeline') {
            iconName = focused ? 'funnel' : 'funnel-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'business' : 'business-outline';
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
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#34C759',
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
      })}
    >
      <Tab.Screen name="Home" component={SalesRepDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Pipeline" component={LeadsPipelineScreen} options={{ title: 'Pipeline' }} />
      <Tab.Screen name="Tasks" component={TasksListScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Accounts" component={AccountsListScreen} options={{ title: 'Accounts' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AccountManagerTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Support') {
            iconName = focused ? 'help-circle' : 'help-circle-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
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
              marginBottom: focused ? 4 : 0,
            }}>
              <Ionicons name={iconName} size={focused ? 26 : 22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#5856D6',
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
      })}
    >
      <Tab.Screen name="Home" component={AccountManagerDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Accounts" component={AccountsListScreen} options={{ title: 'Accounts' }} />
      <Tab.Screen name="Support" component={TicketsListScreen} options={{ title: 'Support' }} />
      <Tab.Screen name="Tasks" component={TasksListScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Account" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function RoleBasedNavigator() {
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

  // Return the appropriate tab navigator based on user role
  switch (user?.role) {
    case 'warehouse_admin':
      return <WarehouseAdminTabsNavigator />;
    case 'warehouse_worker':
      return <WarehouseWorkerNavigator />;
    case 'transporter':
      return <TransporterTabsNavigator />;
    case 'admin':
      return <AdminTabsNavigator />;
    case 'client':
      return <ClientTabsNavigator />;
    case 'dispatcher':
      return <DispatcherTabsNavigator />;
    case 'crm_admin':
      return <CRMAdminTabsNavigator />;
    case 'sales_rep':
      return <SalesRepTabsNavigator />;
    case 'account_manager':
      return <AccountManagerTabsNavigator />;
    case 'dev':
      return <AdminTabsNavigator />; // Dev users use admin interface
    default:
      return <ClientTabsNavigator />; // Default fallback
  }
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
      <MainStack.Screen name="Main" component={RoleBasedNavigator} />
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
      <MainStack.Screen name="Warehouse2DBuilder" component={Warehouse2DBuilder} options={{ title: '2D Warehouse Builder' }} />
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
        <MainStack.Screen name="CycleCountTaskDetail" component={CycleCountTaskDetailScreen} options={{ title: 'Task Details' }} />
        <MainStack.Screen name="CreateCycleCount" component={CreateCycleCountScreen} options={{ title: 'Create Cycle Count' }} />
        <MainStack.Screen name="MobileCycleCount" component={MobileCycleCountScreen} options={{ title: 'Cycle Counting' }} />
      
      {/* ERP Financial System Screens */}
      <MainStack.Screen name="ERPFinancialDashboard" component={ERPFinancialDashboardScreen} options={{ title: 'Financial Dashboard' }} />
      <MainStack.Screen name="InvoiceManagement" component={InvoiceManagementScreen} options={{ title: 'Invoice Management' }} />
      <MainStack.Screen name="BillingManagement" component={InvoiceManagementScreen} options={{ title: 'Billing Management' }} />
      <MainStack.Screen name="ExpenseManagement" component={ExpenseManagementScreen} options={{ title: 'Expense Management' }} />
      <MainStack.Screen name="FinancialReports" component={FinancialReportsScreen} options={{ title: 'Financial Reports' }} />
      <MainStack.Screen name="ChartOfAccounts" component={ChartOfAccountsScreen} options={{ title: 'Chart of Accounts' }} />
      <MainStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: 'Create Invoice' }} />
      <MainStack.Screen name="RecordExpense" component={RecordExpenseScreen} options={{ title: 'Record Expense' }} />
      <MainStack.Screen name="JournalEntry" component={JournalEntryScreen} options={{ title: 'Journal Entry' }} />
      <MainStack.Screen name="BudgetPlanning" component={BudgetPlanningScreen} options={{ title: 'Budget Planning' }} />
      
      {/* Phase 2: Procurement & Vendor Management Screens */}
      <MainStack.Screen name="ProcurementAnalytics" component={ProcurementAnalyticsScreen} options={{ title: 'Procurement Analytics' }} />
      <MainStack.Screen name="PurchaseRequisitionScreen" component={PurchaseRequisitionScreen} options={{ title: 'Purchase Requisitions' }} />
      <MainStack.Screen name="PurchaseOrderScreen" component={PurchaseOrderScreen} options={{ title: 'Purchase Orders' }} />
      <MainStack.Screen name="VendorScorecardScreen" component={VendorScorecardScreen} options={{ title: 'Vendor Scorecards' }} />
      <MainStack.Screen name="SuppliersScreen" component={SuppliersScreen} options={{ title: 'Suppliers' }} />
      
      {/* Phase 3: Asset & Maintenance Management Screens */}
      <MainStack.Screen name="AssetManagement" component={AssetManagementScreen} options={{ title: 'Asset Management' }} />
      <MainStack.Screen name="AssetDetails" component={AssetDetailsScreen} options={{ title: 'Asset Details' }} />
      <MainStack.Screen name="CreateAsset" component={CreateAssetScreen} options={{ title: 'Add Asset' }} />
      <MainStack.Screen name="AssetAnalytics" component={AssetAnalyticsScreen} options={{ title: 'Asset Analytics' }} />
      <MainStack.Screen name="MaintenanceManagement" component={MaintenanceManagementScreen} options={{ title: 'Maintenance Management' }} />
      <MainStack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} options={{ title: 'Work Order Details' }} />
      <MainStack.Screen name="CreateWorkOrder" component={CreateWorkOrderScreen} options={{ title: 'Create Work Order' }} />
              <MainStack.Screen name="FacilityManagement" component={FacilityManagementScreen} options={{ title: 'Facility Management' }} />
        <MainStack.Screen name="UtilityManagement" component={UtilityManagementScreen} options={{ title: 'Utility Management' }} />
      <MainStack.Screen name="FacilityDetails" component={FacilityDetailsScreen} options={{ title: 'Facility Details' }} />
      <MainStack.Screen name="CreateFacility" component={CreateFacilityScreen} options={{ title: 'Add Facility' }} />
      
      {/* Phase 3.2: Space Optimization Screens */}
      <MainStack.Screen name="SpaceOptimizationDashboard" component={SpaceOptimizationDashboardScreen} options={{ title: 'Space Optimization' }} />
      <MainStack.Screen name="SlottingOptimizationScreen" component={SlottingOptimizationScreen} options={{ title: 'Slotting Optimization' }} />
      <MainStack.Screen name="SpaceTrendAnalysisScreen" component={SpaceTrendAnalysisScreen} options={{ title: 'Capacity Trends' }} />
      <MainStack.Screen name="LayoutOptimizationScreen" component={LayoutOptimizationScreen} options={{ title: 'Layout Optimization' }} />
      <MainStack.Screen name="SpaceOptimizationRecommendations" component={SpaceOptimizationRecommendationsScreen} options={{ title: 'Recommendations' }} />

      {/* Phase 3.2 Facility Maintenance & Compliance Screens */}
      <MainStack.Screen name="FacilityMaintenance" component={FacilityMaintenanceScreen} options={{ title: 'Maintenance' }} />
      <MainStack.Screen name="FacilityCompliance" component={FacilityComplianceScreen} options={{ title: 'Compliance' }} />
      <MainStack.Screen name="FacilityMaintenanceLogs" component={FacilityMaintenanceLogsScreen} options={{ title: 'Maintenance Logs' }} />
      <MainStack.Screen name="SafetyIncidents" component={SafetyIncidentsScreen} options={{ title: 'Safety Incidents' }} />
      <MainStack.Screen name="EnvironmentalMonitoring" component={EnvironmentalMonitoringScreen} options={{ title: 'Environmental Monitoring' }} />
      <MainStack.Screen name="ComplianceAudits" component={ComplianceAuditsScreen} options={{ title: 'Compliance Audits' }} />
      <MainStack.Screen name="FacilityMaintenanceAnalytics" component={FacilityMaintenanceAnalyticsScreen} options={{ title: 'Maintenance Analytics' }} />
      <MainStack.Screen name="FacilityAnalytics" component={FacilityAnalyticsScreen} options={{ title: 'Facility Analytics' }} />
      <MainStack.Screen name="CreateMaintenanceLog" component={CreateMaintenanceLogScreen} options={{ title: 'Create Maintenance Log' }} />
      
      {/* Phase 4: Advanced Cost Management Screens */}
      <MainStack.Screen name="ActivityBasedCostingScreen" component={ActivityBasedCostingScreen} options={{ title: 'Activity-Based Costing' }} />
      <MainStack.Screen name="BudgetingForecastingScreen" component={BudgetingForecastingScreen} options={{ title: 'Budgeting & Forecasting' }} />
      <MainStack.Screen name="CostManagementDashboardScreen" component={CostManagementDashboardScreen} options={{ title: 'Cost Management Dashboard' }} />
      
      {/* Phase 5: Compliance & Risk Management Screens */}
      <MainStack.Screen name="ComplianceDashboard" component={ComplianceDashboardScreen} options={{ title: 'Compliance Dashboard' }} />
      <MainStack.Screen name="DocumentManagement" component={DocumentManagementScreen} options={{ title: 'Document Management' }} />
      <MainStack.Screen name="RiskAssessment" component={RiskAssessmentScreen} options={{ title: 'Risk Assessment' }} />
      <MainStack.Screen name="ComplianceReports" component={ComplianceReportsScreen} options={{ title: 'Compliance Reports' }} />
      <MainStack.Screen name="AuditTrail" component={AuditTrailScreen} options={{ title: 'Audit Logs' }} />
      <MainStack.Screen name="SoxControls" component={SoxControlsScreen} options={{ title: 'SOX Controls' }} />
      <MainStack.Screen name="SoxTests" component={SoxTestsScreen} options={{ title: 'SOX Tests' }} />
      <MainStack.Screen name="InsuranceClaims" component={InsuranceClaimsScreen} options={{ title: 'Insurance Claims' }} />
      <MainStack.Screen name="CreateSoxControl" component={CreateSoxControlScreen} options={{ title: 'Create SOX Control' }} />
      <MainStack.Screen name="CreateInsuranceClaim" component={CreateInsuranceClaimScreen} options={{ title: 'File Insurance Claim' }} />
      <MainStack.Screen name="CreateSoxTest" component={CreateSoxTestScreen} options={{ title: 'Create SOX Test' }} />

      {/* Phase 6: Integration & Optimization */}
      <MainStack.Screen name="IntegrationDashboard" component={IntegrationDashboardScreen} options={{ title: 'Integration Dashboard' }} />

      {/* CRM Screens */}
      <MainStack.Screen name="AccountsList" component={AccountsListScreen} options={{ title: 'Accounts' }} />
      <MainStack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: 'Account Details' }} />
      <MainStack.Screen name="LeadsPipeline" component={LeadsPipelineScreen} options={{ title: 'Leads Pipeline' }} />
      <MainStack.Screen name="TasksList" component={TasksListScreen} options={{ title: 'Tasks' }} />
      <MainStack.Screen name="TicketsList" component={TicketsListScreen} options={{ title: 'Support Tickets' }} />
      <MainStack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket Details' }} />
    </MainStack.Navigator>
  );
}

export default AppNavigator;
