import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Play, Pause, SkipBack, SkipForward, Upload, Camera, Loader, AlertCircle, Gauge, ToggleLeft, ToggleRight } from 'lucide-react';
import { FloodAnalysis, SensorData } from '../types';
import { validateImageFile } from '../services/api';

interface CameraFeedPanelProps {
  currentAnalysis?: FloodAnalysis;
  analyses: FloodAnalysis[];
  currentIndex: number;
  isPlaying: boolean;
  loading: boolean;
  sensorMode: boolean;
  sensorData: SensorData | null;
  onIndexChange: (index: number) => void;
  onPlayToggle: () => void;
  onImageUpload: (files: File[]) => void;
  onSingleAnalysis: (imageUrl: string) => void;
  onToggleSensorMode: () => void;
}

const CameraFeedPanel: React.FC<CameraFeedPanelProps> = ({
  currentAnalysis,
  analyses,
  currentIndex,
  isPlaying,
  loading,
  sensorMode,
  sensorData,
  onIndexChange,
  onPlayToggle,
  onImageUpload,
  onSingleAnalysis,
  onToggleSensorMode
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    acceptedFiles.forEach(file => {
      const error = validateImageFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`File validation errors:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      onImageUpload(validFiles);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 50,
    multiple: true
  });


  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {sensorMode ? (
            <>
              <Gauge className="w-5 h-5 text-control-room-cyan" />
              Flood Sensor - Huger King St
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 text-control-room-cyan" />
              Live Camera Feed Simulation
            </>
          )}
        </h2>
        <div className="flex items-center gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-control-room-yellow">
              <Loader className="w-4 h-4 loading-spinner" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          <button
            onClick={onToggleSensorMode}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-control-room-accent/30 hover:bg-control-room-accent/50 text-sm transition-colors"
          >
            {sensorMode ? <ToggleRight className="w-4 h-4 text-control-room-cyan" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
            {sensorMode ? 'Switch to Camera' : 'Switch to Sensor'}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-black border border-control-room-border">
        {sensorMode ? (
          /* Sensor Mode Display */
          <div className="relative h-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/sensor/sensor.png"
                alt="Flood Sensor at Huger King St"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              {/* Fallback for missing sensor image */}
              <div className="hidden bg-control-room-accent/30 p-8 rounded-lg text-center">
                <Gauge className="w-16 h-16 mx-auto mb-4 text-control-room-cyan" />
                <p className="text-gray-300 mb-2">Flood Sensor</p>
                <p className="text-sm text-gray-400">{sensorData?.meta?.location || 'Huger and King St, Charleston, SC'}</p>
              </div>
            </div>
            
            {/* Sensor Info Overlay */}
            {sensorData && (
              <div className="absolute top-4 left-4 bg-control-room-panel/95 backdrop-blur-sm px-5 py-4 rounded-lg border border-control-room-border/50 max-w-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-5 h-5 text-control-room-cyan" />
                  <span className="text-base font-semibold text-control-room-cyan">Real-time Sensor Data</span>
                </div>
                <div className="text-sm text-gray-200 space-y-1">
                  <p><span className="font-medium">Location:</span> {sensorData.meta.location}</p>
                  <p><span className="font-medium">Station:</span> {sensorData.meta.station_id}</p>
                  <p><span className="font-medium">Source:</span> {sensorData.meta.data_source}</p>
                  <p><span className="font-medium">Readings:</span> {sensorData.waterlevel.length} data points</p>
                  <p className="text-xs text-gray-300 italic">recorded every 30 seconds</p>
                </div>
              </div>
            )}
          </div>
        ) : currentAnalysis ? (
          <div className="relative h-full">
            {/* Image Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              {currentAnalysis.url ? (
                <img
                  src={currentAnalysis.url}
                  alt={`Analysis ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              
              {/* Fallback for missing images */}
              <div className="hidden bg-control-room-accent/30 p-8 rounded-lg text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-2">Analysis Frame {currentIndex + 1}</p>
                <p className="text-sm text-gray-500">{currentAnalysis.filename || 'Image data'}</p>
              </div>
            </div>


            {currentAnalysis.error && (
              <div className="absolute bottom-4 right-4 bg-control-room-red/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Analysis Error</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upload Area */
          <div
            {...getRootProps()}
            className={`h-full flex items-center justify-center cursor-pointer transition-colors duration-200 ${
              isDragActive
                ? 'bg-control-room-blue/20 border-control-room-blue border-2 border-dashed'
                : 'bg-control-room-accent/10 hover:bg-control-room-accent/20'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-control-room-cyan" />
              <p className="text-lg text-gray-300 mb-2">
                {isDragActive ? 'Drop images here...' : 'Upload Images for Analysis'}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Drag & drop up to 50 images or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported: JPEG, PNG, GIF, WebP (max 10MB each)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!sensorMode && analyses.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
              className="btn-secondary p-2"
              disabled={currentIndex === 0 || loading}
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button
              onClick={onPlayToggle}
              className="btn-primary p-3 rounded-full"
              disabled={loading || analyses.length < 2}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => onIndexChange(Math.min(analyses.length - 1, currentIndex + 1))}
              className="btn-secondary p-2"
              disabled={currentIndex === analyses.length - 1 || loading}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Frame {currentIndex + 1} of {analyses.length}</span>
            </div>
            <input
              type="range"
              min="0"
              max={analyses.length - 1}
              value={currentIndex}
              onChange={(e) => onIndexChange(parseInt(e.target.value))}
              className="w-full h-2 bg-control-room-accent rounded-lg appearance-none cursor-pointer"
              disabled={loading}
              style={{
                background: `linear-gradient(to right, #1e40af 0%, #1e40af ${((currentIndex + 1) / analyses.length) * 100}%, #3a3a3a ${((currentIndex + 1) / analyses.length) * 100}%, #3a3a3a 100%)`
              }}
            />
          </div>

        </div>
      )}
    </div>
  );
};

export default CameraFeedPanel;