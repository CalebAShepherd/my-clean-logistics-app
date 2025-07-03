import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getHost() {
  console.log('=== HOST RESOLUTION DEBUG ===');
  console.log('Platform:', Platform.OS);
  console.log('manifest.debuggerHost:', Constants.manifest?.debuggerHost);
  console.log('expoConfig.debuggerHost:', Constants.expoConfig?.debuggerHost);
  console.log('manifest2.extra.expoGo:', Constants.manifest2?.extra?.expoGo);
  
  let host = 'localhost'; // Default fallback
  
  // Try to get host from various Expo constants
  const debuggerHost = Constants.manifest?.debuggerHost || 
                      Constants.expoConfig?.debuggerHost ||
                      Constants.manifest2?.extra?.expoGo?.debuggerHost;
  
  if (debuggerHost) {
    // Extract IP from debugger host (format: "192.168.1.100:19000")
    const hostPart = debuggerHost.split(':')[0];
    if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
      host = hostPart;
      console.log('Using debugger host:', host);
      return host;
    }
  }
  
  // Try to get from packager host
  if (Constants.manifest?.packagerOpts?.dev) {
    const packagerHost = Constants.manifest.packagerOpts.lanType === 'ip' ? 
                        Constants.manifest.debuggerHost?.split(':')[0] : null;
    if (packagerHost && packagerHost !== 'localhost' && packagerHost !== '127.0.0.1') {
      host = packagerHost;
      console.log('Using packager host:', host);
      return host;
    }
  }
  
  // For development, try to detect if we're on a real device
  if (__DEV__) {
    // Check if we're likely on a real device (not simulator/emulator)
    const isRealDevice = Platform.OS === 'ios' ? 
      !Constants.isDevice === false : // iOS simulator detection
      Platform.OS === 'android' && Constants.isDevice;
    
    if (isRealDevice) {
      // For real devices, we need the actual network IP
      // This is a known limitation - we'll need to use a hardcoded IP or network discovery
      console.log('Real device detected - you may need to set a specific IP');
      
      // Try to get from expo config if available
      const configHost = Constants.expoConfig?.extra?.apiHost;
      if (configHost) {
        host = configHost;
        console.log('Using config host:', host);
        return host;
      }
    }
  }
  
  // Android emulator special case
  if (Platform.OS === 'android' && !Constants.isDevice) {
    host = '10.0.2.2';
    console.log('Using Android emulator host:', host);
    return host;
  }
  
  console.log('Using fallback host:', host);
  return host;
}

export function getApiUrl() {
  const host = getHost();
  const port = Constants.expoConfig?.extra?.apiPort || 3000;
  const url = `http://${host}:${port}`;
  console.log('Resolved API URL:', url);
  return url;
}

export function getApiBaseUrl() {
  return getApiUrl();
} 