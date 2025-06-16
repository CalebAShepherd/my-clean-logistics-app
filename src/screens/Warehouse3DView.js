import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, PanResponder, Button, Alert, SafeAreaView, TouchableOpacity, Text, Dimensions, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { createLocation, updateLocation } from '../api/locations';
import { fetchWarehouses } from '../api/warehouses';

function snapToGrid(val, gridSize = 1) {
  return Math.round(val / gridSize) * gridSize;
}

const LAYOUT_KEY = 'WAREHOUSE_LAYOUT_V1';

export default function Warehouse3DView({ route }) {
  const { userToken } = useContext(AuthContext);
  // Temporary warehouse selector state
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState(route?.params?.warehouseId ?? null);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [warehouseError, setWarehouseError] = useState(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  // Ref to hold the latest warehouseId for callbacks
  const warehouseIdRef = useRef(warehouseId);
  useEffect(() => { warehouseIdRef.current = warehouseId; }, [warehouseId]);
  const loadWarehouses = async () => {
    if (!userToken) {
      console.log('No userToken available');
      setLoadingWarehouses(false);
      setWarehouseError('No authentication token available');
      return;
    }
    
    setLoadingWarehouses(true);
    setWarehouseError(null);
    try {
      console.log('Fetching warehouses with token:', userToken ? 'present' : 'missing');
      const list = await fetchWarehouses(userToken);
      console.log('Fetched warehouses:', list);
      console.log('Warehouse data structure:', JSON.stringify(list, null, 2));
      setWarehouses(list || []);
      
      if (!list || list.length === 0) {
        console.log('No warehouses found');
      } else {
        console.log('Warehouses for picker:');
        list.forEach((w, index) => {
          console.log(`  ${index}: id=${w.id}, name=${w.name}`);
        });
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setWarehouseError(err.message);
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, [userToken]);
  const animationRef = useRef();
  const cameraRef = useRef();
  const lastPan = useRef({ x: 0, y: 0 });
  const lastDistance = useRef(null);
  const cameraStateRef = useRef({
    radius: 8,
    theta: Math.PI / 4,
    phi: Math.PI / 4,
  });
  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, z: 0 });
  // Now objects can be of type rack, pallet, wall, etc.
  const [objects, setObjects] = useState([
    {
      id: 'shelf1',
      type: 'shelf',
      position: { x: 0, y: 0.25, z: 0 },
      size: { x: 1, y: 0.5, z: 1 },
      color: 0x007aff,
      label: 'Shelf 1',
    },
  ]);
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects || []; }, [objects]);
  // For forcing a render on selection change
  const [, forceRender] = useState(0);

  // Track GLView layout for accurate touch mapping
  const glLayout = useRef({
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  const [placementType, setPlacementType] = useState(null); // 'rack' | 'pallet' | 'wall' | null
  const placementTypeRef = useRef(placementType);
  useEffect(() => { placementTypeRef.current = placementType; }, [placementType]);

  const [ready, setReady] = useState(true);

  const [showProperties, setShowProperties] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  // Local state for size fields to allow empty input
  const [sizeX, setSizeX] = useState('');
  const [sizeY, setSizeY] = useState('');
  const [sizeZ, setSizeZ] = useState('');
  // Open properties panel when a component is selected
  // Only open properties panel when Properties button is pressed
  // (no longer auto-opens on selection)

  // Sync size fields with selected component
  useEffect(() => {
    const obj = objects.find(o => o.id === selectedId);
    if (obj) {
      setSizeX(String(obj.size.x));
      setSizeY(String(obj.size.y));
      setSizeZ(String(obj.size.z));
    }
  }, [selectedId, objects]);

  // Helper to update selected object
  const updateSelectedObject = (updates) => {
    setObjects(prev => prev.map(obj =>
      obj.id === selectedId ? { ...obj, ...updates } : obj
    ));
  };

  // Control Functions
  const resetCameraView = () => {
    cameraStateRef.current = { 
      radius: 8, 
      theta: Math.PI / 4, 
      phi: Math.PI / 4 
    };
    setCameraTarget({ x: 0, y: 0, z: 0 });
    Alert.alert('Camera Reset', 'View has been reset to default position', [{ text: 'OK' }]);
  };

  const fitToScreen = () => {
    if (objectsRef.current.length === 0) {
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
    setCameraTarget({ x: centerX, y: centerY, z: centerZ });
    cameraStateRef.current.radius = maxSize * 1.5;
    
    Alert.alert('View Adjusted', 'Camera positioned to fit all warehouse objects', [{ text: 'OK' }]);
  };

  // Save layout to AsyncStorage
  const saveLayout = async () => {
    try {
      // Persist 3D layout locally
      const cameraState = cameraStateRef.current;
      const cameraTarget = cameraTargetRef.current;
      const layout = {
        objects: objectsRef.current,
        camera: {
          radius: cameraState.radius,
          theta: cameraState.theta,
          phi: cameraState.phi,
          target: cameraTarget,
        },
      };
      await AsyncStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      // Persist bins as locations in backend
      for (const obj of objectsRef.current) {
        if (obj.type !== 'bin') continue;
        // Identify the topmost shelf directly under the bin using bounding overlap and vertical proximity
        const binBottomY = obj.position.y - obj.size.y / 2;
        const shelfCandidates = objectsRef.current.filter(o => o.type === 'shelf' &&
          Math.abs(o.position.x - obj.position.x) <= (o.size.x / 2 + obj.size.x / 2) &&
          Math.abs(o.position.z - obj.position.z) <= (o.size.z / 2 + obj.size.z / 2) &&
          (o.position.y + o.size.y / 2) <= binBottomY + 0.001
        );
        const shelf = shelfCandidates.length > 0
          ? shelfCandidates.reduce((prev, curr) => {
              const prevTop = prev.position.y + prev.size.y / 2;
              const currTop = curr.position.y + curr.size.y / 2;
              return currTop > prevTop ? curr : prev;
            }, shelfCandidates[0])
          : undefined;
        const aisle = objectsRef.current.find(o => o.type === 'aisle' &&
          Math.abs(o.position.x - obj.position.x) <= o.size.x/2 &&
          Math.abs(o.position.z - obj.position.z) <= o.size.z/2);
        const zone = objectsRef.current.find(o => o.type === 'zone' &&
          Math.abs(o.position.x - obj.position.x) <= o.size.x/2 &&
          Math.abs(o.position.z - obj.position.z) <= o.size.z/2);
        const data = {
          warehouseId: warehouseIdRef.current,
          zone: zone?.label,
          aisle: aisle?.label,
          shelf: shelf?.label,
          bin: obj.label,
          x: obj.position.x,
          y: obj.position.z,
        };
        // Determine if new or existing location by UUID pattern
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(obj.id);
        if (isUuid) {
          // Update existing location
          await updateLocation(userToken, obj.id, data);
        } else {
          // Create new location and update state id
          const created = await createLocation(userToken, data);
          const oldId = obj.id;
          setObjects(prev => prev.map(o => o.id === oldId ? { ...o, id: created.id } : o));
        }
      }
      Alert.alert('Success', 'Layout and locations saved!');
    } catch (e) {
      console.error('Error saving layout:', e);
      Alert.alert('Error', e.message || 'Failed to save layout.');
    }
  };

  // Load layout from AsyncStorage
  const loadLayout = async () => {
    try {
      setReady(false);
      const json = await AsyncStorage.getItem(LAYOUT_KEY);
      if (json) {
        let parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          setObjects(parsed);
        } else if (parsed && parsed.objects) {
          setObjects(parsed.objects);
          // Restore camera state
          if (parsed.camera) {
            cameraStateRef.current = {
              radius: parsed.camera.radius,
              theta: parsed.camera.theta,
              phi: parsed.camera.phi,
            };
            setCameraTarget(parsed.camera.target || { x: 0, y: 0, z: 0 });
          }
        }
        Alert.alert('Success', 'Layout loaded!');
        forceRender(n => n + 1); // Force re-render and mesh rebuild
      } else {
        Alert.alert('Info', 'No saved layout found.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load layout.');
    }
  };

  // For two-finger gesture tracking
  const lastGesture = useRef({ distance: null, angle: null });

  // PanResponder for gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        if (!ready) return;
        console.log('onPanResponderGrant fired', { placementType: placementTypeRef.current, glLayout: glLayout.current });
        if (evt.nativeEvent.touches.length === 1) {
          const { pageX, pageY } = evt.nativeEvent.touches[0];
          const placementX = pageX - glLayout.current.x;
          const placementY = pageY - glLayout.current.y;
          // Placement mode: place new component
          if (placementTypeRef.current) {
            if (cameraRef.current && glViewRef.current) {
              const { width, height } = glLayout.current;
              const x = (placementX / width) * 2 - 1;
              const y = -(placementY / height) * 2 + 1;
              const mouse = new THREE.Vector2(x, y);
              const raycaster = new THREE.Raycaster();
              raycaster.setFromCamera(mouse, cameraRef.current);
              // Intersect with XZ plane at y=0.5
              const planeY = 0.5;
              const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
              const intersection = new THREE.Vector3();
              raycaster.ray.intersectPlane(plane, intersection);
              // Stacking: check if tap intersects an existing mesh
              let stackY = null;
              let stackObj = null;
              if (meshRefs.current.length > 0) {
                const meshIntersects = raycaster.intersectObjects(meshRefs.current);
                if (meshIntersects.length > 0) {
                  // Find the topmost mesh at this location
                  const topHit = meshIntersects[0];
                  const meshIdx = meshRefs.current.findIndex(m => m === topHit.object);
                  stackObj = objectsRef.current[meshIdx];
                }
              }
              // Snap to grid, adjust for odd-sized components
              const rawX = intersection.x;
              const rawZ = intersection.z;
              let snappedX = snapToGrid(rawX);
              let snappedZ = snapToGrid(rawZ);
              // Default sizes/colors and placement constraints
              // Enforce container constraints
              if (placementTypeRef.current === 'zone') {
                // Prevent overlapping zones (10x10)
                if (objectsRef.current.some(o => o.type === 'zone' &&
                    Math.abs(o.position.x - snappedX) < (o.size.x / 2 + 5) &&
                    Math.abs(o.position.z - snappedZ) < (o.size.z / 2 + 5))) {
                  Alert.alert('Invalid Placement', 'Cannot place a zone overlapping another zone');
                  return;
                }
              } else if (placementTypeRef.current === 'aisle') {
                // Aisle must be inside a zone
                const parentZone = objectsRef.current.find(o => o.type === 'zone' &&
                  Math.abs(o.position.x - snappedX) <= o.size.x / 2 &&
                  Math.abs(o.position.z - snappedZ) <= o.size.z / 2);
                if (!parentZone) {
                  Alert.alert('Invalid Placement', 'Aisle must be placed inside a zone');
                  return;
                }
              } else if (placementTypeRef.current === 'shelf') {
                // Shelf must be inside an aisle
                const parentAisle = objectsRef.current.find(o => o.type === 'aisle' &&
                  Math.abs(o.position.x - snappedX) <= o.size.x / 2 &&
                  Math.abs(o.position.z - snappedZ) <= o.size.z / 2);
                if (!parentAisle) {
                  Alert.alert('Invalid Placement', 'Shelf must be placed inside an aisle');
                  return;
                }
              } else if (placementTypeRef.current === 'bin') {
                // Bin must be inside a shelf
                const parentShelf = objectsRef.current.find(o => o.type === 'shelf' &&
                  Math.abs(o.position.x - snappedX) <= o.size.x / 2 &&
                  Math.abs(o.position.z - snappedZ) <= o.size.z / 2);
                if (!parentShelf) {
                  Alert.alert('Invalid Placement', 'Bin must be placed inside a shelf');
                  return;
                }
              }
              let newObj = null;
              // Zone
              if (placementTypeRef.current === 'zone') {
                const sizeY = 0.01;
                const yPos = sizeY / 2;
                newObj = {
                  id: `zone${Date.now()}`,
                  type: 'zone',
                  position: { x: snappedX, y: yPos, z: snappedZ },
                  size: { x: 10, y: sizeY, z: 10 },
                  color: 0xFFFF00,
                  label: 'Zone',
                };
              } else if (placementTypeRef.current === 'aisle') {
                const sizeY = 0.02;
                // Compute Y position by stacking on parent zone with epsilon to avoid z-fighting
                const epsilon = 0.001;
                const parentZone = objectsRef.current.find(o =>
                  o.type === 'zone' &&
                  Math.abs(o.position.x - snappedX) <= o.size.x / 2 &&
                  Math.abs(o.position.z - snappedZ) <= o.size.z / 2
                );
                const baseY = parentZone
                  ? parentZone.position.y + parentZone.size.y / 2 + sizeY / 2
                  : sizeY / 2;
                const yPos = baseY + epsilon;
                newObj = {
                  id: `aisle${Date.now()}`,
                  type: 'aisle',
                  position: { x: snappedX, y: yPos, z: snappedZ },
                  size: { x: 10, y: sizeY, z: 4 },
                  color: 0x000000,
                  label: 'Aisle',
                };
              } else if (placementTypeRef.current === 'shelf') {
                const sizeY = 0.5;
                // Align odd-width shelf to grid square centers using its half dimension
                const halfX = 1 / 2;
                const halfZ = 1 / 2;
                snappedX = Math.round(rawX - halfX) + halfX;
                snappedZ = Math.round(rawZ - halfZ) + halfZ;
                let yPos = sizeY / 2;
                if (stackObj) {
                  yPos = stackObj.position.y + (stackObj.size.y / 2) + (sizeY / 2);
                }
                newObj = {
                  id: `shelf${Date.now()}`,
                  type: 'shelf',
                  position: { x: snappedX, y: yPos, z: snappedZ },
                  size: { x: 1, y: sizeY, z: 1 },
                  color: 0x007aff,
                  label: 'Shelf',
                };
              } else if (placementTypeRef.current === 'bin') {
                const sizeY = 1;
                // Align odd-width bin to grid square centers using its half dimension
                const halfX = 1 / 2;
                const halfZ = 1 / 2;
                snappedX = Math.round(rawX - halfX) + halfX;
                snappedZ = Math.round(rawZ - halfZ) + halfZ;
                let yPos = sizeY / 2;
                if (stackObj) {
                  yPos = stackObj.position.y + (stackObj.size.y / 2) + (sizeY / 2);
                }
                newObj = {
                  id: `bin${Date.now()}`,
                  type: 'bin',
                  position: { x: snappedX, y: yPos, z: snappedZ },
                  size: { x: 1, y: sizeY, z: 1 },
                  color: 0x8bc34a,
                  label: 'Bin',
                };
              }
              if (newObj) {
                setObjects(prev => [...prev, newObj]);
                setSelectedId(newObj.id);
                forceRender(n => n + 1);
                setPlacementType(null);
              }
            }
            return; // Ensure we return immediately after placement
          }
          // Map to GLView local coordinates
          const selectX = pageX - glLayout.current.x;
          const selectY = pageY - glLayout.current.y;
          // Raycast to select box
          if (!draggingRef.current) {
            if (cameraRef.current && animationRef.current && glViewRef.current && meshRefs.current.length > 0) {
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
                draggingRef.current = true;
                // Store offset between mesh position and intersection point
                const intersect = intersects[0];
                dragOffsetRef.current = {
                  x: intersect.object.position.x - intersect.point.x,
                  z: intersect.object.position.z - intersect.point.z,
                };
                forceRender(n => n + 1); // force render for highlight
              } else {
                setSelectedId(null);
                draggingRef.current = false;
                forceRender(n => n + 1);
              }
            }
          }
          lastPan.current = {
            x: evt.nativeEvent.touches[0].pageX,
            y: evt.nativeEvent.touches[0].pageY,
          };
        } else if (evt.nativeEvent.touches.length === 2) {
          const [a, b] = evt.nativeEvent.touches;
          const currDist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const currAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          const threshold = 500; // Higher threshold for more responsive rotation
          let didZoom = false;
          let didRotate = false;
          if (lastGesture.current.distance !== null && lastGesture.current.angle !== null) {
            let { radius, theta, phi } = cameraStateRef.current;
            const deltaDist = currDist - lastGesture.current.distance;
            const deltaAngle = currAngle - lastGesture.current.angle;
            // Only zoom if distance change dominates
            if (Math.abs(deltaDist) > Math.abs(deltaAngle * threshold)) {
              let nextRadius = radius - deltaDist * 0.04; // Zoom sensitivity
              nextRadius = Math.max(3, Math.min(30, nextRadius));
              cameraStateRef.current = { radius: nextRadius, theta, phi };
              didZoom = true;
            }
            // Only rotate if angle change dominates
            if (Math.abs(deltaAngle) > Math.abs(deltaDist / threshold)) {
              let nextTheta = theta + deltaAngle;
              cameraStateRef.current = { radius, theta: nextTheta, phi };
              didRotate = true;
            }
          }
          lastGesture.current = { distance: currDist, angle: currAngle };
          // Update lastPan for two fingers (for future use)
          lastPan.current = {
            x1: a.pageX,
            y1: a.pageY,
            x2: b.pageX,
            y2: b.pageY,
          };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!ready) return;
        if (evt.nativeEvent.touches.length === 1) {
          // 1 finger: If a component is selected, always move it. Otherwise, pan camera.
          const { pageX, pageY } = evt.nativeEvent.touches[0];
          if (selectedIdRef.current) {
            // Move selected box in XZ plane (same as before)
            const dragX = pageX - glLayout.current.x;
            const dragY = pageY - glLayout.current.y;
            if (cameraRef.current && glViewRef.current) {
              const { width, height } = glLayout.current;
              const x = (dragX / width) * 2 - 1;
              const y = -(dragY / height) * 2 + 1;
              const mouse = new THREE.Vector2(x, y);
              const raycaster = new THREE.Raycaster();
              raycaster.setFromCamera(mouse, cameraRef.current);
              // Intersect with XZ plane at y=0.5
              const planeY = 0.5;
              const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
              const intersection = new THREE.Vector3();
              raycaster.ray.intersectPlane(plane, intersection);
              if (intersection) {
                // Snap to grid using each object's half-dimension, so odd/even align correctly
                const rawX = intersection.x + dragOffsetRef.current.x;
                const rawZ = intersection.z + dragOffsetRef.current.z;
                const draggedObj = objectsRef.current.find(o => o.id === selectedIdRef.current);
                const halfX = draggedObj ? draggedObj.size.x / 2 : 0;
                const halfZ = draggedObj ? draggedObj.size.z / 2 : 0;
                const snappedX = Math.round(rawX - halfX) + halfX;
                const snappedZ = Math.round(rawZ - halfZ) + halfZ;
                // Determine stacking: find highest underlying object overlapping in XZ
                let maxY = null;
                objectsRef.current.forEach(obj => {
                  if (obj.id !== selectedIdRef.current) {
                    const overlapX = Math.abs(obj.position.x - snappedX) < (obj.size.x / 2 + (draggedObj?.size.x || 0) / 2);
                    const overlapZ = Math.abs(obj.position.z - snappedZ) < (obj.size.z / 2 + (draggedObj?.size.z || 0) / 2);
                    if (overlapX && overlapZ) {
                      const topY = obj.position.y + obj.size.y / 2;
                      if (maxY === null || topY > maxY) {
                        maxY = topY;
                      }
                    }
                  }
                });
                // Calculate new Y position: on top of highest object or ground
                const newY = maxY !== null
                  ? maxY + (draggedObj?.size.y || 1) / 2
                  : (draggedObj?.size.y || 1) / 2;
                setObjects(prev => prev.map(obj =>
                  obj.id === selectedIdRef.current
                    ? { ...obj, position: { x: snappedX, y: newY, z: snappedZ } }
                    : obj
                ));
              }
            }
          } else {
            // Pan camera
            if (lastPan.current.x !== undefined && lastPan.current.y !== undefined) {
              const dx = pageX - lastPan.current.x;
              const dy = pageY - lastPan.current.y;
              // Pan in world space
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
              setCameraTarget(prev => ({
                x: prev.x - dx * right.x * panScale - dy * forward.x * panScale,
                y: prev.y,
                z: prev.z - dx * right.z * panScale - dy * forward.z * panScale,
              }));
              cameraTargetRef.current = {
                x: cameraTargetRef.current.x - dx * right.x * panScale - dy * forward.x * panScale,
                y: cameraTargetRef.current.y,
                z: cameraTargetRef.current.z - dx * right.z * panScale - dy * forward.z * panScale,
              };
            }
          }
          lastPan.current = { x: pageX, y: pageY };
        } else if (evt.nativeEvent.touches.length === 2) {
          // 2 fingers: Pinch to zoom, rotate to orbit
          const [a, b] = evt.nativeEvent.touches;
          const currDist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const currAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          const threshold = 500; // Higher threshold for more responsive rotation
          let didZoom = false;
          let didRotate = false;
          if (lastGesture.current.distance !== null && lastGesture.current.angle !== null) {
            let { radius, theta, phi } = cameraStateRef.current;
            const deltaDist = currDist - lastGesture.current.distance;
            const deltaAngle = currAngle - lastGesture.current.angle;
            // Only zoom if distance change dominates
            if (Math.abs(deltaDist) > Math.abs(deltaAngle * threshold)) {
              let nextRadius = radius - deltaDist * 0.04; // Zoom sensitivity
              nextRadius = Math.max(3, Math.min(30, nextRadius));
              cameraStateRef.current = { radius: nextRadius, theta, phi };
              didZoom = true;
            }
            // Only rotate if angle change dominates
            if (Math.abs(deltaAngle) > Math.abs(deltaDist / threshold)) {
              let nextTheta = theta + deltaAngle;
              cameraStateRef.current = { radius, theta: nextTheta, phi };
              didRotate = true;
            }
          }
          lastGesture.current = { distance: currDist, angle: currAngle };
          // Update lastPan for two fingers (for future use)
          lastPan.current = {
            x1: a.pageX,
            y1: a.pageY,
            x2: b.pageX,
            y2: b.pageY,
          };
        }
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        lastDistance.current = null;
        lastGesture.current = { distance: null, angle: null };
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Multiple mesh refs for multiple objects
  const meshRefs = useRef([]);
  const glViewRef = useRef();
  const sceneRef = useRef();

  // Rebuild meshes whenever objects changes
  useEffect(() => {
    if (!sceneRef.current) return;
    // Remove old meshes
    meshRefs.current.forEach(mesh => {
      if (mesh && sceneRef.current.children.includes(mesh)) {
        sceneRef.current.remove(mesh);
      }
    });
    // Create new meshes
    if (!Array.isArray(objectsRef.current)) {
      meshRefs.current = [];
      setReady(true);
      return;
    }
    meshRefs.current = objectsRef.current.map((obj) => {
      let geometry, material, mesh;
      if (obj.type === 'rack' || obj.type === 'pallet') {
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
      // Always set mesh position to match object
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      sceneRef.current.add(mesh);
      return mesh;
    });
    setReady(true);
  }, [objects]);

  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 });
  const cameraTargetRef = useRef(cameraTarget);
  useEffect(() => { cameraTargetRef.current = cameraTarget; }, [cameraTarget]);

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    glViewRef.current = { width, height };
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;
    const { radius, theta, phi } = cameraStateRef.current;
    // Calculate camera position relative to cameraTarget
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

    // Initial meshes
    meshRefs.current = objectsRef.current.map((obj) => {
      let geometry, material, mesh;
      if (obj.type === 'rack' || obj.type === 'pallet') {
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
      animationRef.current = requestAnimationFrame(render);
      // Update mesh positions and highlights
      objectsRef.current.forEach((obj, idx) => {
        const mesh = meshRefs.current[idx];
        if (mesh) {
          mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
          mesh.material.color.set(selectedIdRef.current === obj.id ? 0xffa500 : obj.color);
        }
      });
      // Camera
      const { radius, theta, phi } = cameraStateRef.current;
      // Calculate camera position relative to cameraTarget
      const target = cameraTargetRef.current;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target.x, target.y, target.z);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Enhanced Warehouse Selection Overlay */}
      {!warehouseId && (
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(26,26,26,0.95)']}
          style={styles.selectorOverlay}
        >
          <View style={styles.selectorContent}>
            <MaterialCommunityIcons name="warehouse" size={64} color="#007AFF" />
            <Text style={styles.selectorTitle}>Select Warehouse</Text>
            <Text style={styles.selectorSubtitle}>Choose a warehouse to start editing</Text>
            
            {loadingWarehouses ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading warehouses...</Text>
              </View>
            ) : warehouseError ? (
              <View style={styles.noWarehousesContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color="#FF453A" />
                <Text style={styles.noWarehousesTitle}>Error Loading Warehouses</Text>
                <Text style={styles.noWarehousesSubtitle}>
                  {warehouseError}
                </Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadWarehouses}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="white" />
                  <Text style={styles.createWarehouseButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : warehouses.length === 0 ? (
              <View style={styles.noWarehousesContainer}>
                <MaterialCommunityIcons name="warehouse-off" size={48} color="#8E8E93" />
                <Text style={styles.noWarehousesTitle}>No Warehouses Found</Text>
                <Text style={styles.noWarehousesSubtitle}>
                  You need to create a warehouse first before using the 3D editor.
                </Text>
                <TouchableOpacity 
                  style={styles.createWarehouseButton}
                  onPress={() => Alert.alert(
                    'Create Warehouse', 
                    'Please go to the main warehouse management screen to create a new warehouse.',
                    [{ text: 'OK' }]
                  )}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                  <Text style={styles.createWarehouseButtonText}>Create Warehouse</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.selectorPickerContainer}>
                <TouchableOpacity 
                  style={styles.customPickerButton}
                  onPress={() => setShowWarehousePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.customPickerText}>
                    {warehouseId 
                      ? warehouses.find(w => w.id === warehouseId)?.name || 'Select Warehouse'
                      : 'Select Warehouse'
                    }
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.warehouseCount}>
                  {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''} available
                </Text>

                {/* Custom Warehouse Picker Modal */}
                <Modal
                  visible={showWarehousePicker}
                  animationType="slide"
                  transparent={true}
                  onRequestClose={() => setShowWarehousePicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModalContent}>
                      <View style={styles.pickerModalHeader}>
                        <Text style={styles.pickerModalTitle}>Select Warehouse</Text>
                        <TouchableOpacity 
                          onPress={() => setShowWarehousePicker(false)}
                          style={styles.pickerModalClose}
                        >
                          <MaterialCommunityIcons name="close" size={24} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.pickerModalBody}>
                        {warehouses.map((warehouse) => (
                          <TouchableOpacity
                            key={warehouse.id}
                            style={[
                              styles.warehouseOption,
                              warehouseId === warehouse.id && styles.warehouseOptionSelected
                            ]}
                            onPress={() => {
                              console.log('Selected warehouse:', warehouse.name, warehouse.id);
                              setWarehouseId(warehouse.id);
                              setShowWarehousePicker(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.warehouseOptionContent}>
                              <MaterialCommunityIcons 
                                name="warehouse" 
                                size={24} 
                                color={warehouseId === warehouse.id ? "#007AFF" : "#8E8E93"} 
                              />
                              <View style={styles.warehouseOptionText}>
                                <Text style={[
                                  styles.warehouseOptionName,
                                  warehouseId === warehouse.id && styles.warehouseOptionNameSelected
                                ]}>
                                  {warehouse.name}
                                </Text>
                                <Text style={styles.warehouseOptionId}>ID: {warehouse.id}</Text>
                              </View>
                            </View>
                            {warehouseId === warehouse.id && (
                              <MaterialCommunityIcons name="check-circle" size={20} color="#007AFF" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              </View>
            )}
          </View>
        </LinearGradient>
      )}

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="cube-outline" size={24} color="white" />
            <Text style={styles.headerTitle}>3D Editor</Text>
          </View>
          <View style={styles.headerRight}>
            {selectedId && (
              <View style={styles.selectionIndicator}>
                <MaterialCommunityIcons name="cursor-default-click" size={12} color="#34C759" />
                <Text style={styles.selectionText}>
                  {objects.find(o => o.id === selectedId)?.label || 'Selected'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={saveLayout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="content-save" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={loadLayout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="folder-open" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Load</Text>
        </TouchableOpacity>
        
        {selectedId && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => {
              Alert.alert(
                'Delete Component',
                `Are you sure you want to delete "${objects.find(o => o.id === selectedId)?.label || 'this component'}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                      setObjects(prev => prev.filter(obj => obj.id !== selectedId));
                      setSelectedId(null);
                    }
                  }
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="delete" size={18} color="#FF453A" />
            <Text style={[styles.actionButtonText, { color: '#FF453A' }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
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

      {/* Properties Button */}
      {selectedId && !showProperties && (
        <TouchableOpacity 
          style={styles.propertiesButton}
          onPress={() => setShowProperties(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cog" size={20} color="#007AFF" />
          <Text style={styles.propertiesButtonText}>Properties</Text>
        </TouchableOpacity>
      )}

      {/* Enhanced Component Palette */}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(248,249,250,0.95)']}
        style={styles.paletteContainer}
      >
        <View style={styles.paletteHeader}>
          <MaterialCommunityIcons name="palette" size={20} color="#1C1C1E" />
          <Text style={styles.paletteTitle}>Add Components</Text>
        </View>
        <View style={styles.paletteRow}>
          <PaletteButton
            label="Zone"
            color="#FFD60A"
            icon="map-marker"
            selected={placementType === 'zone'}
            onPress={() => setPlacementType(placementType === 'zone' ? null : 'zone')}
          />
          <PaletteButton
            label="Aisle"
            color="#8E8E93"
            icon="road"
            selected={placementType === 'aisle'}
            onPress={() => setPlacementType(placementType === 'aisle' ? null : 'aisle')}
          />
          <PaletteButton
            label="Shelf"
            color="#007AFF"
            icon="bookshelf"
            selected={placementType === 'shelf'}
            onPress={() => setPlacementType(placementType === 'shelf' ? null : 'shelf')}
          />
          <PaletteButton
            label="Bin"
            color="#34C759"
            icon="package-variant"
            selected={placementType === 'bin'}
            onPress={() => setPlacementType(placementType === 'bin' ? null : 'bin')}
          />
        </View>
      </LinearGradient>
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
                <MaterialCommunityIcons name="cog" size={24} color="#007AFF" />
                <Text style={styles.modalTitle}>Properties</Text>
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
                        <Text style={styles.modalLabel}>Component ID</Text>
                        <Text style={styles.modalValue}>{obj.id}</Text>
                      </View>
                      
                      <View style={styles.propertyItem}>
                        <Text style={styles.modalLabel}>Type</Text>
                        <View style={styles.propertyValueContainer}>
                          <MaterialCommunityIcons 
                            name={
                              obj.type === 'zone' ? 'map-marker' :
                              obj.type === 'aisle' ? 'road' :
                              obj.type === 'shelf' ? 'bookshelf' :
                              obj.type === 'bin' ? 'package-variant' : 'cube-outline'
                            } 
                            size={16} 
                            color="#007AFF" 
                          />
                          <Text style={styles.modalValue}>{obj.type}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.propertyItem}>
                        <Text style={styles.modalLabel}>Label</Text>
                        <TextInput
                          style={styles.modalInput}
                          value={obj.label}
                          onChangeText={text => updateSelectedObject({ label: text })}
                          placeholder="Enter component label"
                        />
                      </View>
                    <Text style={styles.modalLabel}>Size (x, y, z)</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={sizeX}
                        keyboardType="numeric"
                        onChangeText={text => {
                          setSizeX(text);
                          const num = parseFloat(text);
                          if (!isNaN(num)) updateSelectedObject({ size: { ...obj.size, x: num } });
                        }}
                      />
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={sizeY}
                        keyboardType="numeric"
                        onChangeText={text => {
                          setSizeY(text);
                          const num = parseFloat(text);
                          if (!isNaN(num)) updateSelectedObject({ size: { ...obj.size, y: num } });
                        }}
                      />
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={sizeZ}
                        keyboardType="numeric"
                        onChangeText={text => {
                          setSizeZ(text);
                          const num = parseFloat(text);
                          if (!isNaN(num)) updateSelectedObject({ size: { ...obj.size, z: num } });
                        }}
                      />
                    </View>
                    <Text style={styles.modalLabel}>Color (hex)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={typeof obj.color === 'number' ? `#${obj.color.toString(16).padStart(6, '0')}` : obj.color}
                      onChangeText={text => {
                        let colorNum = parseInt(text.replace('#', ''), 16);
                        if (isNaN(colorNum)) colorNum = 0x007aff;
                        updateSelectedObject({ color: colorNum });
                      }}
                    />
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
                <Text style={styles.modalTitle}>3D Editor Guide</Text>
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
                  <Text style={styles.infoText}>Tap objects to select them</Text>
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
                <Text style={styles.infoSectionTitle}>Building Components</Text>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#FFD60A" />
                  <Text style={styles.infoText}>Zone - Large warehouse areas</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="road" size={20} color="#8E8E93" />
                  <Text style={styles.infoText}>Aisle - Pathways between shelves</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="bookshelf" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Shelf - Storage structures</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#34C759" />
                  <Text style={styles.infoText}>Bin - Individual storage units</Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Editing</Text>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="cursor-default-click" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Select component to see properties</Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="content-save" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>Save layouts for persistence</Text>
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
    </View>
  );
}

function PaletteButton({ label, color, icon, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.paletteButton, selected && styles.paletteButtonSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.paletteIconContainer, { backgroundColor: color }, selected && styles.paletteIconSelected]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={18} 
          color={selected ? 'white' : 'rgba(255,255,255,0.9)'} 
        />
      </View>
      <Text style={[styles.paletteLabel, selected && { color, fontWeight: '600' }]}>{label}</Text>
      {selected && (
        <View style={styles.selectedIndicator}>
          <MaterialCommunityIcons name="check-circle" size={12} color={color} />
        </View>
      )}
    </TouchableOpacity>
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
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectionText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Action Bar
  actionBar: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  deleteButton: {
    marginLeft: 'auto',
  },

  // Floating Controls
  floatingControls: {
    position: 'absolute',
    bottom: 160,
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

  // Properties Button
  propertiesButton: {
    position: 'absolute',
    bottom: 160,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  propertiesButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },

  // Component Palette
  paletteContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 34,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  paletteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  paletteButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  paletteButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    transform: [{ scale: 1.05 }],
  },
  paletteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  paletteIconSelected: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  paletteLabel: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 2,
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#F2F2F7',
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

  // Warehouse Selector
  selectorOverlay: {
    position: 'absolute', 
    top: 0, 
    bottom: 0, 
    left: 0, 
    right: 0,
    zIndex: 100,
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32,
  },
  selectorContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  selectorTitle: { 
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  selectorSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  selectorPickerContainer: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectorPicker: { 
    width: '100%', 
    color: '#1C1C1E',
  },
  
  // Loading and Error States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  noWarehousesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noWarehousesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  noWarehousesSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createWarehouseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createWarehouseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF453A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  warehouseCount: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },

  // Custom Picker Styles
  customPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customPickerText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },

  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '70%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  pickerModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  pickerModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalBody: {
    maxHeight: 400,
  },
  warehouseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  warehouseOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  warehouseOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  warehouseOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  warehouseOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  warehouseOptionNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  warehouseOptionId: {
    fontSize: 14,
    color: '#8E8E93',
  },
});