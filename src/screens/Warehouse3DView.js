import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, PanResponder, Button, Alert, SafeAreaView, TouchableOpacity, Text, Dimensions, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthContext } from '../context/AuthContext';
import { createLocation, updateLocation, fetchLocations } from '../api/locations';
import { fetchWarehouses } from '../api/warehouses';
import { analyzeFloorPlanBackend } from '../api/floorplan';
import { buildRackMesh } from '../utils/rackBuilder';
import { meshesToBlueprint } from '../utils/blueprintTo3D';
import { locationToBinMesh, BinEvents, debounce } from '../utils/binGeneration';
import { getBlueprintsByWarehouse, getBlueprintById } from '../api/blueprints';
import { blueprintTo3D } from '../utils/blueprintTo3D';

function snapToGrid(val, gridSize = 1) {
  return Math.round(val / gridSize) * gridSize;
}

const getLayoutKey = (warehouseId) => `WAREHOUSE_LAYOUT_V2::${warehouseId}`;

// Auto-generation configuration
const AUTO_GEN_CONFIG = {
  RACK_HEIGHT: 3.0,
  SHELF_DEPTH: 1.2,
  AISLE_WIDTH: 2.5,
  SAFETY_MARGIN: 0.5,
  GRID_SIZE: 0.5,
};

export default function Warehouse3DView({ route }) {
  const { userToken } = useContext(AuthContext);
  // Load existing bins from database
  const [loadingBins, setLoadingBins] = useState(false);
  // Warehouse selector state
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState(route?.params?.warehouseId ?? null);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [warehouseError, setWarehouseError] = useState(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  
  // Add refresh trigger for when returning from creating locations
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Create debounced save function for auto-saving
  const debouncedSave = React.useMemo(() => 
    debounce(() => {
      if (warehouseIdRef.current) {
        saveLayout();
      }
    }, 1000), 
    []
  );
  
  // Load warehouse-specific layout from AsyncStorage
  const loadWarehouseLayout = async () => {
    if (!warehouseIdRef.current) {
      console.log('No warehouse ID available for loading layout');
      return;
    }
    
    try {
      const layoutKey = getLayoutKey(warehouseIdRef.current);
      console.log('Loading warehouse layout with key:', layoutKey);
      const json = await AsyncStorage.getItem(layoutKey);
      
      if (json) {
        const parsed = JSON.parse(json);
        console.log('Loaded warehouse layout:', parsed.metadata);
        
        if (Array.isArray(parsed)) {
          setObjects(parsed);
        } else if (parsed && parsed.objects) {
          setObjects(parsed.objects);
          // Restore camera state
          if (parsed.camera) {
            cameraStateRef.current = {
              radius: parsed.camera.radius || 8,
              theta: parsed.camera.theta || Math.PI / 4,
              phi: parsed.camera.phi || Math.PI / 4,
            };
            setCameraTarget(parsed.camera.target || { x: 0, y: 0, z: 0 });
          }
        }
        
        // Auto-save to ensure layout is current
        setTimeout(() => debouncedSave(), 500);
        
        console.log('✅ Warehouse layout loaded successfully');
      } else {
        console.log('No saved layout found for warehouse:', warehouseIdRef.current);
        // Keep default demo objects if no saved layout
      }
    } catch (error) {
      console.error('Error loading warehouse layout:', error);
    }
  };
  
  // File import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedFile, setImportedFile] = useState(null);
  const [floorPlanImage, setFloorPlanImage] = useState(null);
  const [autoGenProgress, setAutoGenProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  
  // Image analysis states
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [analysisStep, setAnalysisStep] = useState('');
  const [detectedFeatures, setDetectedFeatures] = useState({
    walls: [],
    rooms: [],
    doors: [],
    openSpaces: [],
    buildingOutline: null,
    dimensions: null
  });
  
  // Auto-generation configuration
  const [autoGenConfig, setAutoGenConfig] = useState(AUTO_GEN_CONFIG);
  
  // Ref to hold the latest warehouseId for callbacks
  const warehouseIdRef = useRef(warehouseId);
  useEffect(() => { warehouseIdRef.current = warehouseId; }, [warehouseId]);

  // Load saved 2D blueprint layout for this warehouse on mount
  useEffect(() => {
    if (!warehouseId || !userToken) return;
    // Skip if we already imported a blueprint or are adding a new bin
    if (route?.params?.fromBlueprint || (route.params?.preloadedObjects && route.params.fromNewBin)) {
      return;
    }
    // Fetch and convert the saved blueprint layout
    getBlueprintsByWarehouse(warehouseId)
      .then(list => list && list.length > 0 ? getBlueprintById(list[0].id) : null)
      .then(bp => {
        if (bp && bp.elements) {
          const blueprintObjs = blueprintTo3D(bp);
          console.log('Loaded blueprint objects:', blueprintObjs.length);
          setObjects(blueprintObjs);
          // Fit camera
          const bounds = calculateObjectsBounds(blueprintObjs);
          if (bounds) {
            cameraStateRef.current = {
              radius: Math.max(bounds.width, bounds.depth) * 1.5,
              theta: Math.PI / 4,
              phi: Math.PI / 3,
            };
            setCameraTarget({ x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ });
          }
          // Now load persisted bins and merge
          setLoadingBins(true);
          fetchLocations(userToken, warehouseId)
            .then(locs => {
              console.log('Fetched persisted locations:', locs.length, locs.map(l => ({ id: l.id, rack: l.rack, shelf: l.shelf })));  
              // Group by inferred rack and shelf
              const groups = {};
              locs.forEach(loc => {
                // Infer rack from shelf if missing
                const rackName = loc.rack || (loc.shelf ? loc.shelf.split('-L')[0] : null);
                const shelfLabel = loc.shelf;
                const key = `${rackName}||${shelfLabel}`;
                // Store rackName on loc for later
                loc._rackName = rackName;
                groups[key] = groups[key] || [];
                groups[key].push(loc);
              });
              console.log('Grouped persisted locations keys:', Object.keys(groups));
              const binMeshes = [];
              Object.entries(groups).forEach(([key, bucket]) => {
                console.log(`Processing group ${key} with ${bucket.length} locations`);
                bucket.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                bucket.forEach((loc, index) => {
                  console.log(`  Loc ${loc.id}: inferredRack='${loc._rackName}', shelf='${loc.shelf}', idx=${index}`);
                  // Attempt to find rack in blueprint objects by inferred rackName
                  const rackCandidates = blueprintObjs.filter(o => o.type === 'rack');
                  console.log('  Available rack labels:', rackCandidates.map(o => o.label));
                  const rackName = loc._rackName;
                  let rackObj = rackCandidates.find(o => o.label === rackName);
                  console.log('  rackObj.label match for', rackName, ':', rackObj ? rackObj.label : 'NONE');
                  if (!rackObj) {
                    // Try matching originalElement.label if first match failed
                    rackObj = rackCandidates.find(o => o.metadata?.originalElement?.label === rackName);
                    console.log('  originalElement.label match:', rackObj ? rackObj.label : 'NONE');
                  }
                  if (!rackObj) return;
                  const levelMatch = (loc.shelf || '').match(/-L(\d+)$/);
                  const shelfIndex = levelMatch ? parseInt(levelMatch[1],10)-1 : 0;
                  const numColumns = rackObj.columns || 1;
                  const numLevels = rackObj.levels || 1;
                  const shelfTh = rackObj.shelfThickness || 0;
                  const cellWidth = rackObj.size.x / numColumns;
                  const cellDepth = rackObj.size.z;
                  const levelGap = rackObj.size.y / (numLevels + 1);
                  const binHeight = levelGap - shelfTh;
                  const shelfY = (shelfIndex + 1) * levelGap;
                  // Replace rectangular bins with cube bins at front edge of shelves
                  const cubeSize = cellWidth;
                  const cubeHalf = cubeSize / 2;
                  // Compute bin positions on left and right halves at front edge
                  const posZ = rackObj.position.z - rackObj.size.z / 2 + cubeHalf;
                  const groupCount = bucket.length;
                  const leftCount = Math.ceil(groupCount / 2);
                  const rightCount = groupCount - leftCount;
                  const halfWidth = rackObj.size.x / 2;
                  const leftEdgeX = rackObj.position.x - halfWidth + cubeHalf;
                  const rightEdgeX = rackObj.position.x + halfWidth - cubeHalf;
                  let posX;
                  if (index < leftCount) {
                    // Left half distribution
                    if (leftCount > 1) {
                      const leftRange = halfWidth - cubeSize;
                      const spacingLeft = leftRange / (leftCount - 1);
                      posX = leftEdgeX + index * spacingLeft;
                    } else {
                      posX = leftEdgeX;
                    }
                  } else {
                    // Right half distribution
                    const j = index - leftCount;
                    if (rightCount > 1) {
                      const rightRange = halfWidth - cubeSize;
                      const spacingRight = rightRange / (rightCount - 1);
                      posX = rightEdgeX - j * spacingRight;
                    } else {
                      posX = rightEdgeX;
                    }
                  }
                  const posY = rackObj.position.y + shelfY + shelfTh / 2 + cubeHalf;
                  console.log(`    Computed position x:${posX.toFixed(2)}, y:${posY.toFixed(2)}, z:${posZ.toFixed(2)}`);
                  binMeshes.push({
                    id: `bin-${loc.id}`,
                    type: 'bin',
                    position: { x: posX, y: posY, z: posZ },
                    size: { x: cubeSize, y: cubeSize, z: cubeSize },
                    color: 0x34C759,
                    label: loc.bin || `Bin-${index+1}`,
                    metadata: { ...loc }
                  });
                });
              });
              console.log('Adding bin meshes:', binMeshes.length);
              setObjects(prev=>[...prev, ...binMeshes]);
            })
            .catch(err=>console.error('Error loading persisted bins:',err))
            .finally(()=>setLoadingBins(false));
        } else {
          // No blueprint found, try to load saved 3D layout for this warehouse
          console.log('No blueprint found, loading saved 3D layout for warehouse:', warehouseId);
          loadWarehouseLayout();
        }
      })
      .catch(err => {
        console.error('Error loading blueprint layout:', err);
        // Fallback to saved 3D layout on error
        loadWarehouseLayout();
      });
    }, [warehouseId, userToken, refreshTrigger]);

  // Load preloaded objects from route params (from 2D blueprint conversion)
  useEffect(() => {
    if (route?.params?.preloadedObjects && Array.isArray(route.params.preloadedObjects)) {
      console.log('Loading preloaded objects from 2D blueprint:', route.params.preloadedObjects.length);
      
      if (route?.params?.fromNewBin && route.params.preloadedObjects.length > 0) {
        // Compute new bin placement based on shelf metadata
        console.log('Placing new bin using shelf metadata');
        const binData = route.params.preloadedObjects[0];
        const rackObj = objectsRef.current.find(o => o.type === 'rack' && o.label === binData.metadata.rack);
        if (rackObj) {
          const levelMatch = (binData.metadata.shelf || '').match(/-L(\d+)$/);
          const shelfIndex = levelMatch ? parseInt(levelMatch[1], 10) - 1 : 0;
          const numColumns = rackObj.columns || 1;
          const numLevels = rackObj.levels || 1;
          const shelfTh = rackObj.shelfThickness || 0;
          // Determine occupied columns on this shelf
          const existingBins = objectsRef.current.filter(o =>
            o.type === 'bin' && o.metadata?.rackId === rackObj.id && o.metadata?.shelfIndex === shelfIndex
          );
          const usedCols = existingBins.map(b => b.metadata.columnIndex);
          let columnIndex = 0;
          while (usedCols.includes(columnIndex) && columnIndex < numColumns) columnIndex++;
          if (columnIndex < numColumns) {
            const cellWidth = rackObj.size.x / numColumns;
            const cellDepth = rackObj.size.z;
            const levelGap = rackObj.size.y / (numLevels + 1);
            const binHeight = levelGap - shelfTh;
            const shelfY = (shelfIndex + 1) * levelGap;
            // Replace rectangular bins with cube bins at front edge of shelves
            const cubeSize = cellWidth;
            const cubeHalf = cubeSize / 2;
            // Position new bin from front to back edges along depth axis
            const frontEdgeZ = rackObj.position.z - rackObj.size.z / 2 + cubeHalf;
            let posZ;
            if (numColumns > 1) {
              const spacing = (rackObj.size.z - cubeSize) / (numColumns - 1);
              posZ = frontEdgeZ + columnIndex * spacing;
            } else {
              posZ = frontEdgeZ;
            }
            const posX = rackObj.position.x;
            const newBin = {
              id: `bin-${rackId}-${shelfIndex}-${columnIndex}-${Date.now()}`,
              type: 'bin',
              position: { x: posX, y: posY, z: posZ },
              size: { x: cubeSize, y: cubeSize, z: cubeSize },
              color: 0x34C759,
              label: `Bin ${columnIndex + 1}`,
              metadata: { rackId, shelfIndex, columnIndex }
            };
            setObjects(prev => [...prev, newBin]);
            if (binData.id) setSelectedId(binData.id);
          } else {
            Alert.alert('No space', 'All columns on this shelf are occupied.');
          }
        } else {
          console.warn('Could not find rack for new bin placement:', binData.metadata.rack);
        }
      } else {
        // Replace demo objects with converted blueprint objects
        setObjects(route.params.preloadedObjects);
      }
      
      // If coming from blueprint, set camera view accordingly
      if (route?.params?.fromBlueprint) {
        // Calculate bounds of imported objects for camera positioning
        const bounds = calculateObjectsBounds(route.params.preloadedObjects);
        if (bounds) {
          // Position camera to show the entire blueprint
          const maxDimension = Math.max(bounds.width, bounds.depth);
          cameraStateRef.current = {
            radius: maxDimension * 1.5,
            theta: Math.PI / 4,
            phi: Math.PI / 3,
          };
          setCameraTarget({ 
            x: bounds.centerX, 
            y: bounds.centerY, 
            z: bounds.centerZ 
          });
        }
      } else if (route?.params?.fromNewBin && route.params.preloadedObjects.length > 0) {
        // Focus camera on the new bin
        const newBin = route.params.preloadedObjects[0];
        setCameraTarget({ 
          x: newBin.position.x, 
          y: newBin.position.y, 
          z: newBin.position.z 
        });
        cameraStateRef.current = {
          radius: 8, // Close-up view of the new bin
          theta: Math.PI / 4,
          phi: Math.PI / 3,
        };
      }
    }
  }, [route?.params?.preloadedObjects, route?.params?.fromBlueprint, route?.params?.fromNewBin]);
  
  // Initial load effect - load warehouse layout if no preloaded objects and no blueprint loading
  useEffect(() => {
    if (warehouseId && userToken && !route?.params?.preloadedObjects && !route?.params?.fromBlueprint) {
      console.log('Initial load: trying to load warehouse layout for:', warehouseId);
      // Small delay to ensure other effects have run
      setTimeout(() => loadWarehouseLayout(), 100);
    }
  }, [warehouseId, userToken]);

  // Helper function to calculate bounds of objects for camera positioning
  const calculateObjectsBounds = (objectList) => {
    if (!objectList || objectList.length === 0) return null;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    objectList.forEach(obj => {
      const { position, size } = obj;
      minX = Math.min(minX, position.x - size.x/2);
      maxX = Math.max(maxX, position.x + size.x/2);
      minY = Math.min(minY, position.y - size.y/2);
      maxY = Math.max(maxY, position.y + size.y/2);
      minZ = Math.min(minZ, position.z - size.z/2);
      maxZ = Math.max(maxZ, position.z + size.z/2);
    });
    
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      centerZ: (minZ + maxZ) / 2,
      width: maxX - minX,
      height: maxY - minY,
      depth: maxZ - minZ,
    };
  };

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
  
  // Refresh locations when screen comes back into focus (for new locations)
  useFocusEffect(
    React.useCallback(() => {
      if (warehouseId && userToken) {
        console.log('Screen focused, refreshing locations...');
        setRefreshTrigger(prev => prev + 1);
      }
    }, [warehouseId, userToken])
  );
  
  // Live listener for new bins created in real-time
  useEffect(() => {
    const handleNewBin = (binMesh) => {
      // Ignore bins for a different warehouse
      if (binMesh.metadata?.warehouseId !== warehouseIdRef.current) {
        console.log('Ignoring bin for different warehouse:', binMesh.metadata?.warehouseId, 'vs', warehouseIdRef.current);
        return;
      }
      
      console.log('🔴 Adding new bin to 3D view:', binMesh.label);
      
      // Add bin to objects and trigger auto-save
      setObjects(prev => {
        // Check if bin already exists to avoid duplicates
        const exists = prev.some(obj => obj.id === binMesh.id);
        if (exists) {
          console.log('Bin already exists, skipping:', binMesh.id);
          return prev;
        }
        return [...prev, binMesh];
      });
      
      // Auto-save the layout after adding new bin
      debouncedSave();
    };
    
    BinEvents.onBinCreated(handleNewBin);
    return () => BinEvents.offBinCreated(handleNewBin);
  }, [debouncedSave]);
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
  // Shelf selection state
  const [selectedShelf, setSelectedShelf] = useState(null);
  const selectedShelfRef = useRef(selectedShelf);
  useEffect(() => { selectedShelfRef.current = selectedShelf; }, [selectedShelf]);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, z: 0 });
  // Objects now support more types including auto-generated elements
  const [objects, setObjects] = useState([
    {
      id: 'demo-rack1',
      type: 'rack',
      position: { x: 0, y: 1.5, z: 0 },
      size: { x: 1.2, y: 3.0, z: 0.6 },
      color: 0x007aff,
      label: 'Storage Rack 1',
      levels: 4,
      columns: 3,
      shelfThickness: 0.05,
      metadata: { capacity: 100 }
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
  const [showAreaMarkerModal, setShowAreaMarkerModal] = useState(false);
  
  // Get selected object for modals
  const selectedObject = selectedId ? objects.find(obj => obj.id === selectedId) : null;
  
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
    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedId) {
        const updatedObj = { ...obj, ...updates };
        
        // Prevent any updates to walls - they are completely fixed
        if (updatedObj.type === 'wall') {
          return obj; // Return unchanged
        }
        
        // Keep area markers on their designated layer
        if (updatedObj.metadata?.massless || updatedObj.metadata?.isAreaMarker) {
          if (updatedObj.position) {
            const layer = updatedObj.metadata?.layer || 0;
            let layerY;
            if (layer === 0) {
              // Zones: bottom layer
              layerY = (updatedObj.size?.y || 0.002) / 2;
            } else if (layer === 1) {
              // Aisles: second layer  
              layerY = 0.01 + (updatedObj.size?.y || 0.02) / 2;
            } else {
              // Default floor for unknown area markers
              layerY = (updatedObj.size?.y || 0.02) / 2;
            }
            updatedObj.position = {
              ...updatedObj.position,
              y: layerY
            };
          }
        }
        
        return updatedObj;
      }
      return obj;
    }));
  };

  // DXF/CAD Import Functions
  const importDXFFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/dxf', 'application/dwg', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected DXF file:', file);
        
        // Read the file content
        const response = await fetch(file.uri);
        const dxfText = await response.text();
        
        setImportedFile({
          name: file.name,
          uri: file.uri,
          content: dxfText,
          type: 'dxf'
        });
        
        Alert.alert('Success', `DXF file "${file.name}" imported successfully!`);
      }
    } catch (error) {
      console.error('Error importing DXF:', error);
      Alert.alert('Error', 'Failed to import DXF file: ' + error.message);
    }
  };

  const importFloorPlan = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        console.log('Selected floor plan:', image);
        
        setFloorPlanImage({
          uri: image.uri,
          width: image.width,
          height: image.height,
        });
        
        Alert.alert('Success', 'Floor plan image imported successfully!');
      }
    } catch (error) {
      console.error('Error importing floor plan:', error);
      Alert.alert('Error', 'Failed to import floor plan image: ' + error.message);
    }
  };

  // Simple DXF parsing functions (basic implementation)
  const parseDXFText = (dxfText) => {
    const lines = dxfText.split('\n').map(line => line.trim());
    const entities = {};
    let currentEntity = null;
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // Detect sections
      if (line === '0' && nextLine === 'SECTION') {
        i += 2; // Skip to section name
        currentSection = lines[i];
        continue;
      }
      
      if (line === '0' && nextLine === 'ENDSEC') {
        currentSection = null;
        continue;
      }
      
      // Parse entities in ENTITIES section
      if (currentSection === 'ENTITIES' && line === '0') {
        const entityType = nextLine;
        if (['LINE', 'CIRCLE', 'LWPOLYLINE', 'POLYLINE'].includes(entityType)) {
          currentEntity = {
            type: entityType,
            id: Date.now() + Math.random(),
            data: {}
          };
          entities[currentEntity.id] = currentEntity;
        }
        i++; // Skip entity type line
        continue;
      }
      
      // Parse entity data
      if (currentEntity && !isNaN(line)) {
        const code = parseInt(line);
        const value = nextLine;
        
        switch (code) {
          case 10: // X coordinate
            if (!currentEntity.data.x1) currentEntity.data.x1 = parseFloat(value);
            else currentEntity.data.x2 = parseFloat(value);
            break;
          case 20: // Y coordinate  
            if (!currentEntity.data.y1) currentEntity.data.y1 = parseFloat(value);
            else currentEntity.data.y2 = parseFloat(value);
            break;
          case 40: // Radius for circles
            currentEntity.data.radius = parseFloat(value);
            break;
        }
        i++; // Skip value line
      }
    }
    
    return Object.values(entities);
  };

  const processDXFData = (dxfText) => {
    try {
      const entities = parseDXFText(dxfText);
      const autoObjects = [];
      let objectCounter = 0;
      
      entities.forEach(entity => {
        objectCounter++;
        
        switch (entity.type) {
          case 'LINE':
            if (entity.data.x1 !== undefined && entity.data.y1 !== undefined && 
                entity.data.x2 !== undefined && entity.data.y2 !== undefined) {
              const startX = entity.data.x1;
              const startY = entity.data.y1;
              const endX = entity.data.x2;
              const endY = entity.data.y2;
              
              const length = Math.sqrt(
                Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
              );
              
              // Scale down coordinates (DXF often uses larger units)
              const scale = 0.01; // Adjust this based on your DXF file units
              
              autoObjects.push({
                id: `dxf-wall-${objectCounter}`,
                type: 'wall',
                position: {
                  x: (startX + endX) / 2 * scale,
                  y: 1.5,
                  z: (startY + endY) / 2 * scale,
                },
                size: { x: length * scale, y: 3.0, z: 0.2 },
                color: 0x808080,
                label: `Wall ${objectCounter}`,
                metadata: { source: 'dxf', entityType: 'LINE' }
              });
            }
            break;
            
          case 'CIRCLE':
            if (entity.data.x1 !== undefined && entity.data.y1 !== undefined && entity.data.radius) {
              const scale = 0.01;
              autoObjects.push({
                id: `dxf-column-${objectCounter}`,
                type: 'column',
                position: {
                  x: entity.data.x1 * scale,
                  y: 1.5,
                  z: entity.data.y1 * scale,
                },
                size: { 
                  x: entity.data.radius * 2 * scale, 
                  y: 3.0, 
                  z: entity.data.radius * 2 * scale 
                },
                color: 0x654321,
                label: `Column ${objectCounter}`,
                metadata: { source: 'dxf', entityType: 'CIRCLE', radius: entity.data.radius }
              });
            }
            break;
            
          case 'LWPOLYLINE':
          case 'POLYLINE':
            // For polylines, create a simple rectangular storage area
            if (entity.data.x1 !== undefined && entity.data.y1 !== undefined) {
              const scale = 0.01;
              const width = Math.abs(entity.data.x2 - entity.data.x1) * scale || 2.0;
              const height = Math.abs(entity.data.y2 - entity.data.y1) * scale || 2.0;
              
              autoObjects.push({
                id: `dxf-area-${objectCounter}`,
                type: 'storage-area',
                position: {
                  x: entity.data.x1 * scale,
                  y: 0.05,
                  z: entity.data.y1 * scale,
                },
                size: { x: width, y: 0.1, z: height },
                color: 0x90EE90,
                label: `Storage Area ${objectCounter}`,
                metadata: { source: 'dxf', entityType: entity.type }
              });
            }
            break;
        }
      });
      
      return autoObjects;
    } catch (error) {
      console.error('Error processing DXF:', error);
      throw new Error('Failed to process DXF file. Please check the file format.');
    }
  };

  const calculateBounds = (vertices) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    vertices.forEach(v => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    });
    
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  };

  // Advanced Image Analysis Functions
  const analyzeFloorPlanImage = async (imageUri) => {
    try {
      setAnalysisStep('Preprocessing image...');
      setAutoGenProgress(5);
      
      // Step 1: Resize and preprocess image for analysis
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } }, // Standardize size for analysis
        ],
        { 
          compress: 1, 
          format: ImageManipulator.SaveFormat.PNG,
          base64: true
        }
      );
      
      setAnalysisStep('Converting to analysis format...');
      setAutoGenProgress(15);
      
      // Step 2: Convert to grayscale for edge detection
      const grayscaleImage = await ImageManipulator.manipulateAsync(
        processedImage.uri,
        [],
        { 
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
          base64: true
        }
      );
      
      setAnalysisStep('Detecting edges and structures...');
      setAutoGenProgress(30);
      
      // Step 3: Analyze the base64 image data
      const analysisResults = await performImageAnalysis(grayscaleImage.base64, {
        width: processedImage.width,
        height: processedImage.height
      });
      
      setAnalysisStep('Identifying room boundaries...');
      setAutoGenProgress(50);
      
      // Step 4: Process analysis results
      const features = await extractWarehouseFeatures(analysisResults);
      setDetectedFeatures(features);
      
      setAnalysisStep('Calculating optimal layout...');
      setAutoGenProgress(70);
      
      // Step 5: Generate warehouse layout based on detected features
      console.log('Debug: Features extracted:', features);
      console.log('Debug: Storage regions:', features.storageRegions?.length || 0);
      console.log('Debug: Walls:', features.walls?.length || 0);
      
      const warehouseLayout = await generateLayoutFromFeatures(features);
      
      console.log('Debug: Generated layout objects:', warehouseLayout?.length || 0);
      
      setAnalysisStep('Building 3D objects...');
      setAutoGenProgress(90);
      
      return warehouseLayout;
      
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  };

  /**
   * Delegates image analysis to the backend service
   */
  const performImageAnalysis = async (base64ImageData, dimensions) => {
    console.log('Debug: Sending image to backend for analysis', dimensions);
    const analysisResults = await analyzeFloorPlanBackend(
      base64ImageData,
      dimensions.width,
      dimensions.height
    );
    console.log('Debug: Received analysis results from backend', analysisResults);
    return analysisResults;
  };

  const extractWarehouseFeatures = async (analysisResults) => {
    const scale = 0.05; // Scale factor from pixels to warehouse units
    
    // Map detected regions and compute world positions for centers
    const storageRegions = analysisResults.regions
      .filter(region => region.suitableForRacks)
      .map(region => ({
        ...region,
        center: {
          x: (region.bounds.x + region.bounds.width / 2) * scale - analysisResults.dimensions.width * scale / 2,
          z: (region.bounds.y + region.bounds.height / 2) * scale - analysisResults.dimensions.height * scale / 2
        }
      }));
    
    const features = {
      walls: analysisResults.edges.map(edge => ({
        start: { 
          x: edge.start.x * scale - analysisResults.dimensions.width * scale / 2,
          z: edge.start.y * scale - analysisResults.dimensions.height * scale / 2
        },
        end: { 
          x: edge.end.x * scale - analysisResults.dimensions.width * scale / 2,
          z: edge.end.y * scale - analysisResults.dimensions.height * scale / 2
        },
        type: edge.type
      })),
      rooms: analysisResults.contours.map(contour => ({
        id: contour.id,
        center: {
          x: (contour.bounds.x + contour.bounds.width/2) * scale - analysisResults.dimensions.width * scale / 2,
          z: (contour.bounds.y + contour.bounds.height/2) * scale - analysisResults.dimensions.height * scale / 2
        },
        size: {
          x: contour.bounds.width * scale,
          z: contour.bounds.height * scale
        },
        type: contour.type
      })),
      storageRegions: storageRegions,
      // Include detected rack cells
      racks: analysisResults.racks || [],
      dimensions: {
        width: analysisResults.dimensions.width * scale,
        height: analysisResults.dimensions.height * scale
      }
    };
    
    return features;
  };

  const generateLayoutFromFeatures = async (features) => {
    const generatedObjects = [];
    let objectId = Date.now();
    const scale = 0.05; // pixel to world unit scale factor

    // Generate walls from detected edges
    features.walls.forEach((wall, index) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
      );

      if (length > 0.5) { // Only create walls longer than 0.5 units
        generatedObjects.push({
          id: `analyzed-wall-${index}-${objectId++}`,
          type: 'wall',
          position: {
            x: (wall.start.x + wall.end.x) / 2,
            y: 2.0,
            z: (wall.start.z + wall.end.z) / 2,
          },
          size: { x: length, y: 4.0, z: 0.2 },
          color: wall.type === 'perimeter' ? 0x606060 : 0x808080,
          label: `${wall.type === 'perimeter' ? 'Exterior' : 'Interior'} Wall ${index + 1}`,
          metadata: { source: 'image-analysis', wallType: wall.type }
        });
      }
    });

    // Generate racks by clustering adjacent detected shelf cells
    if (features.racks && features.racks.length > 0) {
      // Build world-space rectangles
      const cells = features.racks.map(cell => {
        const { x, y, width: w, height: h } = cell.bounds;
        const minX = x * scale - features.dimensions.width / 2;
        const maxX = minX + w * scale;
        const minZ = y * scale - features.dimensions.height / 2;
        const maxZ = minZ + h * scale;
        return { minX, maxX, minZ, maxZ };
      });
      // Union-find for clustering with tolerance
      const parent = cells.map((_, i) => i);
      const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
      const union = (i, j) => { const ri = find(i), rj = find(j); if (ri !== rj) parent[rj] = ri; };
      // Tolerance: merge cells within one grid unit
      const tol = autoGenConfig.GRID_SIZE;
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i], b = cells[j];
          // if rectangles overlap or are within tolerance
          if (!(a.maxX < b.minX - tol || b.maxX < a.minX - tol ||
                a.maxZ < b.minZ - tol || b.maxZ < a.minZ - tol)) {
            union(i, j);
          }
        }
      }
      // Group by root
      const clusters = {};
      cells.forEach((_, i) => {
        const root = find(i);
        (clusters[root] = clusters[root] || []).push(cells[i]);
      });
      // Emit one rack per cluster
      Object.values(clusters).forEach((clusterRects, cIdx) => {
        let cMinX = Infinity, cMaxX = -Infinity, cMinZ = Infinity, cMaxZ = -Infinity;
        clusterRects.forEach(r => {
          cMinX = Math.min(cMinX, r.minX);
          cMaxX = Math.max(cMaxX, r.maxX);
          cMinZ = Math.min(cMinZ, r.minZ);
          cMaxZ = Math.max(cMaxZ, r.maxZ);
        });
        const widthW = cMaxX - cMinX;
        const depthD = cMaxZ - cMinZ;
        const posX = (cMinX + cMaxX) / 2;
        const posZ = (cMinZ + cMaxZ) / 2;
        generatedObjects.push({
          id: `analyzed-rack-${cIdx}-${objectId++}`,
          type: 'rack',
          position: { x: posX, y: autoGenConfig.RACK_HEIGHT / 2, z: posZ },
          size: { x: widthW, y: autoGenConfig.RACK_HEIGHT, z: depthD },
          color: 0x4169E1,
          label: `Rack ${cIdx + 1}`,
          metadata: { source: 'image-analysis' }
        });
      });
    } else {
      // Fallback: generate storage racks in detected storage regions
      features.storageRegions.forEach((region, regionIndex) => {
        const rackWidth = autoGenConfig.SHELF_DEPTH;
        const rackLength = 3.0;
        const rackHeight = autoGenConfig.RACK_HEIGHT;
        const aisleWidth = autoGenConfig.AISLE_WIDTH;
        const regionWidth = region.bounds.width;
        const regionHeight = region.bounds.height;
        const regionCenterX = region.center.x;
        const regionCenterZ = region.center.z;
        const racksX = Math.max(1, Math.floor(regionWidth / (rackLength + aisleWidth)));
        const racksZ = Math.max(1, Math.floor(regionHeight / (rackWidth + aisleWidth)));
        for (let xIdx = 0; xIdx < racksX; xIdx++) {
          for (let zIdx = 0; zIdx < racksZ; zIdx++) {
            const rackX = regionCenterX + (xIdx - racksX / 2 + 0.5) * (rackLength + aisleWidth);
            const rackZ = regionCenterZ + (zIdx - racksZ / 2 + 0.5) * (rackWidth + aisleWidth);
            generatedObjects.push({
              id: `analyzed-rack-${regionIndex}-${xIdx}-${zIdx}-${objectId++}`,
              type: 'rack',
              position: { x: rackX, y: rackHeight / 2, z: rackZ },
              size: { x: rackLength, y: rackHeight, z: rackWidth },
              color: 0x4169E1,
              label: `Rack ${String.fromCharCode(65 + regionIndex)}${xIdx + 1}${zIdx + 1}`,
              metadata: { source: 'image-analysis', region: regionIndex }
            });
          }
        }
      });
    }

    // Add loading docks based on the floor plan layout
    const dockWidth = 3.0;
    const dockDepth = 2.0;
    const dockHeight = 1.0;
    
    // Left loading dock (Shipping area)
    generatedObjects.push({
      id: `analyzed-dock-left-${objectId++}`,
      type: 'loading-dock',
      position: { 
        x: -features.dimensions.width * 0.3, 
        y: dockHeight/2, 
        z: -features.dimensions.height * 0.4 
      },
      size: { x: dockWidth, y: dockHeight, z: dockDepth },
      color: 0xFF6347,
      label: 'Shipping Dock',
      metadata: { source: 'image-analysis', dockType: 'shipping' }
    });
    
    // Right loading dock (Loading & Unloading area)
    generatedObjects.push({
      id: `analyzed-dock-right-${objectId++}`,
      type: 'loading-dock',
      position: { 
        x: features.dimensions.width * 0.3, 
        y: dockHeight/2, 
        z: -features.dimensions.height * 0.4 
      },
      size: { x: dockWidth, y: dockHeight, z: dockDepth },
      color: 0xFF6347,
      label: 'Loading & Unloading Dock',
      metadata: { source: 'image-analysis', dockType: 'loading' }
    });
    
    return generatedObjects;
  };

  const generateWarehouseFromFloorPlan = async () => {
    if (!floorPlanImage) {
      Alert.alert('Error', 'Please import a floor plan image first');
      return;
    }
    
    setIsGenerating(true);
    setAutoGenProgress(0);
    
    try {
      setAnalysisStep('Starting image analysis...');
      console.log('Debug: Starting analysis with image:', floorPlanImage);
      
      // Perform real image analysis
      const generatedObjects = await analyzeFloorPlanImage(floorPlanImage.uri);
      
      setAnalysisStep('Finalizing warehouse layout...');
      setAutoGenProgress(100);
      
      console.log('Debug: Final generated objects:', generatedObjects);
      
      if (generatedObjects && generatedObjects.length > 0) {
        setObjects(prev => [...prev, ...generatedObjects]);
        
        Alert.alert(
          'Analysis Complete!', 
          `Generated ${generatedObjects.length} warehouse elements from floor plan analysis!\n\n` +
          `Detected Features:\n` +
          `• ${detectedFeatures.walls?.length || 0} walls\n` +
          `• ${detectedFeatures.rooms?.length || 0} rooms/areas\n` +
          `• ${detectedFeatures.storageRegions?.length || 0} storage regions\n\n` +
          `Generated Objects:\n` +
          `• ${generatedObjects.filter(obj => obj.type === 'wall').length} walls\n` +
          `• ${generatedObjects.filter(obj => obj.type === 'rack').length} storage racks\n` +
          `• ${generatedObjects.filter(obj => obj.type === 'loading-dock').length} loading docks`
        );
      } else {
        console.log('Debug: No objects generated');
        console.log('Debug: DetectedFeatures:', detectedFeatures);
        console.log('Debug: FloorPlanImage details:', floorPlanImage);
        Alert.alert(
          'Analysis Complete', 
          `No warehouse elements were generated from the floor plan.\n\n` +
          `Image details: ${floorPlanImage.width}x${floorPlanImage.height}px\n\n` +
          `This could be because:\n` +
          `• The image doesn't contain recognizable floor plan features\n` +
          `• The image quality is too low for analysis\n` +
          `• The floor plan format is not supported\n\n` +
          `Try using a clearer architectural floor plan or blueprint image.\n\n` +
          `Check the console for debug information.`
        );
      }
      
    } catch (error) {
      console.error('Error generating warehouse:', error);
      Alert.alert('Error', 'Failed to analyze floor plan: ' + error.message);
    } finally {
      setIsGenerating(false);
      setAutoGenProgress(0);
      setAnalysisStep('');
    }
  };

  const generateSmartWarehouseLayout = async () => {
    const { width, height } = floorPlanImage;
    const scale = Math.min(20 / width * 1000, 20 / height * 1000); // Scale to fit 20x20 unit area
    
    const generatedObjects = [];
    let objectId = Date.now();
    
    // Generate perimeter walls
    const wallThickness = 0.3;
    const wallHeight = 4.0;
    const warehouseWidth = 20;
    const warehouseLength = 20;
    
    // North wall
    generatedObjects.push({
      id: `generated-wall-north-${objectId++}`,
      type: 'wall',
      position: { x: 0, y: wallHeight/2, z: warehouseLength/2 },
      size: { x: warehouseWidth, y: wallHeight, z: wallThickness },
      color: 0x808080,
      label: 'North Wall',
      metadata: { source: 'auto-generated', wallType: 'perimeter' }
    });
    
    // South wall  
    generatedObjects.push({
      id: `generated-wall-south-${objectId++}`,
      type: 'wall',
      position: { x: 0, y: wallHeight/2, z: -warehouseLength/2 },
      size: { x: warehouseWidth, y: wallHeight, z: wallThickness },
      color: 0x808080,
      label: 'South Wall',
      metadata: { source: 'auto-generated', wallType: 'perimeter' }
    });
    
    // East wall
    generatedObjects.push({
      id: `generated-wall-east-${objectId++}`,
      type: 'wall',
      position: { x: warehouseWidth/2, y: wallHeight/2, z: 0 },
      size: { x: wallThickness, y: wallHeight, z: warehouseLength },
      color: 0x808080,
      label: 'East Wall',
      metadata: { source: 'auto-generated', wallType: 'perimeter' }
    });
    
    // West wall
    generatedObjects.push({
      id: `generated-wall-west-${objectId++}`,
      type: 'wall',
      position: { x: -warehouseWidth/2, y: wallHeight/2, z: 0 },
      size: { x: wallThickness, y: wallHeight, z: warehouseLength },
      color: 0x808080,
      label: 'West Wall',
      metadata: { source: 'auto-generated', wallType: 'perimeter' }
    });
    
    // Generate storage racks in a grid pattern
    const rackWidth = autoGenConfig.SHELF_DEPTH;
    const rackLength = 4.0;
    const rackHeight = autoGenConfig.RACK_HEIGHT;
    const aisleWidth = autoGenConfig.AISLE_WIDTH;
    
    const rackRows = 3;
    const racksPerRow = 4;
    
    for (let row = 0; row < rackRows; row++) {
      for (let rack = 0; rack < racksPerRow; rack++) {
        const x = (rack - racksPerRow/2 + 0.5) * (rackLength + aisleWidth);
        const z = (row - rackRows/2 + 0.5) * (rackWidth + aisleWidth);
        
        generatedObjects.push({
          id: `generated-rack-${row}-${rack}-${objectId++}`,
          type: 'rack',
          position: { x, y: rackHeight/2, z },
          size: { x: rackLength, y: rackHeight, z: rackWidth },
          color: 0x4169E1,
          label: `Rack ${String.fromCharCode(65 + row)}${rack + 1}`,
          metadata: { 
            source: 'auto-generated', 
            row: row + 1, 
            position: rack + 1,
            capacity: 200,
            levels: 5
          }
        });
      }
    }
    
    // Generate loading docks
    const dockWidth = 3.0;
    const dockHeight = 1.0;
    const dockDepth = 2.0;
    
    for (let i = 0; i < 2; i++) {
      generatedObjects.push({
        id: `generated-dock-${i + 1}-${objectId++}`,
        type: 'loading-dock',
        position: { 
          x: (i - 0.5) * (dockWidth + 2), 
          y: dockHeight/2, 
          z: -warehouseLength/2 + dockDepth/2 
        },
        size: { x: dockWidth, y: dockHeight, z: dockDepth },
        color: 0xFF6347,
        label: `Loading Dock ${i + 1}`,
        metadata: { source: 'auto-generated', dockNumber: i + 1 }
      });
    }
    
    return generatedObjects;
  };

  const processImportedFile = async () => {
    if (!importedFile) {
      Alert.alert('Error', 'No file imported');
      return;
    }
    
    setIsGenerating(true);
    setAutoGenProgress(0);
    
    try {
      let generatedObjects = [];
      
      if (importedFile.type === 'dxf') {
        setAutoGenProgress(25);
        generatedObjects = processDXFData(importedFile.content);
        setAutoGenProgress(75);
      }
      
      if (generatedObjects.length > 0) {
        setObjects(prev => [...prev, ...generatedObjects]);
        setAutoGenProgress(100);
        Alert.alert('Success', `Generated ${generatedObjects.length} objects from ${importedFile.name}!`);
      } else {
        Alert.alert('Warning', 'No objects could be generated from the imported file');
      }
      
    } catch (error) {
      console.error('Error processing imported file:', error);
      Alert.alert('Error', 'Failed to process imported file');
    } finally {
      setIsGenerating(false);
      setAutoGenProgress(0);
      setShowImportModal(false);
    }
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

  // Save layout (REMOVED AUTOMATIC LOCATION GENERATOR)
  const saveLayout = async () => {
    try {
      // Save 3D layout locally only - no automatic location generation
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
        metadata: {
          version: '2.0',
          savedAt: new Date().toISOString(),
          warehouseId: warehouseIdRef.current,
        }
      };
      
      const layoutKey = getLayoutKey(warehouseIdRef.current);
      await AsyncStorage.setItem(layoutKey, JSON.stringify(layout));
      
      Alert.alert('Success', 'Warehouse layout saved successfully!');
    } catch (e) {
      console.error('Error saving layout:', e);
      Alert.alert('Error', e.message || 'Failed to save layout.');
    }
  };

  // Load layout from AsyncStorage
  const loadLayout = async () => {
    try {
      setReady(false);
      const layoutKey = getLayoutKey(warehouseIdRef.current);
      const json = await AsyncStorage.getItem(layoutKey);
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

  // Handle return to 2D blueprint editor
  const handleBackTo2D = () => {
    try {
      // Convert current 3D objects back to 2D blueprint elements
      const blueprintData = meshesToBlueprint(objectsRef.current);
      
      if (blueprintData.elements.length === 0) {
        Alert.alert(
          'No Elements',
          'No compatible elements found to convert back to 2D.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Provide feedback about what's being converted
      const elementCounts = blueprintData.elements.reduce((counts, element) => {
        counts[element.type] = (counts[element.type] || 0) + 1;
        return counts;
      }, {});

      const conversionSummary = Object.entries(elementCounts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');

      console.log(`Converting 3D objects back to 2D: ${conversionSummary}`);

      // Navigate back to 2D builder with the converted blueprint
      navigation.navigate('Warehouse2DBuilder', {
        blueprintId: route?.params?.blueprintId,
        warehouseId: route?.params?.warehouseId || warehouseIdRef.current,
        preloadedBlueprint: {
          elements: blueprintData.elements,
          dimensions: blueprintData.dimensions,
          name: route?.params?.blueprintName || 'Converted from 3D',
        },
        from3D: true,
      });

    } catch (error) {
      console.error('Error converting 3D to 2D:', error);
      Alert.alert(
        'Conversion Error',
        'An error occurred while converting the 3D layout back to 2D. Please try again.',
        [{ text: 'OK' }]
      );
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
                const meshIntersects = raycaster.intersectObjects(meshRefs.current, true);
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
              const intersects = raycaster.intersectObjects(meshRefs.current, true);
              if (intersects.length > 0) {
                // Map hit on group child or mesh to parent object index
                const hit = intersects[0].object;
                const objIdx = meshRefs.current.findIndex(m =>
                  m === hit || (m.children && m.children.includes(hit))
                );
                if (objIdx === -1) {
                  setSelectedId(null);
                  setSelectedShelf(null);
                  draggingRef.current = false;
                  forceRender(n => n + 1);
                  return;
                }
                const obj = objectsRef.current[objIdx];
                
                // Walls are completely untappable and fixed - ignore them entirely
                if (obj.type === 'wall') {
                  setSelectedId(null);
                  setSelectedShelf(null);
                  draggingRef.current = false;
                  forceRender(n => n + 1);
                  return;
                }
                
                // Allow selection of area markers for viewing properties, but prevent dragging
                if (obj.metadata?.isAreaMarker || obj.metadata?.massless || 
                    obj.type === 'zone' || obj.type === 'aisle') {
                  setSelectedId(obj.id);
                  setSelectedShelf(null);
                  setShowAreaMarkerModal(true); // Show properties modal
                  draggingRef.current = false; // Important: prevent dragging
                  forceRender(n => n + 1);
                  return;
                }
                
                setSelectedId(obj.id);
                // Detect if hit was a shelf mesh
                const shelfIndex = hit.userData?.shelfIndex;
                const rackId = hit.userData?.rackId;
                if (shelfIndex != null && rackId === obj.id) {
                  setSelectedShelf({ rackId, shelfIndex });
                } else {
                  setSelectedShelf(null);
                }
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
                setSelectedShelf(null);
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
            // Double-check: prevent moving walls and area markers even if somehow selected
            const draggedObj = objectsRef.current.find(o => o.id === selectedIdRef.current);
            if (draggedObj?.type === 'wall' || 
                draggedObj?.metadata?.isAreaMarker || draggedObj?.metadata?.massless || 
                draggedObj?.type === 'zone' || draggedObj?.type === 'aisle') {
              setSelectedId(null);
              draggingRef.current = false;
              return;
            }
            
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
                // Calculate Y position with proper layering
                let newY;
                if (draggedObj?.metadata?.massless || draggedObj?.metadata?.isAreaMarker) {
                  // Area markers stay on their designated layer
                  const layer = draggedObj?.metadata?.layer || 0;
                  if (layer === 0) {
                    // Zones: bottom layer
                    newY = (draggedObj?.size.y || 0.002) / 2;
                  } else if (layer === 1) {
                    // Aisles: second layer
                    newY = 0.01 + (draggedObj?.size.y || 0.02) / 2;
                  } else {
                    // Default floor for unknown area markers
                    newY = (draggedObj?.size.y || 0.02) / 2;
                  }
                } else {
                  // Physical objects: layer 2+ with stacking
                  const floorOffset = 0.05; // Clear space above floor markers
                  newY = maxY !== null
                    ? maxY + (draggedObj?.size.y || 1) / 2
                    : floorOffset + (draggedObj?.size.y || 1) / 2;
                }
                
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
      if (obj.type === 'rack') {
        const rackGroup = buildRackMesh(obj);
        sceneRef.current.add(rackGroup);
        return rackGroup;
      }
      let geometry, material, mesh;
      if (obj.type === 'pallet') {
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
      
      // Add 3D labels for area markers (zones and aisles) - rebuild version
      if (obj.metadata?.isAreaMarker || obj.type === 'zone' || obj.type === 'aisle') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Style the text
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = obj.type === 'zone' ? '#2196F3' : '#FF9800';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw text
        const text = obj.label || `${obj.type.charAt(0).toUpperCase()}${obj.type.slice(1)}`;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Position label above the area marker
        sprite.position.set(
          0, // Relative to mesh
          Math.max(obj.size.y / 2 + 0.5, 1.0), // Ensure minimum height
          0
        );
        
        // Scale based on area size
        const scale = Math.min(Math.max(obj.size.x, obj.size.z) * 0.3, 3.0);
        sprite.scale.set(scale, scale * 0.25, 1);
        
        mesh.add(sprite); // Attach to mesh so it moves with the object
      }
      
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
        
        // Handle area markers with transparency
        const materialProps = { color: obj.color };
        if (obj.metadata?.isAreaMarker || obj.metadata?.massless) {
          materialProps.transparent = true;
          materialProps.opacity = obj.opacity || 0.3;
          materialProps.depthWrite = false; // Prevent depth conflicts
        }
        
        material = new THREE.MeshStandardMaterial(materialProps);
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
        
        // Store massless flag for movement logic
        mesh.userData = { 
          ...mesh.userData, 
          massless: obj.metadata?.massless || false,
          isAreaMarker: obj.metadata?.isAreaMarker || false
        };
        
        // Add 3D labels for area markers (zones and aisles)
        if (obj.metadata?.isAreaMarker || obj.type === 'zone' || obj.type === 'aisle') {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = 512;
          canvas.height = 128;
          
          // Style the text
          context.fillStyle = 'rgba(255, 255, 255, 0.9)';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = obj.type === 'zone' ? '#2196F3' : '#FF9800';
          context.font = 'bold 48px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          
          // Draw text
          const text = obj.label || `${obj.type.charAt(0).toUpperCase()}${obj.type.slice(1)}`;
          context.fillText(text, canvas.width / 2, canvas.height / 2);
          
          // Create texture and sprite
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          
          // Position label above the area marker
          sprite.position.set(
            obj.position.x,
            obj.position.y + Math.max(obj.size.y / 2 + 0.5, 1.0), // Ensure minimum height
            obj.position.z
          );
          
          // Scale based on area size
          const scale = Math.min(Math.max(obj.size.x, obj.size.z) * 0.3, 3.0);
          sprite.scale.set(scale, scale * 0.25, 1);
          
          mesh.add(sprite); // Attach to mesh so it moves with the object
        }
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
          const colorValue = selectedIdRef.current === obj.id ? 0xffa500 : obj.color;
          if (mesh.material && mesh.material.color) {
            mesh.material.color.set(colorValue);
          } else if (mesh.type === 'Group') {
            mesh.children.forEach(child => {
              if (child.material && child.material.color) {
                child.material.color.set(colorValue);
              }
            });
          }
        }
      });
      const { radius, theta, phi } = cameraStateRef.current;
      const target = cameraTargetRef.current;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target.x, target.y, target.z);
      // Wrap renderer in try/catch to avoid unhandled errors
      try {
        renderer.render(scene, camera);
      } catch (error) {
        console.error('Error during renderer.render:', error);
      }
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

  // Handler to add a bin on the selected shelf
  const handleAddBin = () => {
    if (!selectedShelf) {
      Alert.alert('No shelf selected', 'Please tap on a shelf surface to add a bin.');
      return;
    }
    const { rackId, shelfIndex } = selectedShelf;
    const rackObj = objects.find(o => o.id === rackId);
    if (!rackObj) return;
    // Fallback defaults to avoid NaN
    const numColumns = rackObj.columns ?? 1;
    const numLevels = rackObj.levels ?? 1;
    const shelfTh = rackObj.shelfThickness ?? 0;
    // Determine occupied columns
    const existingBins = objects.filter(o => o.type === 'bin' && o.metadata?.rackId === rackId && o.metadata?.shelfIndex === shelfIndex);
    const usedCols = existingBins.map(b => b.metadata.columnIndex);
    let columnIndex = 0;
    while (usedCols.includes(columnIndex) && columnIndex < numColumns) columnIndex++;
    if (columnIndex >= numColumns) {
      Alert.alert('No space', 'All columns on this shelf are occupied.');
      return;
    }
    // Dimensions
    const cellWidth = rackObj.size.x / numColumns;
    const cellDepth = rackObj.size.z;
    const levelGap = rackObj.size.y / (numLevels + 1);
    const binHeight = levelGap - shelfTh;
    const shelfY = (shelfIndex + 1) * levelGap;
    // Position bins on left/right halves at front edge
    const cubeSize = cellWidth;
    const cubeHalf = cubeSize / 2;
    const frontEdgeZ = rackObj.position.z - rackObj.size.z / 2 + cubeHalf;
    const leftCount = Math.ceil(numColumns / 2);
    const rightCount = numColumns - leftCount;
    const halfWidth = rackObj.size.x / 2;
    const leftEdgeX = rackObj.position.x - halfWidth + cubeHalf;
    const rightEdgeX = rackObj.position.x + halfWidth - cubeHalf;
    let posX;
    if (columnIndex < leftCount) {
      if (leftCount > 1) {
        const leftRange = halfWidth - cubeSize;
        const spacingLeft = leftRange / (leftCount - 1);
        posX = leftEdgeX + columnIndex * spacingLeft;
      } else {
        posX = leftEdgeX;
      }
    } else {
      const j = columnIndex - leftCount;
      if (rightCount > 1) {
        const rightRange = halfWidth - cubeSize;
        const spacingRight = rightRange / (rightCount - 1);
        posX = rightEdgeX - j * spacingRight;
      } else {
        posX = rightEdgeX;
      }
    }
    const posZ = frontEdgeZ;
    const posY = rackObj.position.y + shelfY + shelfTh / 2 + cubeHalf;
    const newBin = {
      id: `bin-${rackId}-${shelfIndex}-${columnIndex}-${Date.now()}`,
      type: 'bin',
      position: { x: posX, y: posY, z: posZ },
      size: { x: cubeSize, y: cubeSize, z: cubeSize },
      color: 0x34C759,
      label: `Bin ${columnIndex + 1}`,
      metadata: { rackId, shelfIndex, columnIndex }
    };
    setObjects(prev => [...prev, newBin]);
  };

  // Show success message for new bins
  useEffect(() => {
    if (route?.params?.fromNewBin && route?.params?.newBinId) {
      // Add a small delay to let the 3D view load
      const timer = setTimeout(() => {
        Alert.alert(
          'Bin Created Successfully!',
          'Your new storage bin has been added to the warehouse. It\'s highlighted in orange.',
          [{ text: 'Got it!' }]
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.fromNewBin, route?.params?.newBinId]);

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
        
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowImportModal(true)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="import" size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Import</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowAutoGenModal(true)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="auto-fix" size={18} color="#34C759" />
          <Text style={styles.actionButtonText}>Auto-Gen</Text>
        </TouchableOpacity>

        {/* Back to 2D button - only show if came from blueprint */}
        {route?.params?.fromBlueprint && (
          <TouchableOpacity style={styles.actionButton} onPress={handleBackTo2D} activeOpacity={0.8}>
            <MaterialCommunityIcons name="view-grid" size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Back to 2D</Text>
          </TouchableOpacity>
        )}
        
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

      {/* Properties & Add Bin Buttons */}
      {selectedId && !showProperties && (
        <View style={styles.propertiesContainer}>
          <TouchableOpacity 
            style={styles.propertiesButtonInner}
            onPress={() => setShowProperties(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="cog" size={20} color="#007AFF" />
            <Text style={styles.propertiesButtonText}>Properties</Text>
          </TouchableOpacity>
          {selectedShelf && (
            <TouchableOpacity
              style={styles.addBinButton}
              onPress={handleAddBin}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="package-plus" size={20} color="#34C759" />
              <Text style={styles.propertiesButtonText}>Add Bin</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="import" size={24} color="#007AFF" />
                <Text style={styles.modalTitle}>Import Files</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowImportModal(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.propertyContainer}>
                <Text style={styles.infoSectionTitle}>Import DXF/CAD Files</Text>
                <Text style={styles.infoText}>
                  Import DXF or CAD files to automatically generate 3D warehouse structures from technical drawings.
                </Text>
                
                <TouchableOpacity 
                  style={[styles.modalButton, { marginTop: 16 }]}
                  onPress={importDXFFile}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="file-cad" size={20} color="white" />
                  <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>Select DXF/CAD File</Text>
                </TouchableOpacity>
                
                {importedFile && (
                  <View style={styles.importedFileInfo}>
                    <MaterialCommunityIcons name="file-check" size={20} color="#34C759" />
                    <Text style={styles.importedFileName}>{importedFile.name}</Text>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: '#34C759', marginTop: 8 }]}
                      onPress={processImportedFile}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalButtonText}>Generate 3D Objects</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <View style={styles.propertyContainer}>
                <Text style={styles.infoSectionTitle}>Import Floor Plan Images</Text>
                <Text style={styles.infoText}>
                  Import high-resolution PNG or JPG floor plans for AI-powered warehouse generation.
                </Text>
                
                <TouchableOpacity 
                  style={[styles.modalButton, { marginTop: 16, backgroundColor: '#FF9500' }]}
                  onPress={importFloorPlan}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="image" size={20} color="white" />
                  <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>Select Floor Plan Image</Text>
                </TouchableOpacity>
                
                {floorPlanImage && (
                  <View style={styles.importedFileInfo}>
                    <MaterialCommunityIcons name="image-check" size={20} color="#FF9500" />
                    <Text style={styles.importedFileName}>Floor plan imported</Text>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: '#FF9500', marginTop: 8 }]}
                      onPress={generateWarehouseFromFloorPlan}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalButtonText}>Generate Smart Layout</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#8E8E93' }]}
                onPress={() => setShowImportModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-Generation Modal */}
      <Modal
        visible={showAutoGenModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAutoGenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="auto-fix" size={24} color="#34C759" />
                <Text style={styles.modalTitle}>Auto-Generation Settings</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAutoGenModal(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
                         <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.propertyContainer}>
                <Text style={styles.infoSectionTitle}>Warehouse Configuration</Text>
                
                <View style={styles.propertyItem}>
                  <Text style={styles.modalLabel}>Rack Height (m)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={String(autoGenConfig.RACK_HEIGHT)}
                    keyboardType="numeric"
                    onChangeText={text => {
                      const num = parseFloat(text);
                      if (!isNaN(num)) setAutoGenConfig(prev => ({ ...prev, RACK_HEIGHT: num }));
                    }}
                  />
                </View>
                
                <View style={styles.propertyItem}>
                  <Text style={styles.modalLabel}>Shelf Depth (m)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={String(autoGenConfig.SHELF_DEPTH)}
                    keyboardType="numeric"
                    onChangeText={text => {
                      const num = parseFloat(text);
                      if (!isNaN(num)) setAutoGenConfig(prev => ({ ...prev, SHELF_DEPTH: num }));
                    }}
                  />
                </View>
                
                <View style={styles.propertyItem}>
                  <Text style={styles.modalLabel}>Aisle Width (m)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={String(autoGenConfig.AISLE_WIDTH)}
                    keyboardType="numeric"
                    onChangeText={text => {
                      const num = parseFloat(text);
                      if (!isNaN(num)) setAutoGenConfig(prev => ({ ...prev, AISLE_WIDTH: num }));
                    }}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: '#34C759', marginTop: 20 }]}
                  onPress={() => {
                    setShowAutoGenModal(false);
                    generateWarehouseFromFloorPlan();
                  }}
                  activeOpacity={0.8}
                  disabled={!floorPlanImage}
                >
                  <MaterialCommunityIcons name="auto-fix" size={20} color="white" />
                  <Text style={[styles.modalButtonText, { marginLeft: 8 }]}>
                    {floorPlanImage ? 'Generate Layout' : 'Import Floor Plan First'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#8E8E93' }]}
                onPress={() => setShowAutoGenModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Area Marker Properties Modal */}
      <Modal
        visible={showAreaMarkerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAreaMarkerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons 
                  name={selectedObject?.type === 'zone' ? 'view-grid' : 'road'} 
                  size={24} 
                  color={selectedObject?.type === 'zone' ? '#2196F3' : '#FF9800'} 
                />
                <Text style={styles.modalTitle}>
                  {selectedObject?.type === 'zone' ? 'Zone Properties' : 'Aisle Properties'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAreaMarkerModal(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedObject && (
                <View style={styles.propertyContainer}>
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Component ID</Text>
                    <Text style={styles.modalValue}>{selectedObject.id}</Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Type</Text>
                    <Text style={styles.modalValue}>
                      {selectedObject.type === 'zone' ? 'Storage Zone' : 'Warehouse Aisle'}
                    </Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Label</Text>
                    <Text style={styles.modalValue}>{selectedObject.label || 'Unnamed'}</Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>
                      {selectedObject.type === 'zone' ? 'Dimensions (Width × Depth)' : 'Dimensions (Length × Width)'}
                    </Text>
                    <Text style={styles.modalValue}>
                      {selectedObject.size.x.toFixed(1)}m × {selectedObject.size.z.toFixed(1)}m
                    </Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Area</Text>
                    <Text style={styles.modalValue}>
                      {(selectedObject.size.x * selectedObject.size.z).toFixed(1)} m²
                    </Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Position (X, Z)</Text>
                    <Text style={styles.modalValue}>
                      ({selectedObject.position.x.toFixed(1)}, {selectedObject.position.z.toFixed(1)})
                    </Text>
                  </View>
                  
                  <View style={styles.propertyItem}>
                    <Text style={styles.modalLabel}>Layer</Text>
                    <Text style={styles.modalValue}>
                      Layer {selectedObject.metadata?.layer || 0} ({selectedObject.type === 'zone' ? 'Bottom' : 'Second'})
                    </Text>
                  </View>
                  
                  <View style={[styles.propertyItem, { 
                    backgroundColor: '#FFF9C4', 
                    padding: 12, 
                    borderRadius: 8, 
                    borderLeftWidth: 4, 
                    borderLeftColor: '#FFC107' 
                  }]}>
                    <Text style={[styles.modalLabel, { color: '#F57F17', marginBottom: 4 }]}>
                      ⚠️ Read-Only Area Marker
                    </Text>
                    <Text style={[styles.modalValue, { color: '#F57F17', fontSize: 14 }]}>
                      This {selectedObject.type} can only be edited from the 2D Blueprint Editor. 
                      Use "Back to 2D" to modify zones and aisles.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#8E8E93' }]}
                onPress={() => setShowAreaMarkerModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generation Progress Modal */}
      {isGenerating && (
        <Modal
          visible={isGenerating}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.progressModalOverlay}>
            <View style={styles.progressModalContent}>
              <MaterialCommunityIcons 
                name={floorPlanImage ? "image-search" : "auto-fix"} 
                size={48} 
                color="#34C759" 
              />
              <Text style={styles.progressTitle}>
                {floorPlanImage ? 'Analyzing Floor Plan' : 'Generating Warehouse'}
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View 
                    style={[
                      styles.progressFill, 
                      { width: `${autoGenProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(autoGenProgress)}%</Text>
              </View>
              {analysisStep && (
                <Text style={styles.analysisStep}>{analysisStep}</Text>
              )}
              <Text style={styles.progressSubtitle}>
                {floorPlanImage 
                  ? 'AI is analyzing your floor plan to detect walls, rooms, and optimal storage layouts...'
                  : 'Please wait while we analyze and generate your 3D warehouse...'
                }
              </Text>
              {detectedFeatures.walls.length > 0 && (
                <View style={styles.detectedFeaturesContainer}>
                  <Text style={styles.detectedFeaturesTitle}>Detected Features:</Text>
                  <Text style={styles.detectedFeatureItem}>• {detectedFeatures.walls.length} wall segments</Text>
                  <Text style={styles.detectedFeatureItem}>• {detectedFeatures.rooms.length} room areas</Text>
                  {detectedFeatures.storageRegions && (
                    <Text style={styles.detectedFeatureItem}>• {detectedFeatures.storageRegions.length} storage regions</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
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

  // Properties & Add Bin Buttons
  propertiesContainer: {
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
  propertiesButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  propertiesButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  addBinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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

  // Import Modal Styles
  importedFileInfo: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'column',
    alignItems: 'center',
  },
  importedFileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Progress Modal Styles
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressModalContent: {
    backgroundColor: 'white',
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
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  analysisStep: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  detectedFeaturesContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
  },
  detectedFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  detectedFeatureItem: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 4,
  },
});