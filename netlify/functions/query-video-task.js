// netlify/functions/query-video-task.js
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
  
  console.log('Query video task function called');
  
  try {
    // Get query parameters
    const params = event.queryStringParameters;
    const taskId = params.task_id;
    const accessKey = params.access_key;
    const secretKey = params.secret_key;
    
    console.log('Query params received:', { task_id: taskId, has_access_key: !!accessKey, has_secret_key: !!secretKey });
    
    if (!taskId || !accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameters' })
      };
    }
    
    // Generate API token
    const apiToken = generateKlingToken(accessKey, secretKey);
    
    // Query the task status - corrected endpoint
    const apiEndpoint = `https://api.klingai.com/api/v1/img2video/query-task?task_id=${taskId}`;
    console.log('Querying task status at:', apiEndpoint);
    
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
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
    
    // Process the response to standardize the format
    let status = 'pending';
    let results = null;
    let error = null;
    
    if (responseData.status === 'SUCCESS') {
      status = 'completed';
      
      // Process video results
      if (responseData.data && responseData.data.video_url) {
        results = {
          id: responseData.task_id || `vid_${Date.now()}`,
          url: responseData.data.video_url
        };
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
    console.error('Error in query video task function:', error);
    
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