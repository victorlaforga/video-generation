// netlify/functions/generate-video.js
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

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

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  console.log('Video generation function called');
  
  try {
    // Parse the request body as JSON
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      console.log('Error parsing request body:', e);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request body. JSON expected.' })
      };
    }
    
    console.log('Request data received (keys only):', Object.keys(data));
    
    // Get API credentials from the request
    const accessKey = data.access_key;
    const secretKey = data.secret_key;
    
    if (!accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing API credentials' })
      };
    }
    
    // Check if there's a source image (required for image-to-video)
    if (!data.image_base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Source image is required' })
      };
    }
    
    // Generate API token
    const apiToken = generateKlingToken(accessKey, secretKey);
    
    // Prepare the API request data - corrected endpoint
    const apiEndpoint = 'https://api.klingai.com/api/v1/img2video/create-task';
    
    // Create request body based on the model version
    const modelName = data.model || 'V1.0';
    const mode = data.mode || 'standard';
    const duration = parseInt(data.duration) || 5;
    
    // Create request body
    const requestData = {
      model_name: modelName,
      mode: mode,
      prompt: data.prompt,
      negative_prompt: data.negative_prompt || '',
      reference_image: data.image_base64,
      reference_strength: 0.8, // Default strength for image reference
      creativity_strength: 0.2, // Default creativity strength
      video_length: duration,
      fps: 24 // Standard fps
    };
    
    // Handle aspect ratio if provided
    if (data.aspect_ratio) {
      const [width, height] = data.aspect_ratio.split(':').map(Number);
      // Scale to appropriate dimensions based on ratio
      const baseSize = 512;
      requestData.width = width * baseSize;
      requestData.height = height * baseSize;
    }
    
    console.log('Making API request to:', apiEndpoint);
    console.log('Request data (without credentials and base64):', {
      ...requestData,
      reference_image: '(base64 data present)'
    });
    
    // Make the API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    const responseText = await response.text();
    console.log('API response status:', response.status);
    console.log('API response body:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('Error parsing API response:', e);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Error parsing API response',
          rawResponse: responseText
        })
      };
    }
    
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
    console.error('Error in video generation function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.toString(),
        stack: error.stack
      })
    };
  }
};