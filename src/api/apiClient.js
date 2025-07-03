import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

// Simple API client that handles authentication
class ApiClient {
  constructor() {
    this.baseURL = `${API_URL}/api`;
    this.getToken = null; // Function to get current token
  }

  setTokenProvider(tokenProvider) {
    this.getToken = tokenProvider;
  }

  async request(method, url, data = null, params = {}) {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add authentication header if token is available
    const token = this.getToken ? this.getToken() : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add body for POST/PUT requests
    if (data) {
      config.body = JSON.stringify(data);
    }

    // Add query parameters
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${this.baseURL}${url}${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await fetch(fullUrl, config);
      
      if (!response.ok) {
        // For development: Don't log 404s for space optimization endpoints as errors
        if (response.status === 404 && url.includes('space-optimization')) {
          console.info(`Space optimization endpoint not yet implemented: ${url}`);
        } else {
          console.error(`API request failed: ${method} ${fullUrl} - Status: ${response.status}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Only log unexpected errors, not 404s for known unimplemented endpoints
      if (!(error.message.includes('404') && url.includes('space-optimization'))) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request('GET', url, null, options.params || {});
  }

  async post(url, data, options = {}) {
    return this.request('POST', url, data, options.params || {});
  }

  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options.params || {});
  }

  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options.params || {});
  }
}

const apiClient = new ApiClient();

export default apiClient;

export { API_URL };
