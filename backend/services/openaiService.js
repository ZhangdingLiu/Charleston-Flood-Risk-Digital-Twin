const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async analyzeFloodImage(imagePath) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Read and encode image
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Prepare the prompt for flood analysis
      const prompt = `
      **Task**
You are an engineering vision assistant. From a single Charleston Harbor parking-lot frame, output:
  • Estimated standing-water depth at the flooded parking area (cm, integer)
  • Passability for ordinary sedan
  • Short justification

**Visual anchors & canonical dimensions**
  Raised planter curb reveal = 45 cm (+/- 5 cm)
  White parking-stripe width = 10 cm
  Concrete wheel stop height = 13 cm

**Cue-based depth bands**
  • Wheel stop fully visible; stripes crisp -> < 5 cm
  • Water pooling at wheel stop base; stripes still crisp -> 5–10 cm
  • Water near top of wheel stop; stripes slightly faded -> 10–15 cm
  • Stripes faint / curb clearly above water -> 15–20 cm
  • Stripes barely visible, water ~5 cm below curb -> 20–25 cm
  • Stripes gone, water nearly level with curb -> 25–30 cm
  • Water lapping over curb top -> 30–40 cm
  • Wheel stop submerged & curb hidden -> > 40 cm

**Passability rules**
  - Sedan: pass <= 15 cm; caution 15–30 cm; unsafe > 30 cm

**Required reasoning steps**
1. Inspect stripe visibility and curb waterline.
2. Select the matching depth band.
3. Assign the band midpoint as depth_cm_estimate.
4. Determine sedan & ambulance verdict using the rules.
5. Output JSON ONLY.

**Output format**
{
  "depth_cm_estimate": ,
  "depth_range": "",
  "passability": "",
  "justification": ""
}
`;

      // Define JSON Schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          depth_cm_estimate: {
            type: "number",
            description: "Estimated water depth in centimeters"
          },
          depth_range: {
            type: "string",
            description: "Depth range category"
          },
          passability: {
            type: "string",
            enum: ["pass", "caution", "unsafe", "unknown"],
            description: "Vehicle passability assessment"
          },
          justification: {
            type: "string",
            description: "Reasoning for the assessment"
          }
        },
        required: ["depth_cm_estimate", "depth_range", "passability", "justification"],
        additionalProperties: false
      };

      // Use Chat Completions API with GPT-4o
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "flood_analysis",
            strict: true,
            schema: responseSchema
          }
        }
      });

      // Chat Completions API returns message content
      const content = response.choices[0].message.content;
      console.log('🔍 OpenAI Raw Response:', content);
      
      // For structured output with JSON schema, content should be JSON
      let analysisData;
      try {
        analysisData = JSON.parse(content);
      } catch (error) {
        console.log('❌ Failed to parse JSON response:', error);
        throw new Error('Invalid JSON in OpenAI response');
      }
      
      console.log('📋 Parsed Analysis Data:', analysisData);
      
      // Validate the raw response format
      this.validateAnalysisResponse(analysisData);
      
      // Transform the new format to match existing system expectations
      const transformedData = {
        roadWaterDepth: { 
          value: `${analysisData.depth_cm_estimate}cm`,
          range: analysisData.depth_range || 'unknown'
        },
        riverWaterLevel: { 
          value: 'n/a',
          confidence: 1.0
        },
        passability: analysisData.passability,
        referenceObjects: [],
        analysis: analysisData.justification || 'No analysis provided'
      };
      
      console.log(`✅ Successfully analyzed image: ${path.basename(imagePath)}`);
      return transformedData;

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      
      // Return a structured error response
      return {
        roadWaterDepth: { value: "analysis_failed", range: "unknown" },
        riverWaterLevel: { value: "analysis_failed", confidence: 0.0 },
        passability: "unknown",
        referenceObjects: [],
        analysis: `Analysis failed: ${error.message}`
      };
    }
  }

  validateAnalysisResponse(data) {
    const required = ['depth_cm_estimate', 'depth_range', 'passability', 'justification'];
    
    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate specific field structures
    if (typeof data.depth_cm_estimate !== 'number') {
      throw new Error('depth_cm_estimate must be a number');
    }

    if (!['pass', 'caution', 'unsafe', 'unknown'].includes(data.passability)) {
      throw new Error('Invalid passability value. Must be: pass, caution, unsafe, or unknown');
    }

    if (typeof data.justification !== 'string') {
      throw new Error('justification must be a string');
    }
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  async testConnection() {
    if (!this.openai) {
      return { connected: false, error: 'API key not configured' };
    }

    try {
      const response = await this.openai.models.list();
      return { 
        connected: true, 
        models: response.data.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        connected: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new OpenAIService();