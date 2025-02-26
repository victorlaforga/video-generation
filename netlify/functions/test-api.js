// netlify/functions/test-api.js
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Function to generate API token
// Function to generate API token - updated version
function generateKlingToken(accessKey, secretKey) {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iss: accessKey,      // Issuer
      exp: now + 3600,     // Expiration time (1 hour from now)
      iat: now,            // Issued at time
      nbf: now,            // Not valid before
      sub: 'api_access',   // Subject
      jti: now + '-' + Math.random().toString(36).substring(2, 10)  // JWT ID (unique)
    };
    
    const options = {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256'
      }
    };
    
    return jwt.sign(payload, secretKey, options);
  }

exports.handler = async function(event, context) {
  console.log('Test API function called');
  
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
    
    // Try multiple potential endpoints
    const endpoints = [
      "https://api.klingai.com/kolors/v1/text2image/create-task",
      "https://api.klingai.com/kling/v1/img2video/create-task",
      "https://api.klingai.com/api/v1/text2image/create-task",
      "https://api.klingai.com/api/v1/img2video/create-task",
      "https://api.klingai.com/v1/text2image/create-task",
      "https://api.klingai.com/v1/img2video/create-task"
    ];
    
    // Test a simple GET request to see what's available
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint.replace('/create-task', ''), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        });
        
        const status = response.status;
        let body = '';
        
        try {
          body = await response.text();
        } catch (e) {
          body = '(unable to read response body)';
        }
        
        results.push({
          endpoint,
          status,
          body: body.substring(0, 500) // Limit the response size
        });
      } catch (error) {
        results.push({
          endpoint,
          error: error.toString()
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'API endpoint test results',
        results: results
      })
    };
  } catch (error) {
    console.error('Error in test API function:', error);
    
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