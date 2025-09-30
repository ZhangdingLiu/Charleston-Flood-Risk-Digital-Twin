import React, { useState, useRef, useEffect } from 'react';
import { MapMarker, FloodPredictionImage, PredictionProgress } from '../types';
import { FloodMonitoringAPI } from '../services/api';

interface CharlestonMapPanelProps {
  onMarkerClick?: (markerId: string, type: 'sensor' | 'camera') => void;
}

const CharlestonMapPanel: React.FC<CharlestonMapPanelProps> = ({ onMarkerClick }) => {
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Flood prediction states
  const [predictionMode, setPredictionMode] = useState(false);
  const [predictionImages, setPredictionImages] = useState<FloodPredictionImage[]>([]);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [predictionProgress, setPredictionProgress] = useState<PredictionProgress | null>(null);

  // Marker data based on the Charleston flood map image
  // Map image: 26.62cm x 12.7cm, coordinates converted to percentages
  const markers: MapMarker[] = [
    {
      id: 'sensor-huger-king',
      type: 'sensor',
      name: 'Huger and King Street',
      description: 'Real-time flood depth monitoring',
      position: { x: 45.2, y: 26.8 }, // (12.03cm, 3.4cm) converted to %
      status: 'active',
      previewData: {
        currentDepth: '12 cm',
        lastUpdate: '2 mins ago',
        passability: 'pass'
      }
    },
    {
      id: 'sensor-musc-ashley',
      type: 'sensor',
      name: 'MUSC Ashley Avenue',
      description: 'Medical university area monitoring',
      position: { x: 47.3, y: 60.0 }, // (12.59cm, 7.62cm) converted to %
      status: 'active',
      previewData: {
        currentDepth: '8 cm',
        lastUpdate: '1 min ago',
        passability: 'pass'
      }
    },
    {
      id: 'sensor-musc-jonathan',
      type: 'sensor',
      name: 'MUSC Jonathan Lucas Street',
      description: 'Medical district flood monitoring',
      position: { x: 45.8, y: 64.2 }, // (12.19cm, 8.15cm) converted to %
      status: 'active',
      previewData: {
        currentDepth: '18 cm',
        lastUpdate: '4 mins ago',
        passability: 'caution'
      }
    },
    {
      id: 'camera-charleston-pilot',
      type: 'camera',
      name: 'Charleston Branch Pilot',
      description: 'AI-powered flood analysis',
      position: { x: 65.7, y: 81.0 }, // (17.50cm, 10.29cm) converted to %
      status: 'active',
      previewData: {
        lastUpdate: '5 mins ago',
        passability: 'caution'
      }
    },
    {
      id: 'camera-east-bay',
      type: 'camera',
      name: 'East Bay Street',
      description: 'Harbor area surveillance',
      position: { x: 63.5, y: 92.2 }, // (16.91cm, 11.71cm) converted to %
      status: 'active',
      previewData: {
        lastUpdate: '1 min ago',
        passability: 'pass'
      }
    }
  ];

  // Auto-play functionality for prediction
  useEffect(() => {
    let interval: number;
    if (isAutoPlaying && predictionImages.length > 1) {
      interval = setInterval(() => {
        setCurrentPredictionIndex(prev => 
          prev < predictionImages.length - 1 ? prev + 1 : 0
        );
      }, 1500); // 1.5 seconds per frame
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, predictionImages.length]);

  // Progress polling for real-time updates
  useEffect(() => {
    let progressInterval: number;
    
    if (currentSessionId && predictionLoading) {
      progressInterval = setInterval(async () => {
        try {
          const progress = await FloodMonitoringAPI.getPredictionProgress(currentSessionId);
          setPredictionProgress(progress);
          
          // Update images as they become available and immediately show the latest
          if (progress.completedImages && progress.completedImages.length > 0) {
            setPredictionImages(progress.completedImages);
            // Always show the newest generated image immediately
            setCurrentPredictionIndex(progress.completedImages.length - 1);
            console.log(`🖼️ New image available: ${progress.completedImages[progress.completedImages.length - 1]?.filename}`);
          }
          
          // Check if completed
          if (progress.status === 'completed') {
            setPredictionLoading(false);
            setCurrentSessionId(null);
            console.log('🎉 Prediction completed!');
          }
        } catch (error) {
          console.error('❌ Error polling progress:', error);
        }
      }, 1500); // Poll every 1.5 seconds for more responsive updates
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [currentSessionId, predictionLoading, predictionImages.length, isAutoPlaying]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredMarker && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const runFloodPrediction = async () => {
    setPredictionLoading(true);
    setPredictionError(null);
    setPredictionImages([]);
    setCurrentPredictionIndex(0);
    setPredictionMode(true);
    setPredictionProgress(null);
    
    try {
      console.log('🔮 Starting flood prediction with real map generation...');
      
      // Start the prediction process (this will run in background)
      const response = await FloodMonitoringAPI.runFloodPrediction();
      
      if (response.success) {
        setCurrentSessionId(response.sessionId);
        console.log(`📋 Started prediction session: ${response.sessionId}`);
        console.log(`⏳ Generating ${response.totalWindows} prediction maps...`);
        
        // Images will be populated via progress polling in real-time
        // No need to wait - progress polling will handle image updates
      } else {
        throw new Error('Prediction failed to start');
      }
    } catch (error: any) {
      console.error('❌ Flood prediction error:', error);
      setPredictionError(error.message || 'Failed to generate flood predictions');
      setPredictionLoading(false);
      setCurrentSessionId(null);
      setPredictionMode(false);
    }
  };

  const exitPredictionMode = () => {
    setPredictionMode(false);
    setIsAutoPlaying(false);
    setPredictionImages([]);
    setCurrentPredictionIndex(0);
    setPredictionError(null);
  };

  const toggleAutoPlay = () => {
    if (predictionImages.length <= 1) return;
    setIsAutoPlaying(!isAutoPlaying);
  };

  const getMarkerStatusColor = (status: string, type: 'sensor' | 'camera') => {
    const baseColor = type === 'sensor' ? 'bg-blue-500' : 'bg-green-500';
    switch (status) {
      case 'active': return baseColor;
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return baseColor;
    }
  };

  const getPassabilityColor = (passability?: string) => {
    switch (passability) {
      case 'pass': return 'text-green-400';
      case 'caution': return 'text-yellow-400';
      case 'unsafe': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div 
      ref={mapRef}
      className="h-[90vh] bg-control-room-bg text-white relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        {!predictionMode ? (
          /* Normal Mode Controls */
          <button
            onClick={runFloodPrediction}
            disabled={predictionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-control-room-accent/80 hover:bg-control-room-accent text-white rounded-lg border border-control-room-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {predictionLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Generating Predictions...</span>
              </>
            ) : (
              <>
                <span className="text-lg">🔮</span>
                <span className="text-sm font-semibold">Flood Prediction</span>
              </>
            )}
          </button>
        ) : (
          /* Prediction Mode Controls */
          <div className="bg-control-room-panel/90 border border-control-room-border rounded-lg p-3 space-y-3 min-w-[200px]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-control-room-cyan">🔮 Prediction Mode</div>
              <button
                onClick={exitPredictionMode}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="text-xs text-gray-300">
              {predictionLoading && predictionProgress ? (
                <>
                  Generating: {predictionProgress.currentWindow} of {predictionProgress.totalWindows}
                  {predictionProgress.completedImages.length > 0 && (
                    <span className="text-control-room-cyan ml-2">
                      ({predictionProgress.completedImages.length} maps ready)
                    </span>
                  )}
                </>
              ) : (
                <>Window {currentPredictionIndex + 1} of {predictionImages.length}</>
              )}
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPredictionIndex(Math.max(0, currentPredictionIndex - 1))}
                disabled={currentPredictionIndex === 0}
                className="px-2 py-1 bg-control-room-accent/50 hover:bg-control-room-accent/80 rounded text-xs disabled:opacity-30"
              >
                ⏮
              </button>
              
              <button
                onClick={toggleAutoPlay}
                disabled={predictionImages.length <= 1}
                className="px-2 py-1 bg-control-room-accent/50 hover:bg-control-room-accent/80 rounded text-xs disabled:opacity-30"
              >
                {isAutoPlaying ? '⏸' : '▶️'}
              </button>
              
              <button
                onClick={() => setCurrentPredictionIndex(Math.min(predictionImages.length - 1, currentPredictionIndex + 1))}
                disabled={currentPredictionIndex === predictionImages.length - 1}
                className="px-2 py-1 bg-control-room-accent/50 hover:bg-control-room-accent/80 rounded text-xs disabled:opacity-30"
              >
                ⏭
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-control-room-cyan h-2 rounded-full transition-all duration-200"
                style={{ 
                  width: predictionLoading && predictionProgress ? 
                    `${(predictionProgress.currentWindow / predictionProgress.totalWindows) * 100}%` :
                    `${((currentPredictionIndex + 1) / Math.max(predictionImages.length, 1)) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {predictionError && (
          <div className="bg-red-900/80 border border-red-500 rounded-lg p-3 text-sm text-red-200 max-w-sm">
            <div className="font-semibold">⚠️ Prediction Error</div>
            <div className="text-xs mt-1">{predictionError}</div>
          </div>
        )}
      </div>

      {/* Map Content */}
      <div className="w-full h-full flex items-center justify-center p-1 relative">
        {predictionMode ? (
          predictionImages.length > 0 ? (
            /* Prediction Map Display */
            <img
              src={`http://localhost:5000${predictionImages[currentPredictionIndex]?.url}`}
              alt={`Flood Prediction Window ${currentPredictionIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error('Failed to load prediction image:', predictionImages[currentPredictionIndex]?.url);
              }}
            />
          ) : (
            /* Loading State for Prediction Mode */
            <div className="flex flex-col items-center justify-center text-control-room-cyan">
              <div className="w-16 h-16 border-4 border-control-room-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-semibold">🔮 Generating Flood Predictions...</p>
              <p className="text-sm text-gray-400 mt-2">Please wait while we generate prediction maps</p>
            </div>
          )
        ) : (
          /* Normal Map Display */
          <>
            <img
              src="/charlestonFloodMapPage.png"
              alt="Charleston Flood Monitoring Map"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            
            {/* Interactive Markers - only show in normal mode */}
            {!predictionMode && markers.map((marker) => (
              <div
                key={marker.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                  hoveredMarker === marker.id ? 'scale-125 z-20' : 'z-10'
                }`}
                style={{
                  left: `${marker.position.x}%`,
                  top: `${marker.position.y}%`,
                }}
                onMouseEnter={() => setHoveredMarker(marker.id)}
                onMouseLeave={() => setHoveredMarker(null)}
                onClick={() => onMarkerClick?.(marker.id, marker.type)}
              >
                {/* Marker Pulse Animation */}
                <div className={`absolute inset-0 ${getMarkerStatusColor(marker.status, marker.type)} opacity-20 rounded-full animate-ping scale-150`} />
                
                {/* Main Marker */}
                <div className={`w-4 h-4 ${getMarkerStatusColor(marker.status, marker.type)} rounded-full border-2 border-white shadow-lg relative z-10`}>
                  {/* Marker Icon */}
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    {marker.type === 'sensor' ? '📊' : '📹'}
                  </div>
                </div>
                
                {/* Glow Effect on Hover */}
                {hoveredMarker === marker.id && (
                  <div className={`absolute inset-0 ${getMarkerStatusColor(marker.status, marker.type)} opacity-40 rounded-full blur-sm scale-200`} />
                )}
              </div>
            ))}
          </>
        )}
        
        {/* Tooltip - only show in normal mode */}
        {!predictionMode && hoveredMarker && (
          <div
            className="absolute z-30 bg-control-room-panel border border-control-room-border rounded-lg p-3 control-room-shadow pointer-events-none"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y - 10,
              maxWidth: '250px'
            }}
          >
            {(() => {
              const marker = markers.find(m => m.id === hoveredMarker);
              if (!marker) return null;
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{marker.type === 'sensor' ? '📊' : '📹'}</span>
                    <div>
                      <h3 className="font-semibold text-control-room-cyan text-sm">{marker.name}</h3>
                      <p className="text-xs text-gray-300">{marker.description}</p>
                    </div>
                  </div>
                  
                  {marker.previewData && (
                    <div className="border-t border-control-room-border pt-2 space-y-1">
                      {marker.previewData.currentDepth && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Depth:</span>
                          <span className="text-control-room-cyan font-mono">{marker.previewData.currentDepth}</span>
                        </div>
                      )}
                      {marker.previewData.passability && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Status:</span>
                          <span className={`font-semibold capitalize ${getPassabilityColor(marker.previewData.passability)}`}>
                            {marker.previewData.passability}
                          </span>
                        </div>
                      )}
                      {marker.previewData.lastUpdate && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Updated:</span>
                          <span className="text-white">{marker.previewData.lastUpdate}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-control-room-cyan pt-1 border-t border-control-room-border">
                    💡 Click to view detailed {marker.type} dashboard
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharlestonMapPanel;