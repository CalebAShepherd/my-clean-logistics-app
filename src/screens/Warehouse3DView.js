import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, PanResponder, Button, Alert, SafeAreaView, TouchableOpacity, Text, Dimensions, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // Ref to hold the latest warehouseId for callbacks
  const warehouseIdRef = useRef(warehouseId);
  useEffect(() => { warehouseIdRef.current = warehouseId; }, [warehouseId]);
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchWarehouses(userToken);
        setWarehouses(list);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch warehouses');
      }
    })();
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
        // Hierarchy
        const shelf = objectsRef.current.find(o => o.type === 'shelf' &&
          Math.abs(o.position.x - obj.position.x) <= o.size.x/2 &&
          Math.abs(o.position.z - obj.position.z) <= o.size.z/2);
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
                // Align odd-width shelf to grid square centers
                const offset = 0.5;
                snappedX = Math.round(rawX - offset) + offset;
                snappedZ = Math.round(rawZ - offset) + offset;
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
                // Align odd-width bin to grid square centers
                const offset = 0.5;
                snappedX = Math.round(rawX - offset) + offset;
                snappedZ = Math.round(rawZ - offset) + offset;
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
                // Snap to grid, with odd-sized center adjustment
                const rawX = intersection.x + dragOffsetRef.current.x;
                const rawZ = intersection.z + dragOffsetRef.current.z;
                let snappedX = snapToGrid(rawX);
                let snappedZ = snapToGrid(rawZ);
                // If dragging a shelf or bin (odd size), center on grid square
                const draggedObj = objectsRef.current.find(o => o.id === selectedIdRef.current);
                if (draggedObj && (draggedObj.type === 'shelf' || draggedObj.type === 'bin')) {
                  const halfX = draggedObj.size.x / 2;
                  const halfZ = draggedObj.size.z / 2;
                  snappedX = Math.round(rawX - halfX) + halfX;
                  snappedZ = Math.round(rawZ - halfZ) + halfZ;
                }
                // Find the highest component at this x/z (excluding the dragged one)
                const tolerance = 0.01;
                let maxY = null;
                objectsRef.current.forEach(obj => {
                  if (obj.id !== selectedIdRef.current &&
                      Math.abs(obj.position.x - snappedX) < tolerance &&
                      Math.abs(obj.position.z - snappedZ) < tolerance) {
                    const topY = obj.position.y + obj.size.y / 2;
                    if (maxY === null || topY > maxY) {
                      maxY = topY;
                    }
                  }
                });
                let newY;
                if (maxY !== null) {
                  newY = maxY + (draggedObj ? draggedObj.size.y / 2 : 0.5);
                } else {
                  newY = draggedObj ? draggedObj.size.y / 2 : 0.5; // ground
                }
                setObjects((prev) => prev.map(obj =>
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
      {/* Warehouse selection overlay */}
      {!warehouseId && (
        <View style={styles.selectorOverlay}>
          <Text style={styles.selectorText}>Select a Warehouse</Text>
          <Picker
            selectedValue={warehouseId}
            onValueChange={setWarehouseId}
            style={styles.selectorPicker}
          >
            <Picker.Item label="-- Select Warehouse --" value={null} />
            {warehouses.map(w => (
              <Picker.Item key={w.id} label={w.name} value={w.id} />
            ))}
          </Picker>
        </View>
      )}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.buttonRow}>
          <Button title="Save Layout" onPress={saveLayout} />
          <Button title="Load Layout" onPress={loadLayout} />
          {selectedId && (
            <Button
              title="Delete Component"
              color="#d32f2f"
              onPress={() => {
                setObjects(prev => prev.filter(obj => obj.id !== selectedId));
                setSelectedId(null);
              }}
            />
          )}
        </View>
      </SafeAreaView>
      <GLView
        style={styles.glview}
        onContextCreate={onContextCreate}
        onLayout={e => {
          const { x, y, width, height } = e.nativeEvent.layout;
          glLayout.current = { x, y, width, height };
        }}
        {...panResponder.panHandlers}
      />
      {/* Component Palette */}
      {selectedId && !showProperties && (
        <View style={styles.propertiesButtonRow}>
          <Button
            title="Properties"
            onPress={() => setShowProperties(true)}
            color="#007aff"
          />
        </View>
      )}
      <SafeAreaView style={styles.paletteSafeArea}>
        <View style={styles.paletteRow}>
          <PaletteButton
            label="Zone"
            color="#FFFF00"
            selected={placementType === 'zone'}
            onPress={() => setPlacementType(placementType === 'zone' ? null : 'zone')}
          />
          <PaletteButton
            label="Aisle"
            color="#000000"
            selected={placementType === 'aisle'}
            onPress={() => setPlacementType(placementType === 'aisle' ? null : 'aisle')}
          />
          <PaletteButton
            label="Shelf"
            color="#007aff"
            selected={placementType === 'shelf'}
            onPress={() => setPlacementType(placementType === 'shelf' ? null : 'shelf')}
          />
          <PaletteButton
            label="Bin"
            color="#8bc34a"
            selected={placementType === 'bin'}
            onPress={() => setPlacementType(placementType === 'bin' ? null : 'bin')}
          />
        </View>
      </SafeAreaView>
      {/* Properties Panel Modal */}
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
                    <TextInput
                      style={styles.modalInput}
                      value={obj.label}
                      onChangeText={text => updateSelectedObject({ label: text })}
                    />
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
                  </>
                );
              })()}
              <Button title="Close" onPress={() => setShowProperties(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function PaletteButton({ label, color, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.paletteButton, selected && { borderColor: color, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.paletteIcon, { backgroundColor: color }]} />
      <Text style={[styles.paletteLabel, selected && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222' },
  glview: { flex: 1 },
  safeArea: {
    backgroundColor: '#222',
    zIndex: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#222',
    zIndex: 2,
  },
  paletteSafeArea: {
    backgroundColor: '#222',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 18,
    backgroundColor: '#222',
  },
  paletteButton: {
    alignItems: 'center',
    marginHorizontal: 12,
    padding: 6,
    borderRadius: 8,
    borderColor: '#444',
    borderWidth: 1,
    backgroundColor: '#333',
    minWidth: 60,
  },
  paletteIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  paletteLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    minHeight: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  modalLabel: {
    fontSize: 14,
    color: '#555',
    marginTop: 12,
  },
  modalValue: {
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#f7f7f7',
  },
  propertiesButtonRow: {
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#222',
    paddingTop: 4,
    zIndex: 2,
  },
  selectorOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100,
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  selectorText: { color: '#fff', fontSize: 18, marginBottom: 12 },
  selectorPicker: { width: '80%', color: '#fff', backgroundColor: '#333', borderRadius: 8 },
});