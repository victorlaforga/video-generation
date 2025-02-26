// netlify/functions/generate-image.js
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

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  try {
    // Parse the request body as JSON
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request body. JSON expected.' })
      };
    }
    
    // Get API credentials from the request
    const accessKey = data.access_key;
    const secretKey = data.secret_key;
    
    if (!accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing API credentials' })
      };
    }
    
    // Generate API token
    const apiToken = generateKlingToken(accessKey, secretKey);
    
    // Prepare the API request data
    const apiEndpoint = 'https://api.klingai.com/kolors/v1/text2image/create-task';
    
    // Create request body
    const requestData = {
      model_name: 'V1.0', // Assuming V1.0 as default
      prompt: data.prompt,
      negative_prompt: data.negative_prompt || '',
      image_num: parseInt(data.count) || 1
    };
    
    // Handle aspect ratio
    if (data.aspect_ratio) {
      const [width, height] = data.aspect_ratio.split(':').map(Number);
      requestData.width = width * 512; // Scale the ratio to actual pixels
      requestData.height = height * 512;
    }
    
    // Check if there's a reference image (image-to-image case)
    if (data.image_base64) {
      // Add reference image to request
      requestData.reference_image = data.image_base64;
      requestData.reference_strength = parseFloat(data.strength) || 0.5;
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
        error: error.toString(),
        stack: error.stack
      })
    };
  }
};