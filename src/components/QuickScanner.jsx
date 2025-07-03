import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Optional barcode scanner - will gracefully handle if not available
let BarCodeScanner;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.warn('Barcode scanner not available:', error);
  BarCodeScanner = null;
}

const QuickScanner = ({ 
  visible, 
  onClose, 
  onScan, 
  title = "Scan Barcode",
  mode = "general",
  onModeChange 
}) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const scanModes = [
    { key: 'general', label: 'General', icon: 'barcode-scan' },
    { key: 'pick', label: 'Pick', icon: 'package-down' },
    { key: 'receive', label: 'Receive', icon: 'truck-delivery' },
    { key: 'putaway', label: 'Put Away', icon: 'package-up' },
    { key: 'count', label: 'Count', icon: 'counter' }
  ];

  useEffect(() => {
    if (visible && BarCodeScanner) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.warn('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanning) return; // Prevent multiple scans

    setScanning(true);
    Vibration.vibrate(100);

    // Delay to allow vibration to complete
    setTimeout(() => {
      onScan({ type, data, mode });
      setScanning(false);
    }, 500);
  };

  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      onScan({ 
        type: 'manual', 
        data: manualBarcode.trim(), 
        mode 
      });
      setManualBarcode('');
      setShowManualEntry(false);
    }
  };

  const renderScannerContent = () => {
    // Show manual entry interface when requested
    if (showManualEntry) {
      return (
        <KeyboardAvoidingView 
          style={styles.manualEntryContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.manualEntryContent}>
            <MaterialCommunityIcons name="keyboard" size={64} color="#fff" />
            <Text style={styles.manualEntryTitle}>Enter Barcode Manually</Text>
            <Text style={styles.manualEntrySubtitle}>
              Type or paste the barcode value below
            </Text>
            <TextInput
              style={styles.manualEntryInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode..."
              placeholderTextColor="#999"
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={handleManualEntry}
            />
            <View style={styles.manualEntryButtons}>
              <TouchableOpacity
                style={[styles.manualEntryBtn, styles.cancelBtn]}
                onPress={() => {
                  setManualBarcode('');
                  setShowManualEntry(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualEntryBtn, styles.submitBtn]}
                onPress={handleManualEntry}
              >
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }

    if (!BarCodeScanner) {
      return (
        <View style={styles.unavailableContainer}>
          <MaterialCommunityIcons name="barcode-off" size={64} color="#fff" />
          <Text style={styles.unavailableTitle}>Scanner Unavailable</Text>
          <Text style={styles.unavailableText}>
            Barcode scanner is not available in Expo Go.{'\n'}
            Use manual entry or build a standalone app.
          </Text>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setShowManualEntry(true)}
          >
            <MaterialCommunityIcons name="keyboard" size={20} color="#fff" />
            <Text style={styles.manualEntryButtonText}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasPermission === null) {
      return (
        <View style={styles.unavailableContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.unavailableTitle}>Requesting Permission</Text>
          <Text style={styles.unavailableText}>
            Requesting camera access...
          </Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.unavailableContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color="#fff" />
          <Text style={styles.unavailableTitle}>Camera Access Denied</Text>
          <Text style={styles.unavailableText}>
            Please enable camera permissions in your device settings
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Alert.alert(
                  'Camera Permission Required',
                  'Please go to Settings > Privacy & Security > Camera and enable access for this app.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Camera Permission Required',
                  'Please go to Settings > Apps > Permissions > Camera and enable access for this app.',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setShowManualEntry(true)}
          >
            <MaterialCommunityIcons name="keyboard" size={20} color="#fff" />
            <Text style={styles.manualEntryButtonText}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <BarCodeScanner
        onBarCodeScanned={scanning ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
    );
  };



  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{showManualEntry ? 'Manual Entry' : title}</Text>
          {/* Manual Entry Toggle Button */}
          <TouchableOpacity
            style={styles.headerManualButton}
            onPress={() => {
              setShowManualEntry(!showManualEntry);
              setManualBarcode(''); // Clear any existing text
            }}
          >
            <MaterialCommunityIcons 
              name={showManualEntry ? "camera" : "keyboard"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Scanner Content */}
        <View style={styles.scannerContainer}>
          {renderScannerContent()}
        </View>

        {/* Scanner Overlay - only show when not in manual entry mode */}
        {!showManualEntry && hasPermission && BarCodeScanner && (
          <View style={styles.overlay}>
            {/* Scanning Frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>
              Position the barcode within the frame
            </Text>

            {/* Mode Selector */}
            {onModeChange && (
              <View style={styles.modeSelector}>
                {scanModes.map((scanMode) => (
                  <TouchableOpacity
                    key={scanMode.key}
                    style={[
                      styles.modeButton,
                      mode === scanMode.key && styles.modeButtonActive
                    ]}
                    onPress={() => onModeChange(scanMode.key)}
                  >
                    <MaterialCommunityIcons
                      name={scanMode.icon}
                      size={16}
                      color={mode === scanMode.key ? '#fff' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[
                      styles.modeButtonText,
                      mode === scanMode.key && styles.modeButtonTextActive
                    ]}>
                      {scanMode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Scanning Indicator */}
            {scanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.scanningText}>Processing...</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  modeSelector: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 4,
    pointerEvents: 'auto',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  scanningIndicator: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanningText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  unavailableText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  manualEntryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerManualButton: {
    padding: 4,
  },
  manualEntryContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  manualEntryContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  manualEntryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  manualEntrySubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  manualEntryInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    color: '#000',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    textAlign: 'center',
    width: '100%',
    marginBottom: 30,
  },
  manualEntryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  manualEntryBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  submitBtn: {
    backgroundColor: '#007AFF',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuickScanner; 