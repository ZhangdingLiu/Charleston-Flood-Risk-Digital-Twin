class FloodAnalysisService {

  parseWaterDepth(depthString) {
    if (!depthString || typeof depthString !== 'string') {
      return null;
    }

    // Handle various formats: "15cm", "1.2m", "unknown", etc.
    const match = depthString.match(/([0-9.]+)\s*(cm|m)/i);
    if (!match) {
      return null;
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    // Convert to cm
    if (unit === 'm') {
      return value * 100;
    } else if (unit === 'cm') {
      return value;
    }

    return null;
  }

  calculateConsistency(depths) {
    if (depths.length < 3) {
      return 0.5;
    }

    // Calculate variance
    const mean = depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
    const variance = depths.reduce((sum, depth) => sum + Math.pow(depth - mean, 2), 0) / depths.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to confidence (inverse relationship with variance)
    const maxStdDev = 10; // Reasonable max standard deviation for water depth
    const consistency = Math.max(0.1, 1 - (standardDeviation / maxStdDev));

    return consistency;
  }

  assessRisk(analysis) {
    const waterDepth = this.parseWaterDepth(analysis.roadWaterDepth?.value);
    const passability = analysis.passability;

    let riskLevel = 'unknown';
    let riskScore = 0;

    // Sedan-based three-tier system
    if (waterDepth !== null) {
      if (waterDepth <= 15) {
        riskLevel = 'pass';
        riskScore = 25;
      } else if (waterDepth > 15 && waterDepth <= 30) {
        riskLevel = 'caution';
        riskScore = 65;
      } else if (waterDepth > 30) {
        riskLevel = 'unsafe';
        riskScore = 90;
      }
    }

    // Override based on AI passability assessment if available
    switch (passability) {
      case 'unsafe':
        riskScore = Math.max(riskScore, 90);
        riskLevel = 'unsafe';
        break;
      case 'caution':
        riskScore = Math.max(riskScore, 65);
        riskLevel = 'caution';
        break;
      case 'pass':
        riskScore = Math.min(riskScore, 25);
        riskLevel = 'pass';
        break;
    }

    return {
      level: riskLevel,
      score: riskScore,
      confidence: 1.0, // High confidence since based on direct depth measurement
      factors: {
        waterDepth: waterDepth,
        passability: passability,
        sedanClassification: waterDepth <= 15 ? 'pass' : waterDepth <= 30 ? 'caution' : 'unsafe'
      }
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const risk = this.assessRisk(analysis);
    const waterDepth = this.parseWaterDepth(analysis.roadWaterDepth?.value);

    // Based on current conditions
    if (analysis.passability === 'impassable') {
      recommendations.push('IMMEDIATE: Close road access - area is impassable');
      recommendations.push('Deploy emergency response teams to affected area');
      recommendations.push('Set up alternative traffic routes');
    } else if (analysis.passability === 'dangerous') {
      recommendations.push('URGENT: Restrict heavy vehicle access');
      recommendations.push('Install warning signs and barriers');
      recommendations.push('Monitor conditions closely every 6 minutes');
    } else if (analysis.passability === 'safe' && waterDepth && waterDepth > 0) {
      recommendations.push('Maintain normal traffic flow with caution');
      recommendations.push('Continue regular monitoring schedule');
    }


    // Based on reference objects
    if (analysis.referenceObjects && analysis.referenceObjects.length > 0) {
      recommendations.push(`Reference objects detected: ${analysis.referenceObjects.join(', ')}`);
      recommendations.push('Use reference objects for manual verification');
    } else {
      recommendations.push('Deploy additional reference markers for accurate measurement');
    }

    return recommendations;
  }

  async getAnalysisHistory() {
    // In a real application, this would fetch from a database
    // For now, return mock historical data
    const mockHistory = Array.from({ length: 20 }, (_, i) => {
      const timestamp = new Date(Date.now() - (19 - i) * 6 * 60 * 1000);
      const baseDepth = 10 + Math.sin(i / 3) * 8 + Math.random() * 4;
      
      return {
        id: `hist-${i}`,
        timestamp: timestamp.toISOString(),
        roadWaterDepth: { 
          value: `${baseDepth.toFixed(1)}cm`, 
          confidence: 0.8 + Math.random() * 0.15 
        },
        riverWaterLevel: { 
          value: `${(baseDepth / 5 + 1.5).toFixed(1)}m`, 
          confidence: 0.85 + Math.random() * 0.1 
        },
        passability: baseDepth < 8 ? 'safe' : baseDepth < 20 ? 'dangerous' : 'impassable',
        trend: { 
          direction: i > 10 ? 'rising' : 'falling', 
          rate: `${(Math.random() * 2 + 0.5).toFixed(1)}cm/6min` 
        },
        referenceObjects: ['car_wheel', 'curb_stone', 'pole'].slice(0, Math.floor(Math.random() * 3) + 1),
        analysis: `Historical analysis from ${timestamp.toLocaleString()}`
      };
    });

    return mockHistory;
  }
}

module.exports = new FloodAnalysisService();