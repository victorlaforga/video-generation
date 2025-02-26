// netlify/functions/query-image-task.js
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
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  try {
    // Get query parameters
    const params = event.queryStringParameters;
    const taskId = params.task_id;
    const accessKey = params.access_key;
    const secretKey = params.secret_key;
    
    if (!taskId || !accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameters' })
      };
    }
    
    // Generate API token
    const apiToken = generateKlingToken(accessKey, secretKey);
    
    // Query the task status
    const apiEndpoint = `https://api.klingai.com/kolors/v1/text2image/query-task?task_id=${taskId}`;
    
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
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
    
    // Process the response to standardize the format
    let status = 'pending';
    let results = [];
    let error = null;
    
    if (responseData.status === 'SUCCESS') {
      status = 'completed';
      
      // Process image results if available
      if (responseData.data && responseData.data.images && responseData.data.images.length > 0) {
        results = responseData.data.images.map(image => ({
          id: image.id || `img_${Date.now()}`,
          url: image.url
        }));
      }
    } else if (responseData.status === 'PENDING' || responseData.status === 'PROCESSING') {
      status = 'processing';
    } else {
      status = 'failed';
      error = responseData.message || 'Task failed';
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status,
        results,
        error,
        raw_response: responseData // Include raw response for debugging
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