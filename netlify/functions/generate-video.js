// netlify/functions/generate-video.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
const fileType = require('file-type');
const multiparty = require('multiparty');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

// Function to generate API token
function generateKlingToken(accessKey, secretKey) {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: accessKey,
    exp: now + 3600, // Token valid for 1 hour
    iat: now
  };
  
  return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
}

// Process the multipart form data
async function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    
    form.parse(event, (error, fields, files) => {
      if (error) return reject(error);
      
      // Convert fields from arrays to single values
      const processedFields = {};
      Object.keys(fields).forEach(key => {
        processedFields[key] = fields[key][0];
      });
      
      resolve({
        fields: processedFields,
        files: files
      });
    });
  });
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  try {
    // Parse the multipart form data
    const { fields, files } = await parseMultipartForm(event);
    
    // Get API credentials from the request
    const accessKey = fields.access_key;
    const secretKey = fields.secret_key;
    
    if (!accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing API credentials' })
      };
    }
    
    // Generate API token
    const apiToken = generateKlingToken(accessKey, secretKey);
    
    // Prepare the API request data
    const apiEndpoint = 'https://api.klingai.com/kling/v1/img2video/create-task';
    
    // Check if there's a source image (required for image-to-video)
    if (!files.image || !files.image[0]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Source image is required' })
      };
    }
    
    const imageFile = files.image[0];
    const imageBuffer = await readFile(imageFile.path);
    const imgType = await fileType.fromBuffer(imageBuffer);
    
    if (!imgType || !imgType.mime.startsWith('image/')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid image file' })
      };
    }
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Create request body based on the model version
    const modelName = fields.model || 'V1.0';
    const mode = fields.mode || 'standard';
    const duration = parseInt(fields.duration) || 5;
    
    // Create request body
    const requestData = {
      model_name: modelName,
      mode: mode,
      prompt: fields.prompt,
      negative_prompt: fields.negative_prompt || '',
      reference_image: `data:${imgType.mime};base64,${base64Image}`,
      reference_strength: 0.8, // Default strength for image reference
      creativity_strength: 0.2, // Default creativity strength
      video_length: duration,
      fps: 24 // Standard fps
    };
    
    // Handle aspect ratio if provided
    if (fields.aspect_ratio) {
      const [width, height] = fields.aspect_ratio.split(':').map(Number);
      // Scale to appropriate dimensions based on ratio
      const baseSize = 512;
      requestData.width = width * baseSize;
      requestData.height = height * baseSize;
    }
    
    // Make the API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: 'Error from Kling AI API',
          error: responseData
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Task created successfully',
        task_id: responseData.task_id
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

generateVideoButton.addEventListener('click', async () => {
    console.log('Video generation button clicked');
    // Rest of your code
  });