import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CAMERA_SETTINGS } from '../utils/blueprintConstants';

// Initial state
const initialState = {
  // Blueprint data
  elements: [],
  selectedId: null,
  
  // Camera state
  camera: {
    offsetX: 200, // Center the view initially
    offsetY: 150,
    zoom: CAMERA_SETTINGS.DEFAULT_ZOOM,
  },
  
  // Warehouse info
  warehouseId: null,
  warehouseName: '',
  dimensions: { width: 50, depth: 30 }, // Default warehouse dimensions in meters
  
  // UI state
  isLoading: false,
  error: null,
  isDragging: false,
  dragStartPos: null,
  
  // Tool state
  activeTool: null, // 'select', 'zone', 'aisle', 'rack', 'wall', 'door', 'office'
  
  // Undo/Redo
  undoStack: [],
  redoStack: [],
  
  // Blueprint metadata
  blueprintId: null,
  blueprintName: '',
  lastSaved: null,
  hasUnsavedChanges: false,
};

// Action types
export const BUILDER_ACTIONS = {
  // Element actions
  ADD_ELEMENT: 'ADD_ELEMENT',
  UPDATE_ELEMENT: 'UPDATE_ELEMENT',
  DELETE_ELEMENT: 'DELETE_ELEMENT',
  SELECT_ELEMENT: 'SELECT_ELEMENT',
  DESELECT_ALL: 'DESELECT_ALL',
  
  // Camera actions
  SET_CAMERA: 'SET_CAMERA',
  ZOOM_IN: 'ZOOM_IN',
  ZOOM_OUT: 'ZOOM_OUT',
  PAN_CAMERA: 'PAN_CAMERA',
  FIT_TO_VIEW: 'FIT_TO_VIEW',
  
  // Warehouse actions
  SET_WAREHOUSE: 'SET_WAREHOUSE',
  SET_DIMENSIONS: 'SET_DIMENSIONS',
  
  // Blueprint actions
  LOAD_BLUEPRINT: 'LOAD_BLUEPRINT',
  SAVE_BLUEPRINT: 'SAVE_BLUEPRINT',
  NEW_BLUEPRINT: 'NEW_BLUEPRINT',
  
  // UI actions
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_DRAGGING: 'SET_DRAGGING',
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
  
  // Undo/Redo
  UNDO: 'UNDO',
  REDO: 'REDO',
  SAVE_STATE: 'SAVE_STATE',
  
  // Batch actions
  BATCH: 'BATCH',
};

// Reducer
const builderReducer = (state, action) => {
  switch (action.type) {
    case BUILDER_ACTIONS.ADD_ELEMENT:
      return {
        ...state,
        elements: [...state.elements, action.payload],
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.UPDATE_ELEMENT:
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.payload.id ? { ...el, ...action.payload.updates } : el
        ),
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.DELETE_ELEMENT:
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.SELECT_ELEMENT:
      return {
        ...state,
        selectedId: action.payload,
      };

    case BUILDER_ACTIONS.DESELECT_ALL:
      return {
        ...state,
        selectedId: null,
      };

    case BUILDER_ACTIONS.SET_CAMERA:
      return {
        ...state,
        camera: { ...state.camera, ...action.payload },
      };

    case BUILDER_ACTIONS.ZOOM_IN:
      return {
        ...state,
        camera: {
          ...state.camera,
          zoom: Math.min(state.camera.zoom * 1.2, CAMERA_SETTINGS.MAX_ZOOM),
        },
      };

    case BUILDER_ACTIONS.ZOOM_OUT:
      return {
        ...state,
        camera: {
          ...state.camera,
          zoom: Math.max(state.camera.zoom / 1.2, CAMERA_SETTINGS.MIN_ZOOM),
        },
      };

    case BUILDER_ACTIONS.PAN_CAMERA:
      return {
        ...state,
        camera: {
          ...state.camera,
          offsetX: state.camera.offsetX + action.payload.deltaX,
          offsetY: state.camera.offsetY + action.payload.deltaY,
        },
      };

    case BUILDER_ACTIONS.SET_WAREHOUSE:
      return {
        ...state,
        warehouseId: action.payload.id,
        warehouseName: action.payload.name,
      };

    case BUILDER_ACTIONS.SET_DIMENSIONS:
      return {
        ...state,
        dimensions: action.payload,
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.LOAD_BLUEPRINT:
      return {
        ...state,
        ...action.payload,
        hasUnsavedChanges: false,
        undoStack: [],
        redoStack: [],
      };

    case BUILDER_ACTIONS.SAVE_BLUEPRINT:
      return {
        ...state,
        blueprintId: action.payload.id,
        blueprintName: action.payload.name,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
      };

    case BUILDER_ACTIONS.NEW_BLUEPRINT:
      return {
        ...initialState,
        warehouseId: state.warehouseId,
        warehouseName: state.warehouseName,
        dimensions: action.payload.dimensions,
        elements: action.payload.elements || [],
      };

    case BUILDER_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case BUILDER_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case BUILDER_ACTIONS.SET_DRAGGING:
      return {
        ...state,
        isDragging: action.payload.isDragging,
        dragStartPos: action.payload.dragStartPos || null,
      };

    case BUILDER_ACTIONS.SET_ACTIVE_TOOL:
      return {
        ...state,
        activeTool: action.payload,
      };

    case BUILDER_ACTIONS.SAVE_STATE:
      return {
        ...state,
        undoStack: [
          ...state.undoStack.slice(-19), // Keep last 20 states
          {
            elements: state.elements,
            selectedId: state.selectedId,
            dimensions: state.dimensions,
          },
        ],
        redoStack: [], // Clear redo stack when new action is performed
      };

    case BUILDER_ACTIONS.UNDO:
      if (state.undoStack.length === 0) return state;
      
      const previousState = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        elements: previousState.elements,
        selectedId: previousState.selectedId,
        dimensions: previousState.dimensions,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          {
            elements: state.elements,
            selectedId: state.selectedId,
            dimensions: state.dimensions,
          },
        ],
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.REDO:
      if (state.redoStack.length === 0) return state;
      
      const nextState = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        elements: nextState.elements,
        selectedId: nextState.selectedId,
        dimensions: nextState.dimensions,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          {
            elements: state.elements,
            selectedId: state.selectedId,
            dimensions: state.dimensions,
          },
        ],
        hasUnsavedChanges: true,
      };

    case BUILDER_ACTIONS.BATCH:
      return action.payload.reduce(builderReducer, state);

    default:
      return state;
  }
};

// Context
const BuilderContext = createContext();

// Provider component
export const BuilderProvider = ({ children }) => {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  // Action creators
  const actions = {
    // Element actions
    addElement: useCallback((element) => {
      dispatch({ type: BUILDER_ACTIONS.SAVE_STATE });
      dispatch({ type: BUILDER_ACTIONS.ADD_ELEMENT, payload: element });
    }, []),

    updateElement: useCallback((id, updates) => {
      dispatch({ type: BUILDER_ACTIONS.SAVE_STATE });
      dispatch({ type: BUILDER_ACTIONS.UPDATE_ELEMENT, payload: { id, updates } });
    }, []),

    deleteElement: useCallback((id) => {
      dispatch({ type: BUILDER_ACTIONS.SAVE_STATE });
      dispatch({ type: BUILDER_ACTIONS.DELETE_ELEMENT, payload: id });
    }, []),

    selectElement: useCallback((id) => {
      dispatch({ type: BUILDER_ACTIONS.SELECT_ELEMENT, payload: id });
    }, []),

    deselectAll: useCallback(() => {
      dispatch({ type: BUILDER_ACTIONS.DESELECT_ALL });
    }, []),

    // Camera actions
    setCamera: useCallback((cameraState) => {
      dispatch({ type: BUILDER_ACTIONS.SET_CAMERA, payload: cameraState });
    }, []),

    zoomIn: useCallback(() => {
      dispatch({ type: BUILDER_ACTIONS.ZOOM_IN });
    }, []),

    zoomOut: useCallback(() => {
      dispatch({ type: BUILDER_ACTIONS.ZOOM_OUT });
    }, []),

    panCamera: useCallback((deltaX, deltaY) => {
      dispatch({ type: BUILDER_ACTIONS.PAN_CAMERA, payload: { deltaX, deltaY } });
    }, []),

    // Warehouse actions
    setWarehouse: useCallback((warehouse) => {
      dispatch({ type: BUILDER_ACTIONS.SET_WAREHOUSE, payload: warehouse });
    }, []),

    setDimensions: useCallback((dimensions) => {
      dispatch({ type: BUILDER_ACTIONS.SAVE_STATE });
      dispatch({ type: BUILDER_ACTIONS.SET_DIMENSIONS, payload: dimensions });
    }, []),

    // Blueprint actions
    loadBlueprint: useCallback((blueprint) => {
      dispatch({ type: BUILDER_ACTIONS.LOAD_BLUEPRINT, payload: blueprint });
    }, []),

    saveBlueprint: useCallback((blueprintData) => {
      dispatch({ type: BUILDER_ACTIONS.SAVE_BLUEPRINT, payload: blueprintData });
    }, []),

    newBlueprint: useCallback((data) => {
      dispatch({ type: BUILDER_ACTIONS.NEW_BLUEPRINT, payload: data });
    }, []),

    // UI actions
    setLoading: useCallback((loading) => {
      dispatch({ type: BUILDER_ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: BUILDER_ACTIONS.SET_ERROR, payload: error });
    }, []),

    setDragging: useCallback((isDragging, dragStartPos = null) => {
      dispatch({ type: BUILDER_ACTIONS.SET_DRAGGING, payload: { isDragging, dragStartPos } });
    }, []),

    setActiveTool: useCallback((tool) => {
      dispatch({ type: BUILDER_ACTIONS.SET_ACTIVE_TOOL, payload: tool });
    }, []),

    // Undo/Redo
    undo: useCallback(() => {
      dispatch({ type: BUILDER_ACTIONS.UNDO });
    }, []),

    redo: useCallback(() => {
      dispatch({ type: BUILDER_ACTIONS.REDO });
    }, []),
  };

  const value = {
    state,
    actions,
    // Computed values
    selectedElement: state.elements.find(el => el.id === state.selectedId) || null,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
};

// Hook to use the context
export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}; 