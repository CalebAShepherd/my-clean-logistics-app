import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, PanResponder, Modal, Text, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Animated, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchWarehouseItems } from '../api/warehouseItems';
import { getMyBlueprints, getBlueprintById } from '../api/blueprints';
import { blueprintTo3D } from '../utils/blueprintTo3D';
import { buildRackMesh } from '../utils/rackBuilder';
console.log('Warehouse3DHeatmapView loaded');

const getLayoutKey = (warehouseId) => `WAREHOUSE_LAYOUT_V2::${warehouseId || 'default'}`;

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

export default function Warehouse3DHeatmapView({ navigation }) {
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

  // Add layout selection state
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [currentLayoutId, setCurrentLayoutId] = useState(null);
  const [currentLayoutName, setCurrentLayoutName] = useState('Default Layout');
  const [loadingLayouts, setLoadingLayouts] = useState(false);

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
      if (!userToken) return;
      try {
        const items = await fetchWarehouseItems(userToken);
        const idMap = {};
        const labelMap = {};
        items.forEach(item => {
          if (item.locationId) idMap[item.locationId] = item;
          // Also map with "bin-" prefix for 3D layout compatibility
          if (item.locationId) idMap[`bin-${item.locationId}`] = item;
          const loc = item.Location;
          if (loc && loc.bin) labelMap[loc.bin] = item;
          // Also try mapping with item.id as fallback
          if (item.id) idMap[item.id] = item;
        });
        setWarehouseItemsMap({ idMap, labelMap });
        // Store full list for composite matching
        setWarehouseItemsList(items);
      } catch (err) {
        console.error('Error fetching warehouse items for heatmap:', err);
      }
    }
    loadWarehouseItems();
  }, [userToken]);

  // Refresh warehouse items when screen comes into focus (for new bins)
  useFocusEffect(
    React.useCallback(() => {
      if (userToken) {
        async function refreshWarehouseItems() {
          try {
            const items = await fetchWarehouseItems(userToken);
            const idMap = {};
            const labelMap = {};
            items.forEach(item => {
              if (item.locationId) idMap[item.locationId] = item;
              const loc = item.Location;
              if (loc && loc.bin) labelMap[loc.bin] = item;
            });
            setWarehouseItemsMap({ idMap, labelMap });
            setWarehouseItemsList(items);
          } catch (err) {
            console.error('Error refreshing warehouse items:', err);
          }
        }
        refreshWarehouseItems();
      }
    }, [userToken])
  );

  // Load saved layouts on mount
  useEffect(() => {
    loadSavedLayouts();
  }, [userToken]);
  
  // Refresh layouts when screen comes into focus (to pick up newly saved layouts)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Heatmap view focused, refreshing layouts...');
      loadSavedLayouts();
    }, [])
  );

  const loadSavedLayouts = async () => {
    try {
      setLoadingLayouts(true);
      
      // Load from multiple sources:
      // 1. Server-side blueprints (preferred)
      let layouts = [];
      
      try {
        const blueprints = await getMyBlueprints();
        layouts = blueprints.map(blueprint => ({
          id: blueprint.id,
          name: blueprint.name,
          warehouseName: blueprint.warehouse?.name || 'Unknown Warehouse',
          type: 'blueprint',
          data: blueprint,
          lastModified: blueprint.updatedAt || blueprint.createdAt,
        }));
      } catch (error) {
        console.warn('Could not load blueprints:', error);
      }
      
      // 2. Local AsyncStorage layouts (for backward compatibility)
      try {
        const localKeys = await AsyncStorage.getAllKeys();
        const layoutKeys = localKeys.filter(key => 
          key.startsWith('WAREHOUSE_LAYOUT_') || 
          key.startsWith('SAVED_LAYOUT_')
        );
        
        for (const key of layoutKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const layoutName = parsed.metadata?.name || 
                             key.replace('WAREHOUSE_LAYOUT_', '').replace('SAVED_LAYOUT_', '') || 
                             'Unnamed Layout';
            
            layouts.push({
              id: key,
              name: layoutName,
              warehouseName: parsed.metadata?.warehouseName || 'Local Storage',
              type: 'local',
              data: parsed,
              lastModified: parsed.metadata?.savedAt || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.warn('Could not load local layouts:', error);
      }
      
      // Sort by last modified (newest first)
      layouts.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      
      setSavedLayouts(layouts);
      
      // Auto-load the most recent layout if available
      if (layouts.length > 0 && !currentLayoutId) {
        await loadLayout(layouts[0]);
      }
      
    } catch (error) {
      console.error('Error loading saved layouts:', error);
    } finally {
      setLoadingLayouts(false);
    }
  };

  const loadLayout = async (layoutInfo) => {
    try {
      setLoading(true);
      let layoutData = null;
      
      if (layoutInfo.type === 'blueprint') {
        // Load blueprint and convert to 3D objects
        const blueprint = await getBlueprintById(layoutInfo.id);
        const objects3D = blueprintTo3D(blueprint);
        layoutData = {
          objects: objects3D,
          metadata: {
            name: blueprint.name,
            warehouseName: blueprint.warehouse?.name,
            source: 'blueprint',
            blueprintId: blueprint.id,
          }
        };
      } else {
        // Load local layout
        layoutData = layoutInfo.data;
      }
      
      if (layoutData?.objects) {
        setObjects(layoutData.objects);
        setCurrentLayoutId(layoutInfo.id);
        setCurrentLayoutName(layoutInfo.name);
        
        // Restore camera if available
        if (layoutData.camera) {
          cameraStateRef.current = {
            radius: layoutData.camera.radius || 15,
            theta: layoutData.camera.theta || Math.PI / 3,
            phi: layoutData.camera.phi || Math.PI / 4,
          };
          cameraTargetRef.current = layoutData.camera.target || { x: 0, y: 0, z: 0 };
        }
        
        console.log(`Loaded layout: ${layoutInfo.name} with ${layoutData.objects.length} objects`);
      }
      
    } catch (error) {
      console.error('Error loading layout:', error);
      Alert.alert('Error', 'Failed to load the selected warehouse layout.');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutSelection = (layoutId) => {
    const layout = savedLayouts.find(l => l.id === layoutId);
    if (layout) {
      loadLayout(layout);
      setShowLayoutPicker(false);
    }
  };

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

  // Modified initial load effect
  useEffect(() => {
    (async () => {
      // Don't auto-load if we have layouts - let user choose or use most recent
      if (savedLayouts.length === 0) {
        setLoading(true);
        // Try to get the most recent warehouse layout, fallback to default
        let json = null;
        const allKeys = await AsyncStorage.getAllKeys();
        const layoutKeys = allKeys.filter(key => key.startsWith('WAREHOUSE_LAYOUT_V2::'));
        
        if (layoutKeys.length > 0) {
          // Use the most recent warehouse layout
          const mostRecentKey = layoutKeys.sort().pop();
          json = await AsyncStorage.getItem(mostRecentKey);
        }
        
        if (!json) {
          // Fallback to default key
          json = await AsyncStorage.getItem(getLayoutKey());
        }
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
      }
    })();
  }, [savedLayouts.length]);

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
          // Helper to apply color to Mesh or Group
          const applyColorToMesh = (meshObj, colorValue, hslArgs = null) => {
            if (meshObj.material) {
              if (hslArgs) {
                meshObj.material.color.setHSL(...hslArgs);
              } else {
                meshObj.material.color.set(colorValue);
              }
            } else if (meshObj.children) {
              meshObj.children.forEach(child => {
                if (child.material) {
                  if (hslArgs) {
                    child.material.color.setHSL(...hslArgs);
                  } else {
                    child.material.color.set(colorValue);
                  }
                }
              });
            }
          };
          if (obj.id === selectedId) {
            applyColorToMesh(mesh, 0xffa500); // orange highlight
          } else if (activeHeatmapRef.current === 'binCapacity' && obj.type === 'bin') {
            // Map heatmap using idMap or labelMap for compatibility with new layouts
            const { idMap, labelMap } = warehouseItemsMapRef.current;
            const mapItem = idMap[obj.id] || idMap[obj.id.replace('bin-', '')] || labelMap[obj.label];
            if (mapItem && mapItem.maxThreshold > 0) {
              let freePct = (mapItem.maxThreshold - mapItem.quantity) / mapItem.maxThreshold;
              freePct = Math.max(0, Math.min(1, freePct));
              applyColorToMesh(mesh, null, [freePct * 0.33, 1, 0.5]);
            } else {
              applyColorToMesh(mesh, obj.color);
            }
          } else {
            applyColorToMesh(mesh, obj.color);
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

  // Rebuild meshes whenever objects change to render full rack shapes immediately
  useEffect(() => {
    if (!sceneRef.current) return;
    // Remove old meshes
    meshRefs.current.forEach(mesh => {
      if (sceneRef.current.children.includes(mesh)) {
        sceneRef.current.remove(mesh);
      }
    });
    // Create new meshes with detailed rack shapes
    meshRefs.current = objectsRef.current.map(obj => {
      let mesh;
      if (obj.type === 'rack') {
        mesh = buildRackMesh(obj);
      } else {
        const geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        const material = new THREE.MeshStandardMaterial({ color: obj.color });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      }
      sceneRef.current.add(mesh);
      return mesh;
    });
  }, [objects]);

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
          <Text style={styles.loadingSubtitle}>
            {loadingLayouts ? 'Loading warehouse layouts...' : 'Preparing warehouse visualization...'}
          </Text>
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
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>3D Heatmap</Text>
              <TouchableOpacity 
                style={styles.layoutSelector}
                onPress={() => setShowLayoutPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.layoutSelectorText} numberOfLines={1}>
                  {currentLayoutName}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="white" />
              </TouchableOpacity>
            </View>
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
        <View style={[styles.modalOverlay, { backgroundColor: 'white' }]}> 
          <SafeAreaView style={{ flex: 1 }}>
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

                  // Get bin data from warehouse items
                  const { idMap, labelMap } = warehouseItemsMap;
                  const binData = idMap[obj.id] || idMap[obj.id.replace('bin-', '')] || labelMap[obj.label];
                  
                  return (
                    <View style={styles.propertyContainer}>
                      {/* Component Type & Label */}
                      <View style={styles.componentHeader}>
                        <View style={styles.componentIcon}>
                          <MaterialCommunityIcons 
                            name={obj.type === 'bin' ? 'package-variant' : obj.type === 'rack' ? 'shelf' : 'cube-outline'} 
                            size={24} 
                            color="#007AFF" 
                          />
                        </View>
                        <View style={styles.componentInfo}>
                          <Text style={styles.componentType}>{obj.type.toUpperCase()}</Text>
                          <Text style={styles.componentLabel}>{obj.label}</Text>
                        </View>
                      </View>

                      {/* Location Hierarchy for Bins */}
                      {obj.type === 'bin' && binData?.Location && (
                        <View style={styles.locationSection}>
                          <Text style={styles.sectionTitle}>Location</Text>
                          <View style={styles.locationHierarchy}>
                            <View style={styles.locationItem}>
                              <MaterialCommunityIcons name="map-marker" size={16} color="#8E8E93" />
                              <Text style={styles.locationText}>
                                {[binData.Location.zone, binData.Location.rack, binData.Location.shelf, binData.Location.bin]
                                  .filter(Boolean)
                                  .join(' > ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Bin Capacity & Items */}
                      {obj.type === 'bin' && binData && (
                        <View style={styles.capacitySection}>
                          <Text style={styles.sectionTitle}>Capacity & Stock</Text>
                          
                          {/* Item Information */}
                          {binData.InventoryItem && (
                            <View style={styles.itemCard}>
                              <View style={styles.itemHeader}>
                                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#007AFF" />
                                <Text style={styles.itemName}>{binData.InventoryItem.name}</Text>
                              </View>
                              {binData.InventoryItem.sku && (
                                <Text style={styles.itemSku}>SKU: {binData.InventoryItem.sku}</Text>
                              )}
                            </View>
                          )}

                          {/* Stock Information */}
                          <View style={styles.stockGrid}>
                            <View style={styles.stockItem}>
                              <Text style={styles.stockLabel}>Current Stock</Text>
                              <Text style={styles.stockValue}>{binData.quantity || 0}</Text>
                            </View>
                            <View style={styles.stockItem}>
                              <Text style={styles.stockLabel}>Max Capacity</Text>
                              <Text style={styles.stockValue}>{binData.maxThreshold || 0}</Text>
                            </View>
                          </View>

                          {/* Utilization Bar */}
                          {binData.maxThreshold > 0 && (
                            <View style={styles.utilizationSection}>
                              <View style={styles.utilizationHeader}>
                                <Text style={styles.utilizationLabel}>Utilization</Text>
                                <Text style={styles.utilizationPercentage}>
                                  {((binData.quantity / binData.maxThreshold) * 100).toFixed(1)}%
                                </Text>
                              </View>
                              <View style={styles.utilizationBar}>
                                <View style={[
                                  styles.utilizationFill, 
                                  { 
                                    width: `${Math.min((binData.quantity / binData.maxThreshold) * 100, 100)}%`,
                                    backgroundColor: (binData.quantity / binData.maxThreshold) > 0.8 ? '#FF453A' : 
                                                    (binData.quantity / binData.maxThreshold) > 0.5 ? '#FFD60A' : '#34C759'
                                  }
                                ]} />
                              </View>
                            </View>
                          )}
                        </View>
                      )}
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
          </SafeAreaView>
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

      {/* Layout Picker Modal */}
      <Modal
        visible={showLayoutPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
                     <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Select Warehouse Layout</Text>
             <View style={styles.modalHeaderActions}>
               <TouchableOpacity 
                 onPress={loadSavedLayouts}
                 style={styles.modalActionButton}
                 disabled={loadingLayouts}
               >
                 <MaterialCommunityIcons 
                   name="refresh" 
                   size={20} 
                   color={loadingLayouts ? "#8E8E93" : "#007AFF"} 
                 />
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={() => setShowLayoutPicker(false)}
                 style={styles.modalCloseButton}
               >
                 <MaterialCommunityIcons name="close" size={24} color="#666" />
               </TouchableOpacity>
             </View>
           </View>

          <ScrollView style={styles.modalContent}>
            {loadingLayouts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading layouts...</Text>
              </View>
            ) : savedLayouts.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="floor-plan" size={64} color="#8E8E93" />
                <Text style={styles.emptyStateTitle}>No Saved Layouts</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Create warehouse layouts in the 2D Builder to view them in the heatmap.
                </Text>
                                 <TouchableOpacity 
                   style={styles.primaryButton}
                   onPress={() => {
                     setShowLayoutPicker(false);
                     if (navigation) {
                       navigation.navigate('Warehouse2DBuilder');
                     }
                   }}
                 >
                  <Text style={styles.primaryButtonText}>Create Layout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.layoutGrid}>
                {savedLayouts.map((layout) => (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      styles.layoutCard,
                      currentLayoutId === layout.id && styles.layoutCardSelected
                    ]}
                    onPress={() => handleLayoutSelection(layout.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.layoutCardHeader}>
                      <MaterialCommunityIcons 
                        name={layout.type === 'blueprint' ? 'floor-plan' : 'cube-outline'} 
                        size={24} 
                        color={currentLayoutId === layout.id ? '#007AFF' : '#8E8E93'} 
                      />
                      <Text style={[
                        styles.layoutCardTitle,
                        currentLayoutId === layout.id && styles.layoutCardTitleSelected
                      ]}>
                        {layout.name}
                      </Text>
                    </View>
                    
                    <Text style={styles.layoutCardSubtitle}>
                      {layout.warehouseName}
                    </Text>
                    
                    <View style={styles.layoutCardFooter}>
                      <Text style={styles.layoutCardMeta}>
                        {layout.type === 'blueprint' ? 'Server Blueprint' : 'Local Layout'}
                      </Text>
                      <Text style={styles.layoutCardDate}>
                        {new Date(layout.lastModified).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    {currentLayoutId === layout.id && (
                      <View style={styles.layoutCardCheckmark}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#34C759" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  layoutSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    maxWidth: 200,
  },
  layoutSelectorText: {
    fontSize: 14,
    color: 'white',
    marginRight: 4,
    fontWeight: '500',
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

  // Layout Picker Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActionButton: {
    padding: 8,
    marginRight: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  layoutCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  layoutCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  layoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  layoutCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  layoutCardTitleSelected: {
    color: '#007AFF',
  },
  layoutCardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    fontWeight: '500',
  },
  layoutCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  layoutCardMeta: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  layoutCardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  layoutCardCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  componentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  componentInfo: {
    flex: 1,
  },
  componentType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  componentLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  locationHierarchy: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 8,
    fontWeight: '500',
  },
  capacitySection: {
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  itemSku: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 28,
  },
  stockGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stockItem: {
    alignItems: 'center',
    flex: 1,
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  utilizationSection: {
    marginBottom: 16,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  utilizationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  utilizationPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
}); 