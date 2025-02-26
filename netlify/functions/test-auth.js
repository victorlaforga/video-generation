// netlify/functions/test-auth.js
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const accessKey = data.access_key;
    const secretKey = data.secret_key;
    
    if (!accessKey || !secretKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing API credentials' })
      };
    }
    
    // Generate JWT token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: accessKey,
      exp: now + 3600,
      iat: now
    };
    
    // Generate different token variations to test
    const tokens = {
      basic: jwt.sign(payload, secretKey, { algorithm: 'HS256' }),
      extended: jwt.sign({
        ...payload,
        nbf: now,
        sub: 'api_access',
        jti: now + '-' + Math.random().toString(36).substring(2, 10)
      }, secretKey, { algorithm: 'HS256' })
    };
    
    // Log the generated tokens
    console.log('Generated tokens:', {
      basic: tokens.basic,
      extended: tokens.extended
    });
    
    // Try a basic GET request to test authentication
    const results = [];
    
    for (const [tokenType, token] of Object.entries(tokens)) {
      try {
        const response = await fetch('https://api.klingai.com/v1/text2image', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'KlingAI-Client/1.0'
          }
        });
        
        const status = response.status;
        const responseBody = await response.text();
        
        results.push({
          tokenType,
          status,
          response: responseBody
        });
      } catch (error) {
        results.push({
          tokenType,
          error: error.toString()
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Authentication test results',
        tokens: {
          basic_token_start: tokens.basic.substring(0, 20) + '...',
          extended_token_start: tokens.extended.substring(0, 20) + '...'
        },
        results
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.toString() })
    };
  }
};