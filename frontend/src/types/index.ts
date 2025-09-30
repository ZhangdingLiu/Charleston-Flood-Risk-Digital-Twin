export interface FloodAnalysis {
  id?: string;
  filename?: string;
  url?: string;
  timestamp: string;
  size?: number;
  roadWaterDepth: {
    value: string;
    confidence?: number;
    range?: string;
  };
  riverWaterLevel: {
    value: string;
    confidence: number;
  };
  passability: 'pass' | 'caution' | 'unsafe' | 'safe' | 'dangerous' | 'impassable' | 'unknown';
  referenceObjects: string[];
  analysis: string;
  error?: string;
}

export interface SystemStatus {
  isOnline: boolean;
  lastUpdate: string;
  processingImages: number;
  totalImages: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  backendConnected: boolean;
  openaiConnected: boolean;
}


export interface UploadResponse {
  success: boolean;
  message: string;
  images: FloodAnalysis[];
  timestamp: string;
}

export interface AnalysisResponse {
  success: boolean;
  imageId: string;
  timestamp: string;
  roadWaterDepth: {
    value: string;
    confidence: number;
  };
  riverWaterLevel: {
    value: string;
    confidence: number;
  };
  passability: 'pass' | 'caution' | 'unsafe' | 'safe' | 'dangerous' | 'impassable' | 'unknown';
  referenceObjects: string[];
  analysis: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface SensorReading {
  t: string;                // timestamp in ISO format
  o: number;               // original depth in feet
  depth_cm: number;        // depth converted to cm
  passability: 'pass' | 'caution' | 'unsafe';
}

export interface SensorData {
  meta: {
    location: string;
    station_id: string;
    data_source: string;
    measurement_type: string;
    datum: {
      label: string;
      unit: string;
    };
  };
  waterlevel: SensorReading[];  // Array of sensor readings
}

export interface MapMarker {
  id: string;
  type: 'sensor' | 'camera';
  name: string;
  description: string;
  position: {
    x: number;  // percentage from left (0-100)
    y: number;  // percentage from top (0-100)
  };
  status: 'active' | 'warning' | 'offline';
  previewData?: {
    currentDepth?: string;
    lastUpdate?: string;
    imagePreview?: string;
    passability?: 'pass' | 'caution' | 'unsafe';
  };
}

export interface FloodPredictionImage {
  window: string;
  filename: string;
  url: string;
}

export interface FloodPredictionResponse {
  success: boolean;
  message: string;
  sessionId: string;
  images: FloodPredictionImage[];
  totalWindows: number;
  timestamp: string;
}

export interface PredictionProgress {
  status: 'not_started' | 'generating_maps' | 'completed' | 'error';
  currentWindow: number;
  totalWindows: number;
  completedImages: FloodPredictionImage[];
  sessionId?: string;
}