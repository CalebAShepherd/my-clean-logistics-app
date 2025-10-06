import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

function extractHostFromScriptURL() {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      // Examples:
      // - http://192.168.1.10:8081/index.bundle?platform=ios&dev=true
      // - http://localhost:8081/index.bundle?platform=android&dev=true
      const m = scriptURL.match(/^[^:]+:\/\/([^/:]+)(?::\d+)?\//);
      if (m && m[1]) return m[1];
    }
  } catch {}
  return null;
}

export function getHost() {
  // 1) Build-time env overrides (preferred)
  const envHost = process.env.EXPO_PUBLIC_API_HOST || process.env.API_HOST;
  if (envHost) return envHost;

  // 2) Try to infer from the script URL used to load the bundle
  const scriptHost = extractHostFromScriptURL();
  if (scriptHost && scriptHost !== 'localhost' && scriptHost !== '127.0.0.1') {
    return scriptHost;
  }

  // 3) Expo debugger/host URIs (development with Expo Go)
  const debuggerHost =
    Constants.manifest?.debuggerHost ||
    Constants.expoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.hostUri ||
    Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const hostPart = debuggerHost.split(':')[0];
    if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
      return hostPart;
    }
  }

  // 4) Android emulator loopback mapping
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return '10.0.2.2';
  }

  // 5) Config fallback (last resort for real devices)
  const configHost = Constants.expoConfig?.extra?.apiHost;
  if (configHost) return configHost;

  // 6) Safe default
  return 'localhost';
}

export function getApiUrl() {
  // Full URL override if provided (e.g., http://myhost:1234 or https://api.example.com)
  const full = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (full) return full;

  const host = getHost();
  const port = process.env.EXPO_PUBLIC_API_PORT || process.env.API_PORT || Constants.expoConfig?.extra?.apiPort || 3000;
  const protocol = process.env.EXPO_PUBLIC_API_PROTOCOL || process.env.API_PROTOCOL || 'http';
  const url = `${protocol}://${host}:${port}`;
  return url;
}

export function getApiBaseUrl() {
  return getApiUrl();
} 