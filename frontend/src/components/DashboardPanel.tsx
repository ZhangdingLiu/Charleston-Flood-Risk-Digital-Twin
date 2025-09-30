import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Droplets, Car, TrendingUp, TrendingDown, Gauge } from 'lucide-react';
import { FloodAnalysis, SystemStatus, SensorData } from '../types';

interface DashboardPanelProps {
  currentAnalysis?: FloodAnalysis;
  analyses: FloodAnalysis[];
  systemStatus: SystemStatus;
  loading: boolean;
  currentIndex: number;
  isPlaying: boolean;
  sensorMode: boolean;
  sensorData: SensorData | null;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  currentAnalysis,
  analyses,
  systemStatus,
  loading,
  currentIndex,
  isPlaying,
  sensorMode,
  sensorData
}) => {

  // Calculate Flood Trend
  const calculateFloodTrend = (currentIndex: number, analyses: FloodAnalysis[]) => {
    if (currentIndex === 0 || !analyses[currentIndex-1]) {
      return { value: 0, trend: 'stable', displayValue: '0cm' };
    }
    
    const current = parseWaterDepth(analyses[currentIndex].roadWaterDepth.value) || 0;
    const previous = parseWaterDepth(analyses[currentIndex-1].roadWaterDepth.value) || 0;
    const diff = current - previous;
    
    return {
      value: Math.abs(diff),
      trend: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'stable',
      displayValue: diff === 0 ? '0cm' : `${diff > 0 ? '+' : '-'}${Math.abs(diff)}cm`
    };
  };

  // Get flood trend for current analysis
  const floodTrend = currentAnalysis ? calculateFloodTrend(currentIndex, analyses) : { value: 0, trend: 'stable', displayValue: '0cm' };

  // Process sensor data for charting - show data range with flood events
  const sensorChartData = sensorData ? (() => {
    // Find the range of data that includes flood events (depth > 0)
    const floodStart = sensorData.waterlevel.findIndex(reading => reading.depth_cm > 0);
    const floodEnd = sensorData.waterlevel.length - 1 - [...sensorData.waterlevel].reverse().findIndex(reading => reading.depth_cm > 0);
    
    // If no flood data found, show last 100 readings
    if (floodStart === -1) {
      return sensorData.waterlevel.slice(-100).map((reading, index) => ({
        time: new Date(reading.t).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        waterDepth: reading.depth_cm,
        passability: reading.passability,
        passabilityScore: reading.passability === 'unsafe' ? 3 : 
                         reading.passability === 'caution' ? 2 : 1,
        order: index + 1,
        fullTime: reading.t
      }));
    }
    
    // Show flood event data with some context before and after
    const contextStart = Math.max(0, floodStart - 10);
    const contextEnd = Math.min(sensorData.waterlevel.length - 1, floodEnd + 10);
    
    return sensorData.waterlevel.slice(contextStart, contextEnd + 1).map((reading, index) => ({
      time: new Date(reading.t).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      waterDepth: reading.depth_cm,
      passability: reading.passability,
      passabilityScore: reading.passability === 'unsafe' ? 3 : 
                       reading.passability === 'caution' ? 2 : 1,
      order: contextStart + index + 1,
      fullTime: reading.t
    }));
  })() : [];

  // Get current sensor metrics - use the latest meaningful reading (with flood data if available)
  const currentSensorReading = sensorData ? (() => {
    // Try to find the latest reading with significant flood depth
    const meaningfulReading = [...sensorData.waterlevel].reverse().find(reading => reading.depth_cm > 5);
    // If no meaningful reading found, use the actual latest reading
    return meaningfulReading || sensorData.waterlevel[sensorData.waterlevel.length - 1];
  })() : undefined;
  
  // Calculate sensor trend
  const calculateSensorTrend = () => {
    if (!sensorData || sensorData.waterlevel.length < 2) {
      return { value: 0, trend: 'stable', displayValue: '0cm' };
    }
    
    const current = sensorData.waterlevel[sensorData.waterlevel.length - 1].depth_cm;
    const previous = sensorData.waterlevel[sensorData.waterlevel.length - 2].depth_cm;
    const diff = current - previous;
    
    return {
      value: Math.abs(diff),
      trend: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'stable',
      displayValue: diff === 0 ? '0cm' : `${diff > 0 ? '+' : '-'}${Math.abs(diff).toFixed(1)}cm`
    };
  };

  const sensorTrend = calculateSensorTrend();

  // Prepare chart data with dynamic display based on playing state
  // Always use all analyses for axis setup, but limit data points for dynamic effect
  const allChartData = analyses.map((analysis, index) => {
    const waterDepth = parseWaterDepth(analysis.roadWaterDepth.value);
    const riverLevel = parseWaterLevel(analysis.riverWaterLevel.value);
    
    // Convert passability to numeric score for charting
    let passabilityScore = 0;
    switch(analysis.passability) {
      case 'pass': passabilityScore = 1; break;
      case 'caution': passabilityScore = 2; break; 
      case 'unsafe': passabilityScore = 3; break;
      default: passabilityScore = 0;
    }
    
    return {
      order: index + 1, // Image order starting from 1
      time: new Date(analysis.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      waterDepth: waterDepth || 0,
      riverLevel: riverLevel || 0,
      confidence: (analysis.roadWaterDepth.confidence || 0) * 100,
      passability: analysis.passability,
      passabilityScore: passabilityScore,
      originalIndex: index
    };
  });

  // For dynamic playing effect: show data points up to current index
  const chartData = isPlaying ? 
    allChartData.slice(0, currentIndex + 1) : 
    allChartData.slice(-20); // Show last 20 for normal viewing


  function parseWaterDepth(depthString: string): number | null {
    const match = depthString.match(/([0-9.]+)\s*(cm|m)/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'm' ? value * 100 : value;
  }

  function parseWaterLevel(levelString: string): number | null {
    const match = levelString.match(/([0-9.]+)\s*(cm|m)/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'cm' ? value / 100 : value;
  }


  const getPassabilityColor = (passability: string) => {
    switch (passability) {
      case 'pass': return 'text-control-room-green';
      case 'caution': return 'text-control-room-yellow';
      case 'unsafe': return 'text-control-room-red';
      default: return 'text-gray-400';
    }
  };


  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {sensorMode ? (
            <>
              <Gauge className="w-5 h-5 text-control-room-cyan" />
              Real-time Sensor Dashboard
            </>
          ) : (
            <>
              <Activity className="w-5 h-5 text-control-room-cyan" />
              Digital Twin Dashboard
            </>
          )}
        </h2>
      </div>

      {sensorMode ? (
        /* Sensor Mode Dashboard */
        sensorData && currentSensorReading ? (
        <>
          {/* Sensor Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-control-room-blue" />
                <span className="text-sm text-gray-400">Current Depth</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {currentSensorReading.depth_cm.toFixed(1)} cm
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-control-room-cyan" />
                <span className="text-sm text-gray-400">Data Source</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {sensorData.meta.data_source}
              </div>
              <div className="text-xs text-gray-400">
                {sensorData.meta.station_id}
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-control-room-cyan" />
                <span className="text-sm text-gray-400">Passability</span>
              </div>
              <div className={`text-lg font-semibold uppercase ${getPassabilityColor(currentSensorReading.passability)}`}>
                {currentSensorReading.passability}
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                {sensorTrend.trend === 'increase' && <TrendingUp className="w-4 h-4 text-control-room-red" />}
                {sensorTrend.trend === 'decrease' && <TrendingDown className="w-4 h-4 text-control-room-green" />}
                {sensorTrend.trend === 'stable' && <Activity className="w-4 h-4 text-control-room-cyan" />}
                <span className="text-sm text-gray-400">Depth Trend</span>
              </div>
              <div className={`text-lg font-semibold flex items-center gap-1 ${
                sensorTrend.trend === 'increase' ? 'text-control-room-red' : 
                sensorTrend.trend === 'decrease' ? 'text-control-room-green' : 
                'text-control-room-cyan'
              }`}>
                {sensorTrend.displayValue}
                {sensorTrend.trend === 'increase' && <span>↑</span>}
                {sensorTrend.trend === 'decrease' && <span>↓</span>}
              </div>
            </div>
          </div>

          {/* Sensor Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            <div className="bg-control-room-accent/30 rounded-lg p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-control-room-cyan">Sensor Water Depth</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#888" 
                      fontSize={12}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      label={{ value: 'Time', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      domain={['dataMin - 10', 'dataMax + 10']}
                      label={{ value: 'Depth (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} cm`, 'Water Depth']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="waterDepth" 
                      stroke="#1e40af" 
                      strokeWidth={2}
                      dot={{ fill: '#1e40af', strokeWidth: 2, r: 3 }}
                      name="waterDepth"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-gray-400 border-t border-control-room-border pt-2">
                <strong>Real-time sensor data</strong> from {sensorData.meta.location}
              </div>
            </div>

            <div className="bg-control-room-accent/30 rounded-lg p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-control-room-cyan">Passability Risk</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sensorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#888" 
                      fontSize={12}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      label={{ value: 'Time', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      domain={[0, 3]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(value) => {
                        switch(value) {
                          case 1: return 'Pass';
                          case 2: return 'Caution';
                          case 3: return 'Unsafe';
                          default: return '';
                        }
                      }}
                      label={{ value: 'Risk Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => {
                        let level = '';
                        switch(value) {
                          case 1: level = 'Pass'; break;
                          case 2: level = 'Caution'; break;
                          case 3: level = 'Unsafe'; break;
                          default: level = 'Unknown';
                        }
                        return [level, 'Risk Level'];
                      }}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="passabilityScore" 
                      stroke="#ca8a04" 
                      fill="#ca8a04" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-gray-400 border-t border-control-room-border pt-2">
                <strong>Risk Classification:</strong> Pass (≤15cm), Caution (16-30cm), Unsafe (&gt;30cm)
              </div>
            </div>
          </div>
        </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Gauge className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No sensor data available</p>
              <p className="text-sm">Loading sensor readings...</p>
            </div>
          </div>
        )
      ) : currentAnalysis ? (
        <>
          {/* Camera Mode Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-control-room-blue" />
                <span className="text-sm text-gray-400">Water Depth</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {currentAnalysis.roadWaterDepth.value}
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-control-room-cyan" />
                <span className="text-sm text-gray-400">Depth Range</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {currentAnalysis.roadWaterDepth.range || 'Unknown'}
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-control-room-cyan" />
                <span className="text-sm text-gray-400">Passability</span>
              </div>
              <div className={`text-lg font-semibold uppercase ${getPassabilityColor(currentAnalysis.passability)}`}>
                {currentAnalysis.passability}
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                {floodTrend.trend === 'increase' && <TrendingUp className="w-4 h-4 text-control-room-red" />}
                {floodTrend.trend === 'decrease' && <TrendingDown className="w-4 h-4 text-control-room-green" />}
                {floodTrend.trend === 'stable' && <Activity className="w-4 h-4 text-control-room-cyan" />}
                <span className="text-sm text-gray-400">Flood Trend</span>
              </div>
              <div className={`text-lg font-semibold flex items-center gap-1 ${
                floodTrend.trend === 'increase' ? 'text-control-room-red' : 
                floodTrend.trend === 'decrease' ? 'text-control-room-green' : 
                'text-control-room-cyan'
              }`}>
                {floodTrend.displayValue}
                {floodTrend.trend === 'increase' && <span>↑</span>}
                {floodTrend.trend === 'decrease' && <span>↓</span>}
              </div>
            </div>
          </div>

          {/* Camera Mode Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            <div className="bg-control-room-accent/30 rounded-lg p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-control-room-cyan">Water Depth Trend</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="order" 
                      stroke="#888" 
                      fontSize={12}
                      type="number"
                      domain={[1, 13]}
                      ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}
                      label={{ value: 'Analysis Order', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      domain={[0, 60]}
                      label={{ value: 'Depth (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => [
                        `${value}${name === 'waterDepth' ? 'cm' : 'm'}`,
                        name === 'waterDepth' ? 'Water Depth' : 'River Level'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="waterDepth" 
                      stroke="#1e40af" 
                      strokeWidth={2}
                      dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                      name="waterDepth"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-gray-400 border-t border-control-room-border pt-2">
                <strong>Note:</strong> The horizontal axis indicates the order of the images shown on the left. The capture time of each image is displayed in the top-left corner.
              </div>
            </div>

            <div className="bg-control-room-accent/30 rounded-lg p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 text-control-room-cyan">Passability Risk</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="order" 
                      stroke="#888" 
                      fontSize={12}
                      type="number"
                      domain={[1, 13]}
                      ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}
                      label={{ value: 'Analysis Order', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                    />
                    <YAxis 
                      stroke="#888" 
                      fontSize={12}
                      domain={[0, 3]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(value) => {
                        switch(value) {
                          case 1: return 'Pass';
                          case 2: return 'Caution';
                          case 3: return 'Unsafe';
                          default: return '';
                        }
                      }}
                      label={{ value: 'Risk Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => {
                        let level = '';
                        switch(value) {
                          case 1: level = 'Pass'; break;
                          case 2: level = 'Caution'; break;
                          case 3: level = 'Unsafe'; break;
                          default: level = 'Unknown';
                        }
                        return [level, 'Risk Level'];
                      }}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="passabilityScore" 
                      stroke="#ca8a04" 
                      fill="#ca8a04" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-gray-400 border-t border-control-room-border pt-2">
                <strong>Risk Classification:</strong> Pass (≤15cm), Caution (16-30cm), Unsafe (&gt;30cm)
              </div>
            </div>
          </div>


        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No analysis data available</p>
            <p className="text-sm">Upload images to begin monitoring</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPanel;