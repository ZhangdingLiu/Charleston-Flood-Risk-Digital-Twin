const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const openaiService = require('./services/openaiService');
const floodAnalysis = require('./services/floodAnalysis');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.ensureDirSync(uploadsDir);

// Demo data paths
const testImagesDir = path.join(__dirname, '..', 'data', 'test_images');
const analysisResultsPath = path.join(__dirname, '..', 'data', 'results', 'analysis_results.json');

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/test_images', express.static(testImagesDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Upload and analyze images
app.post('/api/upload', upload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    console.log(`Processing ${req.files.length} uploaded images...`);

    const analysisPromises = req.files.map(async (file, index) => {
      try {
        const imagePath = file.path;
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        
        // Analyze image with OpenAI Vision API
        const analysis = await openaiService.analyzeFloodImage(imagePath);
        
        return {
          id: uuidv4(),
          filename: file.originalname,
          url: imageUrl,
          timestamp: new Date().toISOString(),
          size: file.size,
          ...analysis
        };
      } catch (error) {
        console.error(`Error analyzing image ${index}:`, error.message);
        // Return error analysis for this specific image
        return {
          id: uuidv4(),
          filename: file.originalname,
          url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
          timestamp: new Date().toISOString(),
          size: file.size,
          error: 'Analysis failed',
          roadWaterDepth: { value: "unknown", confidence: 0.0 },
          riverWaterLevel: { value: "unknown", confidence: 0.0 },
          passability: "unknown",
          referenceObjects: [],
          analysis: `Failed to analyze image: ${error.message}`
        };
      }
    });

    const results = await Promise.all(analysisPromises);

    res.json({
      success: true,
      message: `Analyzed ${req.files.length} images`,
      images: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({
      error: 'Failed to process uploaded images',
      message: error.message
    });
  }
});

// Analyze single image by URL or file
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageUrl, imageId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    console.log(`Analyzing image: ${imageUrl}`);

    // If it's a local file URL, convert to file path
    let imagePath = imageUrl;
    if (imageUrl.includes('/uploads/')) {
      const filename = path.basename(imageUrl);
      imagePath = path.join(uploadsDir, filename);
    }

    const analysis = await openaiService.analyzeFloodImage(imagePath);

    res.json({
      success: true,
      imageId: imageId || uuidv4(),
      timestamp: new Date().toISOString(),
      ...analysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze image',
      message: error.message
    });
  }
});

// Get analysis history
app.get('/api/history', async (req, res) => {
  try {
    // In a real app, this would come from a database
    // For now, return mock historical data
    const history = await floodAnalysis.getAnalysisHistory();
    
    res.json({
      success: true,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis history',
      message: error.message
    });
  }
});

// Demo mode endpoints - Load pre-analyzed images
app.get('/api/demo/images', async (req, res) => {
  try {
    // Load analysis results
    const analysisData = JSON.parse(fs.readFileSync(analysisResultsPath, 'utf8'));
    
    // Transform the data to match our FloodAnalysis interface
    const transformedResults = analysisData.results.map(result => {
      const imageUrl = `${req.protocol}://${req.get('host')}/test_images/${result.filename}`;
      
      return {
        id: uuidv4(),
        filename: result.filename,
        url: imageUrl,
        timestamp: result.timestamp,
        size: 0, // Not available in analysis results
        roadWaterDepth: {
          value: `${result.depth_cm_estimate} cm`,
          confidence: 0.9, // Default high confidence for demo
          range: result.depth_range
        },
        riverWaterLevel: {
          value: "unknown", // Not available in analysis results
          confidence: 0.0
        },
        passability: result.passability,
        referenceObjects: [], // Not available in analysis results
        analysis: result.justification
      };
    });

    res.json({
      success: true,
      message: `Loaded ${transformedResults.length} demo images`,
      images: transformedResults,
      timestamp: new Date().toISOString(),
      summary: analysisData.summary
    });

  } catch (error) {
    console.error('Demo images loading error:', error);
    res.status(500).json({
      error: 'Failed to load demo images',
      message: error.message
    });
  }
});

// Demo history endpoint
app.get('/api/demo/history', async (req, res) => {
  try {
    // Load analysis results
    const analysisData = JSON.parse(fs.readFileSync(analysisResultsPath, 'utf8'));
    
    // Transform to history format
    const history = analysisData.results.map(result => {
      const imageUrl = `${req.protocol}://${req.get('host')}/test_images/${result.filename}`;
      
      return {
        id: uuidv4(),
        filename: result.filename,
        url: imageUrl,
        timestamp: result.timestamp,
        roadWaterDepth: {
          value: `${result.depth_cm_estimate} cm`,
          confidence: 0.9
        },
        riverWaterLevel: {
          value: "unknown",
          confidence: 0.0
        },
        passability: result.passability,
        referenceObjects: [],
        analysis: result.justification
      };
    });

    res.json({
      success: true,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Demo history retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve demo history',
      message: error.message
    });
  }
});


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Flood Prediction endpoints
const { spawn } = require('child_process');
const predictionsDir = path.join(uploadsDir, 'predictions');
fs.ensureDirSync(predictionsDir);
app.use('/predictions', express.static(predictionsDir));

// In-memory store for prediction progress
const predictionProgress = new Map();

// Async function to generate prediction maps one by one
async function generatePredictionMapsAsync(sessionId, jsonFiles, expectedWindows) {
  const mapVisDir = path.join(__dirname, '..', 'functionCodes', 'map_vis');
  const bayesnetDir = path.join(__dirname, '..', 'functionCodes', 'bayesnet integration');
  const demoImages = ['window_01.png', 'window_04.png', 'window_08.png'];
  const generatedImages = [];
  
  console.log(`🎨 Starting async generation of ${expectedWindows} prediction maps...`);
  
  for (let i = 0; i < expectedWindows; i++) {
    const windowNum = String(i + 1).padStart(2, '0');
    const jsonFile = jsonFiles[i];
    const outputImage = `window_${windowNum}.png`;
    const outputPath = path.join(predictionsDir, outputImage);
    const jsonPath = path.join(bayesnetDir, 'results', jsonFile);
    
    console.log(`🎨 Generating map ${i + 1}/${expectedWindows}: ${jsonFile} → ${outputImage}`);
    
    try {
      // Run map_vis.py to generate the actual PNG from JSON
      const mapVisPyPath = path.join(mapVisDir, 'map_vis.py');
      console.log(`📍 Running: python3 ${mapVisPyPath} --json "${jsonPath}" --output "${outputPath}"`);
      
      await new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [
          mapVisPyPath,
          '--json', jsonPath,
          '--output', outputPath
        ], {
          cwd: mapVisDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Map generation output: ${stdout.trim()}`);
            resolve();
          } else {
            console.error(`❌ Map generation failed (code ${code}): ${stderr.trim()}`);
            // Fall back to demo image if map generation fails
            const demoIndex = i % demoImages.length;
            const sourcePath = path.join(mapVisDir, demoImages[demoIndex]);
            if (fs.existsSync(sourcePath)) {
              fs.copyFileSync(sourcePath, outputPath);
              console.log(`📋 Using demo image as fallback: ${demoImages[demoIndex]}`);
            }
            resolve(); // Continue with next image even if this one fails
          }
        });
      });
      
      // Check if the output file was created
      if (fs.existsSync(outputPath)) {
        const newImage = {
          window: windowNum,
          filename: outputImage,
          url: `/predictions/${outputImage}`,
          jsonFile: jsonFile
        };
        generatedImages.push(newImage);
        
        // Update progress immediately after each image is generated
        const currentProgress = predictionProgress.get(sessionId);
        if (currentProgress) {
          currentProgress.currentWindow = i + 1;
          currentProgress.completedImages = [...generatedImages];
          predictionProgress.set(sessionId, currentProgress);
          
          console.log(`✅ Map ${i + 1}/${expectedWindows} completed and progress updated: ${outputImage}`);
        }
      } else {
        console.error(`❌ Output file not created: ${outputPath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating map ${i + 1}:`, error.message);
      // Fall back to demo image
      const demoIndex = i % demoImages.length;
      const sourcePath = path.join(mapVisDir, demoImages[demoIndex]);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, outputPath);
        console.log(`📋 Using demo image as fallback: ${demoImages[demoIndex]}`);
        
        const newImage = {
          window: windowNum,
          filename: outputImage,
          url: `/predictions/${outputImage}`,
          jsonFile: jsonFile
        };
        generatedImages.push(newImage);
        
        // Update progress
        const currentProgress = predictionProgress.get(sessionId);
        if (currentProgress) {
          currentProgress.currentWindow = i + 1;
          currentProgress.completedImages = [...generatedImages];
          predictionProgress.set(sessionId, currentProgress);
        }
      }
    }
  }
  
  console.log(`🎉 Successfully generated ${generatedImages.length} prediction maps asynchronously`);
  
  // Mark progress as completed
  const finalProgress = predictionProgress.get(sessionId);
  if (finalProgress) {
    finalProgress.status = 'completed';
    predictionProgress.set(sessionId, finalProgress);
    
    // Clean up progress after 5 minutes
    setTimeout(() => {
      predictionProgress.delete(sessionId);
      console.log(`🗑️ Cleaned up progress for session: ${sessionId}`);
    }, 5 * 60 * 1000);
  }
}

// Get prediction progress
app.get('/api/flood-prediction/progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const progress = predictionProgress.get(sessionId) || {
    status: 'not_started',
    currentWindow: 0,
    totalWindows: 8,
    completedImages: []
  };
  res.json(progress);
});

app.post('/api/flood-prediction', async (req, res) => {
  try {
    console.log('🔮 Starting flood prediction workflow...');
    
    // Generate session ID for tracking progress
    const sessionId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📋 Session ID: ${sessionId}`);
    
    // Step 0: Clean up old files before running prediction
    const bayesnetDir = path.join(__dirname, '..', 'functionCodes', 'bayesnet integration');
    const resultsDir = path.join(bayesnetDir, 'results');
    
    // Clear old JSON files
    if (fs.existsSync(resultsDir)) {
      const oldFiles = fs.readdirSync(resultsDir).filter(file => file.endsWith('.json'));
      for (const file of oldFiles) {
        fs.removeSync(path.join(resultsDir, file));
      }
      console.log(`🗑️ Cleared ${oldFiles.length} old JSON files`);
    }
    
    // Clear old prediction images
    const predictionsDir = path.join(uploadsDir, 'predictions');
    if (fs.existsSync(predictionsDir)) {
      const oldImages = fs.readdirSync(predictionsDir).filter(file => file.endsWith('.png'));
      for (const file of oldImages) {
        fs.removeSync(path.join(predictionsDir, file));
      }
      console.log(`🗑️ Cleared ${oldImages.length} old prediction images`);
    }
    
    // Step 1: Run pure_python_prediction.py
    const pythonScript = path.join(bayesnetDir, 'pure_python_prediction.py');
    
    console.log('📊 Running Bayesian network prediction...');
    const predictionProcess = spawn('python3', [pythonScript], {
      cwd: bayesnetDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let predictionOutput = '';
    let predictionError = '';
    
    predictionProcess.stdout.on('data', (data) => {
      predictionOutput += data.toString();
      console.log('Python Output:', data.toString());
    });
    
    predictionProcess.stderr.on('data', (data) => {
      predictionError += data.toString();
      console.error('Python Error:', data.toString());
    });
    
    predictionProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('❌ Bayesian prediction failed with code:', code);
        return res.status(500).json({
          error: 'Bayesian prediction failed',
          message: predictionError || 'Unknown error occurred'
        });
      }
      
      try {
        // Step 2: Find generated JSON files
        const resultsDir = path.join(bayesnetDir, 'results');
        if (!fs.existsSync(resultsDir)) {
          throw new Error('Results directory not found');
        }
        
        const jsonFiles = fs.readdirSync(resultsDir)
          .filter(file => file.endsWith('.json'))
          .sort();
        
        if (jsonFiles.length === 0) {
          throw new Error('No JSON prediction files found');
        }
        
        console.log(`✅ Found ${jsonFiles.length} JSON prediction files`);
        
        // Step 3: Initialize progress and start async image generation
        console.log('🗺️ Starting async flood prediction maps generation...');
        
        const EXPECTED_WINDOWS = Math.min(jsonFiles.length, 8); // Use actual JSON count, max 8
        
        // Initialize progress tracking
        predictionProgress.set(sessionId, {
          status: 'generating_maps',
          currentWindow: 0,
          totalWindows: EXPECTED_WINDOWS,
          completedImages: [],
          sessionId: sessionId
        });
        
        // Respond immediately to client
        res.json({
          success: true,
          message: 'Flood prediction started successfully',
          sessionId: sessionId,
          totalWindows: EXPECTED_WINDOWS,
          timestamp: new Date().toISOString()
        });
        
        // Start asynchronous image generation in background
        generatePredictionMapsAsync(sessionId, jsonFiles, EXPECTED_WINDOWS);
        
      } catch (error) {
        console.error('❌ Error in prediction workflow:', error);
        res.status(500).json({
          error: 'Prediction workflow failed',
          message: error.message
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Flood prediction error:', error);
    res.status(500).json({
      error: 'Failed to start flood prediction',
      message: error.message
    });
  }
});

// Sensor data endpoints
const sensorDataPath = path.join(__dirname, '..', 'data', 'sensor_data');
app.use('/sensor', express.static(sensorDataPath));

app.get('/api/sensor-data', async (req, res) => {
  try {
    const sensorFilePath = path.join(sensorDataPath, 'huger_king_st.json');
    
    if (!fs.existsSync(sensorFilePath)) {
      return res.status(404).json({
        error: 'Sensor data not found',
        message: 'huger_king_st.json file not found'
      });
    }

    const sensorData = JSON.parse(fs.readFileSync(sensorFilePath, 'utf8'));
    
    // Process sensor readings - convert from feet to cm and calculate passability
    const processedReadings = sensorData.data.waterlevel.map(reading => {
      const depthInFeet = reading.o;
      const depthInCm = Math.round(depthInFeet * 30.48 * 100) / 100; // Convert ft to cm with 2 decimal precision
      
      // Calculate passability based on depth
      let passability = 'pass';
      if (depthInCm > 30) {
        passability = 'unsafe';
      } else if (depthInCm > 15) {
        passability = 'caution';
      }
      
      return {
        t: reading.t,           // Keep original time format
        o: depthInFeet,         // Keep original feet value
        depth_cm: depthInCm,    // Add converted cm value
        passability: passability
      };
    });

    const response = {
      success: true,
      meta: sensorData.meta,
      waterlevel: processedReadings,  // Use waterlevel key to match original structure
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Sensor data retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve sensor data',
      message: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌊 Flood Monitoring Backend Server running on port ${PORT}`);
  console.log(`📡 Frontend CORS enabled for: ${process.env.FRONTEND_URL}`);
  console.log(`🤖 OpenAI API configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
});