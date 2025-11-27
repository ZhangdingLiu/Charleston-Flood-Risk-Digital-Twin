# 🌊 Urban Flood Monitoring Digital Twin System

A full-stack web application for real-time urban flood monitoring using **OpenAI GPT-4 Vision API** for AI-powered water level assessment and traffic safety analysis.

## 📹 Demo Videos

| Feature | Description | Video |
|---------|-------------|-------|
| **🎯 Bayesian Network Prediction** | Real-time flood risk prediction using Bayesian network integration | [▶️ Watch](https://github.com/ZhangdingLiu/Charleston-Flood-Risk-Digital-Twin/raw/main/demo_videos/bayesi.mp4) |
| **🎯 VLM Flood Sensing** | AI-powered flood detection using Vision Language Model (GPT-4 Vision) to assess water depth and passability | [▶️ Watch](https://github.com/ZhangdingLiu/Charleston-Flood-Risk-Digital-Twin/raw/main/demo_videos/cameraVLM_Dashboard.mp4) |
| **🎯 Sensor Monitoring** | Real-time monitoring dashboard displaying data from roadside flood sensors (Hohonu stations) | [▶️ Watch](https://github.com/ZhangdingLiu/Charleston-Flood-Risk-Digital-Twin/raw/main/demo_videos/sensor.mp4) |
| **🎯 Digital Twin Dashboard** | Interactive map visualization showing flood conditions across Charleston with integrated sensor data | [▶️ Watch](https://github.com/ZhangdingLiu/Charleston-Flood-Risk-Digital-Twin/raw/main/demo_videos/map.mp4) |

## 🏗️ Architecture

**Frontend**: React.js + TypeScript + Tailwind CSS (Port 3000)
**Backend**: Node.js + Express + OpenAI GPT-4 Vision API (Port 5000)
**Communication**: REST API with CORS enabled

> 💡 全栈的实现在 GenAI Coding 工具帮助下完成

## ✨ Key Features

### 🤖 **Real OpenAI GPT-4 Vision Integration**
- **Actual AI Analysis** of flood images using OpenAI's latest vision model
- **Precise Water Depth Measurement** using reference objects (car wheels, curbs, poles)
- **Road Passability Assessment** (safe/dangerous/impassable)
- **Trend Analysis** with direction and rate calculations

### 🎛️ **Professional Control Room Interface**
- **Three-Panel Dark Theme Layout**:
  - **Left**: Live camera feed simulation with playback controls
  - **Right**: Real-time digital twin dashboard with charts
  - **Bottom**: Analysis timeline and detailed results
- **Time-Series Management** (50+ frames at 6-minute intervals)
- **Interactive Charts** showing water levels and risk trends

### 📊 **Advanced Analytics**
- **Real-time Metrics** with confidence scores
- **Reference Object Tracking** for measurement accuracy
- **Trend Calculations** with prediction capabilities
- **Automated Recommendations** based on conditions

## 🚀 Quick Setup

### 1. **Backend Setup (Express + OpenAI)**
```bash
cd backend
npm install

# Create .env file from template
cp .env.example .env

# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=your_actual_openai_api_key_here
# Get your API key from: https://platform.openai.com/api-keys

npm run dev  # Server runs on port 5000
```

### 2. **Frontend Setup (React)**
```bash
cd frontend
npm install

# Optional: Create .env file from template if needed
cp .env.example .env

npm start    # App runs on port 3000
```

### 3. **Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### 4. **Optional: Setup Test Data**
```bash
# Create data directories (ignored by git)
mkdir -p data/test_images data/fewshot_examples data/results

# Place your test flood images in data/test_images/
# Run batch analysis:
python3 scripts/flood_image_analyzer.py
```

## 🔧 Configuration

### Backend Environment Variables (`.env`)
```bash
# Required: Your OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Server Settings
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Upload Settings
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=uploads
```

### Frontend Environment Variables (`.env`)
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MAX_FILES=50
REACT_APP_MAX_FILE_SIZE=10485760
```

## 📡 API Endpoints

### Image Analysis
- `POST /api/upload` - Batch upload and analyze images
- `POST /api/analyze` - Analyze single image
- `GET /api/history` - Get analysis history
- `POST /api/trend` - Calculate trend analysis
- `GET /api/health` - System health check

### OpenAI Analysis Output Format
```json
{
  "roadWaterDepth": {"value": "15cm", "confidence": 0.85},
  "riverWaterLevel": {"value": "2.3m", "confidence": 0.90},
  "passability": "dangerous",
  "trend": {"direction": "rising", "rate": "3cm/6min"},
  "referenceObjects": ["car_wheel", "curb_stone"],
  "analysis": "Detailed AI observations and measurements"
}
```

## 🎯 How to Use

### 1. **Upload Images**
- Drag & drop up to 50 images into the camera feed panel
- Supported formats: JPEG, PNG, GIF, WebP (max 10MB each)
- Images are automatically sent to OpenAI GPT-4 Vision for analysis

### 2. **View Real-time Analysis**
- **Water depth measurements** using AI-detected reference objects
- **Passability status** (safe/dangerous/impassable)
- **Confidence scores** for all measurements
- **Reference objects** detected in each frame

### 3. **Monitor Trends**
- **Interactive charts** showing water level progression
- **Trend calculations** (rising/falling/stable with rates)
- **Predictive analysis** based on historical data
- **Automated recommendations** for emergency response

### 4. **Navigate Timeline**
- **Frame-by-frame** analysis with play/pause controls
- **6-minute interval** time-series simulation
- **Detailed timeline** with all analysis results
- **Quick navigation** to any frame

## 🛡️ Security Features

- **API Key Protection**: OpenAI key stored server-side only
- **File Validation**: Strict image file type and size checking
- **CORS Configuration**: Secure frontend-backend communication
- **Error Handling**: Comprehensive error management throughout

## 🔬 OpenAI Vision Analysis

The system uses OpenAI's GPT-4 Vision model to perform sophisticated flood analysis:

### Analysis Capabilities
- **Water Level Detection**: Precise depth measurements using reference objects
- **Object Recognition**: Cars, pedestrians, infrastructure elements
- **Passability Assessment**: Multi-factor safety evaluation
- **Trend Analysis**: Rate of change calculations
- **Confidence Scoring**: Reliability metrics for all measurements

### Reference Object Types
- `car_wheel` - Vehicle wheels for depth reference
- `curb_stone` - Street curbs and barriers
- `pole` - Light poles, signs, vertical structures
- `building` - Building foundations and structures
- `tree` - Trees and vegetation markers
- `road_marking` - Lane lines and road paint

## 📈 Dashboard Features

### Real-time Metrics
- **Water Depth**: Current road flooding level
- **River Level**: Water body height measurements
- **Passability Status**: Traffic safety assessment
- **Trend Direction**: Rising/falling/stable indicators

### Interactive Charts
- **Water Level Trend**: Time-series depth progression
- **Risk Assessment**: Passability risk over time
- **Confidence Tracking**: Analysis reliability metrics

### Analysis Timeline
- **Recent Activity**: Latest 10 analyses with quick access
- **Detailed View**: Full analysis breakdown for current frame
- **Recommendations**: AI-generated action items
- **Reference Objects**: Visual tags for detected elements

## 🔧 Development

### Project Structure
```
Charleston_Flood_DigitalTwin/
├── backend/                    # Node.js + Express backend
│   ├── services/
│   │   ├── openaiService.js   # OpenAI GPT-4 Vision integration
│   │   └── floodAnalysis.js   # Trend analysis utilities
│   ├── uploads/                # Image storage directory
│   ├── server.js              # Main Express server
│   ├── .env.example           # Environment template
│   └── package.json
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   ├── types/             # TypeScript definitions
│   │   └── App.tsx            # Main application
│   ├── .env.example           # Environment template
│   └── package.json
├── functionCodes/              # Additional features
│   ├── map_vis/               # Map visualization
│   └── bayesnet integration/  # Bayesian network integration
├── scripts/                    # Utility scripts
│   ├── flood_image_analyzer.py      # Batch image analysis
│   └── dashboard-layout-editor.html # Dashboard editor
├── data/                       # Data files (not in repository)
│   ├── demo_videos/           # Demo recordings
│   ├── test_images/           # Test flood images
│   ├── fewshot_examples/      # AI training examples
│   ├── sensor_data/           # Hohonu sensor data
│   └── results/               # Analysis results
├── docs/                       # Documentation
│   ├── images/                # Screenshots
│   └── README_batch_analysis.md
└── README.md
```

### Available Scripts

**Backend**:
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

**Frontend**:
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

**Scripts**:
- `python3 scripts/flood_image_analyzer.py` - Batch analyze images in `data/test_images/`
- Results saved to `data/results/analysis_results.json`

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Backend connection failures
- **API Errors**: OpenAI service unavailability
- **File Errors**: Invalid uploads or processing failures
- **Analysis Errors**: Graceful degradation for failed analyses

## 📊 System Status Monitoring

Real-time status indicators show:
- **Backend Connection**: Server availability
- **OpenAI Service**: API connectivity and configuration
- **System Health**: Overall operational status
- **Processing Status**: Current analysis queue

## 🎨 UI/UX Features

- **Dark Control Room Theme**: Professional monitoring interface
- **Responsive Design**: Works on desktop and tablet devices
- **Loading States**: Visual feedback during processing
- **Error Messages**: Clear user communication
- **Accessibility**: Keyboard navigation and screen reader support

## 🧪 Testing

To test the system:

1. **Upload Sample Images**: Use coastal parking area photos during flooding
2. **Verify Analysis**: Check that OpenAI returns structured flood data
3. **Test Navigation**: Use playback controls to browse results
4. **Monitor Charts**: Ensure real-time data visualization works
5. **Check Recommendations**: Verify AI-generated action items

## 📝 Notes

- **OpenAI API Key Required**: System will not function without valid key (get from https://platform.openai.com/api-keys)
- **Environment Files**: `.env` files contain sensitive data and are excluded from git
- **Data Directory**: All files in `data/` directory are excluded from repository
- **Image Quality**: Higher resolution images provide better analysis
- **Reference Objects**: Images with visible cars, curbs, or poles work best
- **Processing Time**: Analysis takes 5-15 seconds per image depending on complexity

## 🤝 Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify OpenAI API key is correctly configured
3. Ensure both frontend and backend servers are running
4. Check network connectivity between components

---

**Built with OpenAI GPT-4 Vision API for professional flood monitoring and emergency response.**
