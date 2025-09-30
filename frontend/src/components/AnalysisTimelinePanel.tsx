import React from 'react';
import { Clock, TrendingUp, Calendar } from 'lucide-react';
import { FloodAnalysis } from '../types';

interface AnalysisTimelinePanelProps {
  analyses: FloodAnalysis[];
  currentIndex: number;
  onIndexSelect: (index: number) => void;
  loading: boolean;
}

const AnalysisTimelinePanel: React.FC<AnalysisTimelinePanelProps> = ({
  analyses,
  currentIndex,
  onIndexSelect,
  loading
}) => {
  const getPassabilityColor = (passability: string) => {
    switch (passability) {
      case 'pass': return 'bg-control-room-green';
      case 'caution': return 'bg-control-room-yellow';
      case 'unsafe': return 'bg-control-room-red';
      default: return 'bg-gray-500';
    }
  };

  const getPassabilityTextColor = (passability: string) => {
    switch (passability) {
      case 'pass': return 'text-control-room-green';
      case 'caution': return 'text-control-room-yellow';
      case 'unsafe': return 'text-control-room-red';
      default: return 'text-gray-400';
    }
  };

  const formatWaterDepth = (depth: string) => {
    return depth.replace(/(\d+\.?\d*)(cm|m)/i, '$1 $2');
  };

  const getRecentAnalyses = () => {
    return analyses.slice(-10).map((analysis, index) => ({
      ...analysis,
      originalIndex: analyses.length - 10 + index
    }));
  };

  const currentAnalysis = analyses[currentIndex];
  const recentAnalyses = analyses.length > 10 ? getRecentAnalyses() : analyses.map((analysis, index) => ({
    ...analysis,
    originalIndex: index
  }));

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-control-room-cyan" />
          Analysis Timeline
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Total Analyses: {analyses.length}</span>
          {loading && <span className="text-control-room-yellow">Processing...</span>}
        </div>
      </div>

      {analyses.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Recent Activity Timeline */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-control-room-cyan flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {recentAnalyses.reverse().map((analysis) => (
                <div
                  key={analysis.id || analysis.originalIndex}
                  onClick={() => onIndexSelect(analysis.originalIndex)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    analysis.originalIndex === currentIndex
                      ? 'bg-control-room-blue/20 border border-control-room-blue'
                      : 'bg-control-room-accent/30 hover:bg-control-room-accent/50'
                  } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPassabilityColor(analysis.passability)}`} />
                      <span className="font-medium">
                        {new Date(analysis.timestamp).toLocaleTimeString()}
                      </span>
                      {analysis.error && (
                        <span className="text-control-room-red text-xs">⚠️ Error</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>#{analysis.originalIndex + 1}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Water:</span>
                      <span className="ml-2 text-control-room-blue font-medium">
                        {formatWaterDepth(analysis.roadWaterDepth.value)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className={`ml-2 font-medium uppercase ${getPassabilityTextColor(analysis.passability)}`}>
                        {analysis.passability}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Analysis Details */}
          <div className="space-y-6">
            {currentAnalysis && (
              <>
                <div className="bg-control-room-accent/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-control-room-cyan">
                    <TrendingUp className="w-5 h-5" />
                    Current Analysis Details
                  </h4>
                  <div className="space-y-4 text-base">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-gray-400 text-sm">Timestamp:</span>
                        <div className="font-mono text-white mt-1 text-sm">
                          {new Date(currentAnalysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 text-sm">Road Depth:</span>
                        <div className="text-white font-medium text-lg">
                          {formatWaterDepth(currentAnalysis.roadWaterDepth.value)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">AI Analysis:</span>
                      <div className="mt-2 text-sm text-gray-300 max-h-20 overflow-y-auto">
                        {currentAnalysis.analysis || 'No detailed analysis available'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No timeline data available</p>
            <p className="text-sm">Upload and analyze images to see timeline</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisTimelinePanel;