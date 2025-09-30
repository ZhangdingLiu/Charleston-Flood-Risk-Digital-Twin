import axios from 'axios';
import { FloodAnalysis, UploadResponse, AnalysisResponse, ApiError, SensorData, FloodPredictionResponse, PredictionProgress } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for image processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class FloodMonitoringAPI {
  // Health check
  static async checkHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload and analyze multiple images
  static async uploadImages(files: File[]): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('images', file);
      });

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for batch processing
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          console.log(`📤 Upload Progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Analyze single image by URL
  static async analyzeImage(imageUrl: string, imageId?: string): Promise<AnalysisResponse> {
    try {
      const response = await api.post('/analyze', {
        imageUrl,
        imageId,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get analysis history
  static async getAnalysisHistory(): Promise<FloodAnalysis[]> {
    try {
      const response = await api.get('/history');
      return response.data.history;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Demo mode methods
  static async getDemoImages(): Promise<UploadResponse> {
    try {
      const response = await api.get('/demo/images');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  static async getDemoHistory(): Promise<FloodAnalysis[]> {
    try {
      const response = await api.get('/demo/history');
      return response.data.history;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get sensor data
  static async getSensorData(): Promise<{ success: boolean; meta: any; waterlevel: any[]; timestamp: string }> {
    try {
      const response = await api.get('/sensor-data');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Run flood prediction
  static async runFloodPrediction(): Promise<FloodPredictionResponse> {
    try {
      const response = await api.post('/flood-prediction', {}, {
        timeout: 600000, // 10 minutes timeout for real map generation
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get prediction progress
  static async getPredictionProgress(sessionId: string): Promise<PredictionProgress> {
    try {
      const response = await api.get(`/flood-prediction/progress/${sessionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }


  // Handle API errors
  private static handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        return {
          error: error.response.data?.error || 'Server Error',
          message: error.response.data?.message || error.message,
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          error: 'Network Error',
          message: 'Unable to connect to server. Please check if the backend is running.',
        };
      }
    }

    // Generic error
    return {
      error: 'Unknown Error',
      message: error.message || 'An unexpected error occurred',
    };
  }
}

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateImageFile = (file: File): string | null => {
  const maxSize = parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '10485760'); // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.';
  }

  if (file.size > maxSize) {
    return `File too large. Maximum size is ${formatFileSize(maxSize)}.`;
  }

  return null;
};

export default api;