import React, { useState, useEffect } from 'react';
import CameraFeedPanel from './components/CameraFeedPanel';
import DashboardPanel from './components/DashboardPanel';
import AnalysisTimelinePanel from './components/AnalysisTimelinePanel';
import CharlestonMapPanel from './components/CharlestonMapPanel';
import { FloodAnalysis, SystemStatus, SensorData } from './types';
import { FloodMonitoringAPI } from './services/api';
import './index.css';

function App() {
  const [analyses, setAnalyses] = useState<FloodAnalysis[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sensorMode, setSensorMode] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [mapView, setMapView] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isOnline: false,
    lastUpdate: new Date().toISOString(),
    processingImages: 0,
    totalImages: 0,
    systemHealth: 'warning',
    backendConnected: false,
    openaiConnected: false,
  });

  // Check backend health on component mount and load demo data
  useEffect(() => {
    checkBackendHealth();
    loadDemoData();
    // Check health every 30 seconds
    const healthInterval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    let interval: number;
    if (isPlaying && analyses.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex(prev => 
          prev < analyses.length - 1 ? prev + 1 : 0
        );
      }, 2000); // 2 seconds per frame
    }
    return () => clearInterval(interval);
  }, [isPlaying, analyses.length]);

  const checkBackendHealth = async () => {
    try {
      const health = await FloodMonitoringAPI.checkHealth();
      setSystemStatus(prev => ({
        ...prev,
        isOnline: true,
        backendConnected: true,
        openaiConnected: health.openaiConfigured,
        systemHealth: health.openaiConfigured ? 'healthy' : 'warning',
        lastUpdate: new Date().toISOString(),
      }));
      setError(null);
    } catch (err: any) {
      setSystemStatus(prev => ({
        ...prev,
        isOnline: false,
        backendConnected: false,
        openaiConnected: false,
        systemHealth: 'error',
        lastUpdate: new Date().toISOString(),
      }));
      setError(err.message || 'Backend connection failed');
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await FloodMonitoringAPI.getDemoImages();
      
      if (response.success) {
        setAnalyses(response.images);
        setCurrentIndex(0);
        setSystemStatus(prev => ({
          ...prev,
          totalImages: response.images.length,
          processingImages: 0,
          lastUpdate: new Date().toISOString(),
        }));
        console.log(`🎬 Demo mode: Loaded ${response.images.length} pre-analyzed images`);
      } else {
        throw new Error('Failed to load demo data');
      }
    } catch (err: any) {
      console.warn('Demo data not available, falling back to upload mode');
      // Don't set error for demo data failure, just use upload mode
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    setLoading(true);
    setError(null);
    
    try {
      setSystemStatus(prev => ({
        ...prev,
        processingImages: files.length,
      }));

      const response = await FloodMonitoringAPI.uploadImages(files);
      
      if (response.success) {
        setAnalyses(response.images);
        setCurrentIndex(0);
        setSystemStatus(prev => ({
          ...prev,
          totalImages: response.images.length,
          processingImages: 0,
          lastUpdate: new Date().toISOString(),
        }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload and analyze images');
      setSystemStatus(prev => ({
        ...prev,
        processingImages: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAnalysis = async (imageUrl: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await FloodMonitoringAPI.analyzeImage(imageUrl);
      
      // Add to analyses array
      const newAnalysis: FloodAnalysis = {
        id: response.imageId,
        url: imageUrl,
        ...response,
        passability: response.passability as 'safe' | 'dangerous' | 'impassable' | 'unknown',
      };

      setAnalyses(prev => [...prev, newAnalysis]);
      setCurrentIndex(analyses.length); // Select the new analysis
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const loadSensorData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await FloodMonitoringAPI.getSensorData();
      
      if (response.success) {
        setSensorData({
          meta: response.meta,
          waterlevel: response.waterlevel
        });
        console.log(`📊 Sensor mode: Loaded ${response.waterlevel.length} sensor readings`);
      } else {
        throw new Error('Failed to load sensor data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sensor data');
      setSensorMode(false); // Revert to camera mode on error
    } finally {
      setLoading(false);
    }
  };

  const toggleSensorMode = async () => {
    if (!sensorMode) {
      // Switching to sensor mode
      await loadSensorData();
      if (sensorData || loading) {
        setSensorMode(true);
        setIsPlaying(false); // Stop playback when switching to sensor mode
      }
    } else {
      // Switching to camera mode
      setSensorMode(false);
    }
  };

  const handleMarkerClick = (markerId: string, type: 'sensor' | 'camera') => {
    console.log(`Clicked marker: ${markerId}, type: ${type}`);
    
    // Only allow specific markers to trigger navigation
    const allowedMarkers = ['sensor-huger-king', 'camera-charleston-pilot'];
    
    if (!allowedMarkers.includes(markerId)) {
      // Show message for non-functional markers
      console.log(`⚠️ ${markerId} functionality will be available in future updates`);
      alert(`${markerId.replace(/-/g, ' ')} monitoring functionality will be available in future updates.`);
      return;
    }
    
    // Switch to dashboard view
    setMapView(false);
    
    // Set appropriate mode based on marker type
    if (type === 'sensor') {
      // Switch to sensor mode if not already
      if (!sensorMode) {
        toggleSensorMode();
      }
    } else {
      // Switch to camera mode if not already
      if (sensorMode) {
        setSensorMode(false);
      }
      // Load demo data for camera mode
      loadDemoData();
    }
  };

  const currentAnalysis = analyses[currentIndex];

  return (
    <div className="h-screen bg-control-room-bg text-white flex flex-col">
      {/* Header */}
      <header className="bg-control-room-panel border-b border-control-room-border px-6 py-4 control-room-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-control-room-cyan text-glow">
              {mapView ? '🗺️ Charleston Flood Monitoring Map' : '🌊 Urban Flood Monitoring System'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMapView(!mapView)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-control-room-accent/30 hover:bg-control-room-accent/50 text-sm transition-colors border border-control-room-border"
            >
              <span>{mapView ? '📊 Dashboard View' : '🗺️ Map View'}</span>
            </button>
            <div className="flex items-center gap-2">
              <div className={`status-indicator ${systemStatus.openaiConnected ? 'status-active' : 'status-warning'}`} />
              <span className="text-sm">Customized Flood VLM (via GPT-4o)</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-control-room-red/20 border border-control-room-red rounded text-sm text-control-room-red">
            ⚠️ {error}
          </div>
        )}
      </header>

      {/* Main Content */}
      {mapView ? (
        /* Charleston Map View */
        <div className="flex-1 min-h-0">
          <CharlestonMapPanel onMarkerClick={handleMarkerClick} />
        </div>
      ) : (
        /* Dashboard View */
        <div className="flex-1 grid grid-cols-12 grid-rows-12 gap-4 p-4 min-h-0">
          {/* Left Panel - Camera Feed */}
          <div className="col-span-5 row-span-8">
            <CameraFeedPanel
              currentAnalysis={currentAnalysis}
              analyses={analyses}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              loading={loading}
              sensorMode={sensorMode}
              sensorData={sensorData}
              onIndexChange={setCurrentIndex}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
              onImageUpload={handleImageUpload}
              onSingleAnalysis={handleSingleAnalysis}
              onToggleSensorMode={toggleSensorMode}
            />
          </div>

          {/* Right Panel - Dashboard */}
          <div className="col-span-7 row-span-8">
            <DashboardPanel
              currentAnalysis={currentAnalysis}
              analyses={analyses}
              systemStatus={systemStatus}
              loading={loading}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              sensorMode={sensorMode}
              sensorData={sensorData}
            />
          </div>

          {/* Bottom Panel - Timeline */}
          <div className="col-span-12 row-span-4">
            <AnalysisTimelinePanel
              analyses={analyses}
              currentIndex={currentIndex}
              onIndexSelect={setCurrentIndex}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;