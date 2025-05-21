import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, PanResponder, Modal, Text, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Animated } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text as RNText } from 'react-native';
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
            // Find parent shelf, aisle, zone based on positions
            const shelfObj = objectsRef.current.find(o => o.type === 'shelf'
              && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
              && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GLView
        style={styles.glview}
        onContextCreate={onContextCreate}
        onLayout={e => {
          const { x, y, width, height } = e.nativeEvent.layout;
          glLayout.current = { x, y, width, height };
        }}
        {...panResponder.panHandlers}
      />
      {/* Properties Panel Modal (read-only) */}
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
            <ScrollView style={{ paddingBottom: 30 }}>
              <Text style={styles.modalTitle}>Component Properties</Text>
              {(() => {
                const obj = objects.find(o => o.id === selectedId);
                if (!obj) return null;
                return (
                  <>
                    <Text style={styles.modalLabel}>ID</Text>
                    <Text style={styles.modalValue}>{obj.id}</Text>
                    <Text style={styles.modalLabel}>Type</Text>
                    <Text style={styles.modalValue}>{obj.type}</Text>
                    <Text style={styles.modalLabel}>Label</Text>
                    <Text style={styles.modalValue}>{obj.label}</Text>
                    <Text style={styles.modalLabel}>Size (x, y, z)</Text>
                    <Text style={styles.modalValue}>{`${obj.size.x}, ${obj.size.y}, ${obj.size.z}`}</Text>
                    <Text style={styles.modalLabel}>Color (hex)</Text>
                    <Text style={styles.modalValue}>{typeof obj.color === 'number' ? `#${obj.color.toString(16).padStart(6, '0')}` : obj.color}</Text>
                    {/* Show bin capacity details if this is a bin */}
                    {obj.type === 'bin' && (() => {
                      // Find parent shelf, aisle, zone in layout
                      const shelfObj = objects.find(o => o.type === 'shelf'
                        && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
                        && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
                      const aisleObj = objects.find(o => o.type === 'aisle'
                        && Math.abs(o.position.x - obj.position.x) <= o.size.x / 2
                        && Math.abs(o.position.z - obj.position.z) <= o.size.z / 2);
                      const zoneObj = objects.find(o => o.type === 'zone'
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
                          <Text style={styles.modalLabel}>Quantity</Text>
                          <Text style={styles.modalValue}>{heatmapItem.quantity}</Text>
                          <Text style={styles.modalLabel}>Capacity</Text>
                          <Text style={styles.modalValue}>{heatmapItem.maxThreshold}</Text>
                          <Text style={styles.modalLabel}>Utilization (%)</Text>
                          <Text style={styles.modalValue}>{`${pctUsed.toFixed(1)}%`}</Text>
                        </>
                      );
                    })()}
                  </>
                );
              })()}
              <View style={{ height: 16 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#007aff', fontWeight: 'bold', fontSize: 16 }} onPress={() => setShowProperties(false)}>
                  Close
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Slide-out menu and sliding button */}
      <Animated.View style={[styles.animatedMenuContainer, { transform: [{ translateX: slideAnim }], width: menuWidth, position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 20 }]}> 
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
                  style={[styles.menuButton, activeHeatmap === 'binCapacity' && styles.menuButtonActive]}
                  onPress={() => {
                    console.log('Bin Capacity clicked');
                    setActiveHeatmap('binCapacity');
                  }}
                >Bin Capacity</Text>
              </View>
            ) : (
              <View style={styles.menuSection}>
                <Text
                  style={[styles.menuButton, activeHeatmap === 'rackWeightCapacity' && styles.menuButtonActive]}
                  onPress={() => {
                    console.log('Rack Weight Capacity clicked');
                    setActiveHeatmap('rackWeightCapacity');
                  }}
                >Rack Weight Capacity</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
      <Animated.View style={[styles.openTabContainer, {
        right: slideAnim.interpolate({ inputRange: [0, menuWidth], outputRange: [menuWidth, 0] }),
      }]}
      >
        <Ionicons
          name={menuOpen ? 'chevron-forward' : 'chevron-back'}
          size={32}
          color="#222"
          style={styles.openArrow}
          onPress={() => setMenuOpen(!menuOpen)}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222' },
  glview: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 16,
    marginBottom: 10,
  },
  slideMenuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: '#fff',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#fff2',
    flexDirection: 'column',
    alignItems: 'stretch',
    transitionProperty: 'right',
    transitionDuration: '300ms',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5'
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: 'f5f5f5'
  },
  tabSelected: {
    backgroundColor: '#f5f5f5',
    color: '#000',
    borderBottomWidth: 3,
    borderBottomColor: '#ccc',
  },
  menuSection: {
    padding: 24,
  },
  menuButton: {
    backgroundColor: '#333',
    color: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#fff2',
  },
  menuButtonActive: {
    backgroundColor: '#f5f5f5',
    color: '#222',
    borderColor: '#fff',
  },
  openTabContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -20,
    width: 24,
    height: 100,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    zIndex: 19,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  openArrow: {
    color: '#222',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 24,
    height: 28,
  },
  animatedMenuContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    // width is set dynamically
  },
}); 