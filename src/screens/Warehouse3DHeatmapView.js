import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, PanResponder, Modal, Text, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Animated, TouchableOpacity, Alert } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouseItems } from '../api/warehouseItems';
console.log('Warehouse3DHeatmapView loaded');

const LAYOUT_KEY = 'WAREHOUSE_LAYOUT_V1';

// SlideOutMenu component
function SlideOutMenu({ visible, onClose, selectedTab, setSelectedTab, binHeatmapActive, setBinHeatmapActive, rackHeatmapActive, setRackHeatmapActive }) {
  const menuWidth = 260;
  const slideAnim = useRef(new Animated.Value(menuWidth)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : menuWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Always render the menu for animation, but pointerEvents none when hidden
  return (
    <Animated.View
      style={[
        styles.animatedMenuContainer,
        { transform: [{ translateX: slideAnim }], width: menuWidth },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SafeAreaView style={styles.slideMenuContainer} edges={['top', 'right']}>
        <View style={styles.tabBar}>
          <Text
            style={[styles.tab, selectedTab === 'bin' && styles.tabSelected]}
            onPress={() => setSelectedTab('bin')}
          >Bin Heatmaps</Text>
          <Text
            style={[styles.tab, selectedTab === 'rack' && styles.tabSelected]}
            onPress={() => setSelectedTab('rack')}
          >Rack Heatmaps</Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {selectedTab === 'bin' ? (
            <View style={styles.menuSection}>
              <Text
                style={[styles.menuButton, binHeatmapActive && styles.menuButtonActive]}
                onPress={() => {
                  setBinHeatmapActive(true);
                  setRackHeatmapActive(false);
                }}
              >Bin Capacity</Text>
            </View>
          ) : (
            <View style={styles.menuSection}>
              <Text
                style={[styles.menuButton, rackHeatmapActive && styles.menuButtonActive]}
                onPress={() => {
                  setRackHeatmapActive(true);
                  setBinHeatmapActive(false);
                }}
              >Rack Weight Capacity</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

export default function Warehouse3DHeatmapView() {
  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState([]);
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects || []; }, [objects]);
  const cameraStateRef = useRef({ radius: 10, theta: Math.PI / 4, phi: Math.PI / 4 });
  const cameraTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const glViewRef = useRef();
  const meshRefs = useRef([]);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const labelDivs = useRef([]);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastGesture = useRef({ distance: null, angle: null });
  const glLayout = useRef({
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('bin');
  const [activeHeatmap, setActiveHeatmap] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { userToken } = useContext(AuthContext);
  const [warehouseItemsMap, setWarehouseItemsMap] = useState({ idMap: {}, labelMap: {} });
  const warehouseItemsMapRef = useRef(warehouseItemsMap);
  useEffect(() => {
    warehouseItemsMapRef.current = warehouseItemsMap;
  }, [warehouseItemsMap]);
  const activeHeatmapRef = useRef(activeHeatmap);
  useEffect(() => { activeHeatmapRef.current = activeHeatmap; }, [activeHeatmap]);
  // State and ref for full items list for composite mapping
  const [warehouseItemsList, setWarehouseItemsList] = useState([]);
  const warehouseItemsListRef = useRef(warehouseItemsList);
  useEffect(() => { warehouseItemsListRef.current = warehouseItemsList; }, [warehouseItemsList]);

  const menuWidth = 260;
  const slideAnim = React.useRef(new Animated.Value(menuWidth)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? 0 : menuWidth,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [menuOpen]);

  useEffect(() => {
    async function loadWarehouseItems() {
      console.log('Fetching warehouse items for heatmap');
      if (!userToken) return;
      try {
        const items = await fetchWarehouseItems(userToken);
        console.log('Fetched warehouse items:', items);
        const idMap = {};
        const labelMap = {};
        items.forEach(item => {
          if (item.locationId) idMap[item.locationId] = item;
          const loc = item.Location;
          if (loc && loc.bin) labelMap[loc.bin] = item;
        });
        console.log('warehouseItemsMap building; id keys:', Object.keys(idMap), 'label keys:', Object.keys(labelMap));
        setWarehouseItemsMap({ idMap, labelMap });
        // Store full list for composite matching
        setWarehouseItemsList(items);
      } catch (err) {
        console.error('Error fetching warehouse items for heatmap:', err);
      }
    }
    loadWarehouseItems();
  }, [userToken]);

  // Control Functions
  const resetCameraView = () => {
    // Reset to a nice default camera position
    cameraStateRef.current = { 
      radius: 15, 
      theta: Math.PI / 3, 
      phi: Math.PI / 4 
    };
    cameraTargetRef.current = { x: 0, y: 0, z: 0 };
    
    // Show feedback
    Alert.alert('Camera Reset', 'View has been reset to default position', [{ text: 'OK' }]);
  };

  const fitToScreen = () => {
    if (!sceneRef.current || !cameraRef.current || objectsRef.current.length === 0) {
      Alert.alert('No Objects', 'No warehouse objects to fit in view', [{ text: 'OK' }]);
      return;
    }
    
    // Calculate bounding box of all objects
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    objectsRef.current.forEach(obj => {
      const { position, size } = obj;
      minX = Math.min(minX, position.x - size.x/2);
      maxX = Math.max(maxX, position.x + size.x/2);
      minY = Math.min(minY, position.y - size.y/2);
      maxY = Math.max(maxY, position.y + size.y/2);
      minZ = Math.min(minZ, position.z - size.z/2);
      maxZ = Math.max(maxZ, position.z + size.z/2);
    });
    
    // Calculate center and size
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeZ);
    
    // Set camera to fit the scene
    cameraTargetRef.current = { x: centerX, y: centerY, z: centerZ };
    cameraStateRef.current.radius = maxSize * 1.5; // Add some padding
    
    // Show feedback
    Alert.alert('View Adjusted', 'Camera positioned to fit all warehouse objects', [{ text: 'OK' }]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => !!evt && !!evt.nativeEvent && !!evt.nativeEvent.touches,
      onMoveShouldSetPanResponder: (evt) => !!evt && !!evt.nativeEvent && !!evt.nativeEvent.touches,
      onPanResponderGrant: (evt, gestureState) => {
        if (!evt || !evt.nativeEvent || !evt.nativeEvent.touches) return;
        if (evt.nativeEvent.touches.length === 1) {
          const { pageX, pageY } = evt.nativeEvent.touches[0];
          const selectX = pageX - glLayout.current.x;
          const selectY = pageY - glLayout.current.y;
          if (cameraRef.current && meshRefs.current.length > 0) {
            const { width, height } = glLayout.current;
            const x = (selectX / width) * 2 - 1;
            const y = -(selectY / height) * 2 + 1;
            const mouse = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(meshRefs.current);
            if (intersects.length > 0) {
              const objIdx = meshRefs.current.findIndex(m => m === intersects[0].object);
              const obj = objectsRef.current[objIdx];
              setSelectedId(obj.id);
              setShowProperties(true);
            } else {
              setSelectedId(null);
              setShowProperties(false);
            }
          }
          lastPan.current = {
            x: pageX,
            y: pageY,
          };
        } else if (evt.nativeEvent.touches.length === 2) {
          const [a, b] = evt.nativeEvent.touches;
          const currDist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const currAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          lastGesture.current = { distance: currDist, angle: currAngle };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!evt || !evt.nativeEvent || !evt.nativeEvent.touches) return;
        if (evt.nativeEvent.touches.length === 1) {
          const { pageX, pageY } = evt.nativeEvent.touches[0];
          if (lastPan.current.x !== undefined && lastPan.current.y !== undefined) {
            const dx = pageX - lastPan.current.x;
            const dy = pageY - lastPan.current.y;
            const { radius, theta } = cameraStateRef.current;
            const right = {
              x: Math.cos(theta),
              y: 0,
              z: -Math.sin(theta),
            };
            const forward = {
              x: Math.sin(theta),
              y: 0,
              z: Math.cos(theta),
            };
            const panScale = 0.002 * radius;
            cameraTargetRef.current = {
              x: cameraTargetRef.current.x - dx * right.x * panScale - dy * forward.x * panScale,
              y: cameraTargetRef.current.y,
              z: cameraTargetRef.current.z - dx * right.z * panScale - dy * forward.z * panScale,
            };
          }
          lastPan.current = { x: pageX, y: pageY };
        } else if (evt.nativeEvent.touches.length === 2) {
          const [a, b] = evt.nativeEvent.touches;
          const currDist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const currAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          const threshold = 500;
          if (lastGesture.current.distance !== null && lastGesture.current.angle !== null) {
            let { radius, theta, phi } = cameraStateRef.current;
            const deltaDist = currDist - lastGesture.current.distance;
            const deltaAngle = currAngle - lastGesture.current.angle;
            if (Math.abs(deltaDist) > Math.abs(deltaAngle * threshold)) {
              let nextRadius = radius - deltaDist * 0.04;
              nextRadius = Math.max(3, Math.min(30, nextRadius));
              cameraStateRef.current = { radius: nextRadius, theta, phi };
            }
            if (Math.abs(deltaAngle) > Math.abs(deltaDist / threshold)) {
              let nextTheta = theta + deltaAngle;
              cameraStateRef.current = { radius, theta: nextTheta, phi };
            }
          }
          lastGesture.current = { distance: currDist, angle: currAngle };
        }
      },
      onPanResponderRelease: (evt) => {
        if (!evt || !evt.nativeEvent || !evt.nativeEvent.touches) return;
        lastGesture.current = { distance: null, angle: null };
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: (evt) => {
        if (!evt || !evt.nativeEvent || !evt.nativeEvent.touches) return;
        lastGesture.current = { distance: null, angle: null };
      },
    })
  ).current;

  const tapTimeout = useRef(null);
  const lastTap = useRef(0);

  const handleSingleTap = (pageX, pageY) => {
    if (!meshRefs.current.length) return;
    const { width, height, x, y } = glLayout.current;
    const localX = pageX - x;
    const localY = pageY - y;
    const xNDC = (localX / width) * 2 - 1;
    const yNDC = -(localY / height) * 2 + 1;
    const mouse = new THREE.Vector2(xNDC, yNDC);
    if (!cameraRef.current) return;
    cameraRef.current.updateMatrixWorld();
    cameraRef.current.updateProjectionMatrix();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(meshRefs.current);
    if (intersects.length > 0) {
      const objIdx = meshRefs.current.findIndex(m => m === intersects[0].object);
      const obj = objectsRef.current[objIdx];
      if (obj) {
        setSelectedId(obj.id);
        setShowProperties(true);
      }
    } else {
      setSelectedId(null);
      setShowProperties(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const json = await AsyncStorage.getItem(LAYOUT_KEY);
      if (json) {
        let parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          setObjects(parsed);
        } else if (parsed && parsed.objects) {
          setObjects(parsed.objects);
          if (parsed.camera) {
            cameraStateRef.current = {
              radius: parsed.camera.radius,
              theta: parsed.camera.theta,
              phi: parsed.camera.phi,
            };
            cameraTargetRef.current = parsed.camera.target || { x: 0, y: 0, z: 0 };
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    glViewRef.current = { width, height };
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;
    const { radius, theta, phi } = cameraStateRef.current;
    const target = cameraTargetRef.current;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target.x, target.y, target.z);

    // Renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Create meshes for all objects
    meshRefs.current = objectsRef.current.map((obj) => {
      let geometry, material, mesh;
      if (obj.type === 'rack' || obj.type === 'bin') {
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        material = new THREE.MeshStandardMaterial({ color: obj.color });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      } else if (obj.type === 'wall') {
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        material = new THREE.MeshStandardMaterial({ color: obj.color });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      } else {
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        material = new THREE.MeshStandardMaterial({ color: obj.color });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      }
      scene.add(mesh);
      return mesh;
    });

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Animation loop
    const render = () => {
      requestAnimationFrame(render);
      // Update mesh positions (in case objects change)
      objectsRef.current.forEach((obj, idx) => {
        // Debug: log each object's id, label, and type
        // console.log('rendering object', obj.id, 'label:', obj.label, 'type:', obj.type);
        const mesh = meshRefs.current[idx];
        if (mesh) {
          mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
          if (obj.id === selectedId) {
            mesh.material.color.set(0xffa500); // orange highlight
          } else if (activeHeatmapRef.current === 'binCapacity' && obj.type === 'bin') {
            // Composite match by bin label and its containing shelf, aisle, and zone
            const itemsList = warehouseItemsListRef.current;
            // Identify the topmost shelf under the bin with stacking support
            const binBottomY = obj.position.y - obj.size.y / 2;
            const shelfCandidates = objectsRef.current.filter(o => o.type === 'shelf' &&
              Math.abs(o.position.x - obj.position.x) <= (o.size.x / 2 + obj.size.x / 2) &&
              Math.abs(o.position.z - obj.position.z) <= (o.size.z / 2 + obj.size.z / 2) &&
              (o.position.y + o.size.y / 2) <= binBottomY + 0.001
            );
            const shelfObj = shelfCandidates.length > 0
              ? shelfCandidates.reduce((prev, curr) => {
                  const prevTop = prev.position.y + prev.size.y / 2;
                  const currTop = curr.position.y + curr.size.y / 2;
                  return currTop > prevTop ? curr : prev;
                }, shelfCandidates[0])
              : undefined;
            const aisleObj = objectsRef.current.find(o => o.type === 'aisle'
              && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
              && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
            const zoneObj = objectsRef.current.find(o => o.type === 'zone'
              && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
              && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
            const shelfLabel = shelfObj?.label;
            const aisleLabel = aisleObj?.label;
            const zoneLabel = zoneObj?.label;
            // Composite lookup matching warehouse item record
            const item = itemsList.find(i => {
              const loc = i.Location;
              return loc
                && loc.bin === obj.label
                && loc.shelf === shelfLabel
                && loc.aisle === aisleLabel
                && loc.zone === zoneLabel;
            });
            if (item && item.maxThreshold > 0) {
              let freePct = (item.maxThreshold - item.quantity) / item.maxThreshold;
              freePct = Math.max(0, Math.min(1, freePct));
              // console.log(`heatmap bin ${obj.id} freePct:`, freePct, 'item:', item);
              mesh.material.color.setHSL(freePct * 0.33, 1, 0.5);
            } else {
              mesh.material.color.set(obj.color);
            }
          } else {
            mesh.material.color.set(obj.color);
          }
        }
      });
      // Camera
      const { radius, theta, phi } = cameraStateRef.current;
      const target = cameraTargetRef.current;
      cameraRef.current.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      cameraRef.current.lookAt(target.x, target.y, target.z);
      renderer.render(scene, cameraRef.current);
      gl.endFrameEXP();
    };
    render();
  };

  if (loading) {
    return (
      <LinearGradient 
        colors={['#1a1a1a', '#2d2d2d']} 
        style={styles.loadingContainer}
      >
        <View style={styles.loadingContent}>
          <MaterialCommunityIcons name="view-grid-plus" size={64} color="#007AFF" />
          <ActivityIndicator size="large" color="#007AFF" style={styles.loadingSpinner} />
          <Text style={styles.loadingTitle}>Loading 3D Heatmap</Text>
          <Text style={styles.loadingSubtitle}>Preparing warehouse visualization...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="view-grid-plus" size={24} color="white" />
            <Text style={styles.headerTitle}>3D Heatmap</Text>
          </View>
          <View style={styles.headerRight}>
            {activeHeatmap && (
              <View style={styles.heatmapIndicator}>
                <MaterialCommunityIcons name="circle" size={8} color="#34C759" />
                <Text style={styles.heatmapIndicatorText}>
                  {activeHeatmap === 'binCapacity' ? 'Bin Capacity' : 'Rack Weight'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* 3D View */}
      <GLView
        style={styles.glview}
        onContextCreate={onContextCreate}
        onLayout={e => {
          const { x, y, width, height } = e.nativeEvent.layout;
          glLayout.current = { x, y, width, height };
        }}
        {...panResponder.panHandlers}
      />
      
      {/* Floating Controls */}
      <View style={styles.floatingControls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          activeOpacity={0.8}
          onPress={resetCameraView}
        >
          <MaterialCommunityIcons name="rotate-3d-variant" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.controlButton} 
          activeOpacity={0.8}
          onPress={fitToScreen}
        >
          <MaterialCommunityIcons name="fit-to-screen" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.controlButton} 
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Heatmap Color Legend */}
      {activeHeatmap && (
        <View style={styles.legendContainer}>
          <View style={styles.legendHeader}>
            <MaterialCommunityIcons name="palette" size={16} color="#007AFF" />
            <Text style={styles.legendTitle}>
              {activeHeatmap === 'binCapacity' ? 'Capacity' : 'Weight'}
            </Text>
          </View>
          <View style={styles.legendContent}>
            <View style={styles.legendRow}>
              <View style={[styles.legendColor, { backgroundColor: '#34C759' }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendColor, { backgroundColor: '#FFD60A' }]} />
              <Text style={styles.legendText}>Medium</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendColor, { backgroundColor: '#FF453A' }]} />
              <Text style={styles.legendText}>High</Text>
            </View>
          </View>
        </View>
      )}
      {/* Enhanced Properties Panel Modal */}
      <Modal
        visible={showProperties}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProperties(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="information-outline" size={24} color="#007AFF" />
                <Text style={styles.modalTitle}>Component Details</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowProperties(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {(() => {
                const obj = objects.find(o => o.id === selectedId);
                                  if (!obj) return null;
                  return (
                    <View style={styles.propertyContainer}>
                      <View style={styles.propertyItem}>
                        <Text style={styles.modalLabel}>Type</Text>
                        <View style={styles.propertyValueContainer}>
                          <MaterialCommunityIcons 
                            name={obj.type === 'bin' ? 'package-variant' : 'cube-outline'} 
                            size={16} 
                            color="#007AFF" 
                          />
                          <Text style={styles.modalValue}>{obj.type}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.propertyItem}>
                        <Text style={styles.modalLabel}>Label</Text>
                        <Text style={styles.modalValue}>{obj.label}</Text>
                      </View>
                    {/* Show bin capacity details if this is a bin */}
                    {obj.type === 'bin' && (() => {
                      // Find parent shelf, aisle, zone in layout
                      // Identify the topmost shelf under the bin with stacking support
                      const binBottomY = obj.position.y - obj.size.y / 2;
                      const shelfCandidates = objectsRef.current.filter(o => o.type === 'shelf' &&
                        Math.abs(o.position.x - obj.position.x) <= (o.size.x / 2 + obj.size.x / 2) &&
                        Math.abs(o.position.z - obj.position.z) <= (o.size.z / 2 + obj.size.z / 2) &&
                        (o.position.y + o.size.y / 2) <= binBottomY + 0.001
                      );
                      const shelfObj = shelfCandidates.length > 0
                        ? shelfCandidates.reduce((prev, curr) => {
                            const prevTop = prev.position.y + prev.size.y / 2;
                            const currTop = curr.position.y + curr.size.y / 2;
                            return currTop > prevTop ? curr : prev;
                          }, shelfCandidates[0])
                        : undefined;
                      const aisleObj = objectsRef.current.find(o => o.type === 'aisle'
                        && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
                        && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
                      const zoneObj = objectsRef.current.find(o => o.type === 'zone'
                        && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
                        && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
                      const shelfLabel = shelfObj?.label;
                      const aisleLabel = aisleObj?.label;
                      const zoneLabel = zoneObj?.label;
                      // Lookup matching warehouse item
                      const heatmapItem = warehouseItemsList.find(i => {
                        const loc = i.Location;
                        return loc
                          && loc.bin === obj.label
                          && loc.shelf === shelfLabel
                          && loc.aisle === aisleLabel
                          && loc.zone === zoneLabel;
                      });
                      if (!heatmapItem) return null;
                      const pctUsed = (heatmapItem.quantity / heatmapItem.maxThreshold) * 100;
                      return (
                        <>
                          <View style={styles.propertyItem}>
                            <Text style={styles.modalLabel}>Item</Text>
                            <View style={styles.propertyValueContainer}>
                              <MaterialCommunityIcons name="package-variant-closed" size={16} color="#007AFF" />
                              <Text style={styles.modalValue}>{heatmapItem.InventoryItem.name}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.propertyItem}>
                            <Text style={styles.modalLabel}>Current Stock</Text>
                            <View style={styles.propertyValueContainer}>
                              <MaterialCommunityIcons name="counter" size={16} color="#34C759" />
                              <Text style={styles.modalValue}>{heatmapItem.quantity}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.propertyItem}>
                            <Text style={styles.modalLabel}>Max Capacity</Text>
                            <View style={styles.propertyValueContainer}>
                              <MaterialCommunityIcons name="gauge-full" size={16} color="#8E8E93" />
                              <Text style={styles.modalValue}>{heatmapItem.maxThreshold}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.propertyItem}>
                            <Text style={styles.modalLabel}>Utilization</Text>
                            <View style={styles.utilizationContainer}>
                              <View style={styles.utilizationBar}>
                                <View style={[
                                  styles.utilizationFill, 
                                  { 
                                    width: `${Math.min(pctUsed, 100)}%`,
                                    backgroundColor: pctUsed > 80 ? '#FF453A' : pctUsed > 50 ? '#FFD60A' : '#34C759'
                                  }
                                ]} />
                              </View>
                              <Text style={[styles.modalValue, { 
                                color: pctUsed > 80 ? '#FF453A' : '#1C1C1E',
                                fontWeight: '600'
                              }]}>
                                {`${pctUsed.toFixed(1)}%`}
                              </Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}
                    </View>
                  );
                })()}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowProperties(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Information Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="help-circle-outline" size={24} color="#007AFF" />
                <Text style={styles.modalTitle}>3D Controls Guide</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Navigation</Text>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="gesture-tap" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Tap objects to view details</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="gesture-swipe" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Drag to rotate the view</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="gesture-pinch" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Pinch to zoom in/out</Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Controls</Text>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Reset camera to default view</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="fit-to-screen" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Fit all objects in view</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="menu" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Open heatmap layers menu</Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Heatmap Colors</Text>
                <View style={styles.infoItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: '#34C759' }]} />
                  <Text style={styles.infoText}>Low utilization (0-50%)</Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: '#FFD60A' }]} />
                  <Text style={styles.infoText}>Medium utilization (50-80%)</Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={[styles.colorIndicator, { backgroundColor: '#FF453A' }]} />
                  <Text style={styles.infoText}>High utilization (80%+)</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Enhanced Slide-out Menu */}
      <Animated.View style={[styles.animatedMenuContainer, { transform: [{ translateX: slideAnim }], width: menuWidth, position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 20 }]}> 
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.slideMenuContainer}
        >
          <SafeAreaView style={styles.safeMenuArea} edges={['top', 'right']}>
            <View style={styles.menuHeader}>
              <MaterialCommunityIcons name="layers-triple" size={24} color="#007AFF" />
              <Text style={styles.menuHeaderTitle}>Heatmap Layers</Text>
            </View>
            
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'bin' && styles.tabSelected]}
                onPress={() => setSelectedTab('bin')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="package-variant" size={16} color={selectedTab === 'bin' ? '#007AFF' : '#8E8E93'} />
                <Text style={[styles.tabText, selectedTab === 'bin' && styles.tabTextSelected]}>
                  Bins
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'rack' && styles.tabSelected]}
                onPress={() => setSelectedTab('rack')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="shelf" size={16} color={selectedTab === 'rack' ? '#007AFF' : '#8E8E93'} />
                <Text style={[styles.tabText, selectedTab === 'rack' && styles.tabTextSelected]}>
                  Racks
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
              {selectedTab === 'bin' ? (
                <View style={styles.menuSection}>
                  <TouchableOpacity
                    style={[styles.menuButton, activeHeatmap === 'binCapacity' && styles.menuButtonActive]}
                    onPress={() => {
                      console.log('Bin Capacity clicked');
                      setActiveHeatmap('binCapacity');
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons 
                      name="gauge" 
                      size={20} 
                      color={activeHeatmap === 'binCapacity' ? '#007AFF' : '#8E8E93'} 
                    />
                    <Text style={[styles.menuButtonText, activeHeatmap === 'binCapacity' && styles.menuButtonTextActive]}>
                      Bin Capacity
                    </Text>
                    {activeHeatmap === 'binCapacity' && (
                      <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.menuSection}>
                  <TouchableOpacity
                    style={[styles.menuButton, activeHeatmap === 'rackWeightCapacity' && styles.menuButtonActive]}
                    onPress={() => {
                      console.log('Rack Weight Capacity clicked');
                      setActiveHeatmap('rackWeightCapacity');
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons 
                      name="weight" 
                      size={20} 
                      color={activeHeatmap === 'rackWeightCapacity' ? '#007AFF' : '#8E8E93'} 
                    />
                    <Text style={[styles.menuButtonText, activeHeatmap === 'rackWeightCapacity' && styles.menuButtonTextActive]}>
                      Weight Capacity
                    </Text>
                    {activeHeatmap === 'rackWeightCapacity' && (
                      <MaterialCommunityIcons name="check-circle" size={16} color="#34C759" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>
      
      {/* Enhanced Menu Toggle Button */}
      <Animated.View style={[styles.openTabContainer, {
        right: slideAnim.interpolate({ inputRange: [0, menuWidth], outputRange: [menuWidth, 0] }),
      }]}>
        <TouchableOpacity
          style={styles.menuToggleButton}
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={menuOpen ? 'chevron-right' : 'menu'}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: { 
    flex: 1, 
    backgroundColor: '#1a1a1a',
  },
  glview: { 
    flex: 1,
  },
  
  // Loading Screen
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    marginTop: 20,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatmapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heatmapIndicatorText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Floating Controls
  floatingControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    flexDirection: 'column',
    zIndex: 15,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  propertyContainer: {
    marginBottom: 20,
  },
  propertyItem: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  propertyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    marginLeft: 8,
  },
  utilizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  utilizationBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Information Modal Styles
  infoModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 500,
  },
  infoModalBody: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Slide-out Menu
  slideMenuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  safeMenuArea: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabSelected: {
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  tabTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  menuContent: {
    flex: 1,
    padding: 16,
  },
  menuSection: {
    marginBottom: 16,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuButtonActive: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
  menuButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Menu Toggle Button
  openTabContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -24,
    zIndex: 19,
  },
  menuToggleButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  // Heatmap Legend
  legendContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    zIndex: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendContent: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#1C1C1E',
    fontWeight: '500',
  },

  // Animated Container
  animatedMenuContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
  },
}); 