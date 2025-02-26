// netlify/functions/generate-image.js
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
  // Check if the event.body is base64 encoded
  if (event.isBase64Encoded) {
    event.body = Buffer.from(event.body, 'base64').toString();
  }
  
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    
    // Mock a req object that multiparty can work with
    const req = {
      headers: event.headers,
      body: event.body
    };
    
    // Add an 'on' function to handle the data
    req.on = function(event, handler) {
      if (event === 'data') {
        handler(Buffer.from(this.body));
      }
      if (event === 'end') {
        handler();
      }
      return this;
    };
    
    form.parse(req, (error, fields, files) => {
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
    const apiEndpoint = 'https://api.klingai.com/kolors/v1/text2image/create-task';
    
    // Create request body
    const requestData = {
      model_name: 'V1.0', // Assuming V1.0 as default
      prompt: fields.prompt,
      negative_prompt: fields.negative_prompt || '',
      image_num: parseInt(fields.count) || 1
    };
    
    // Handle aspect ratio
    if (fields.aspect_ratio) {
      const [width, height] = fields.aspect_ratio.split(':').map(Number);
      requestData.width = width * 512; // Scale the ratio to actual pixels
      requestData.height = height * 512;
    }
    
    // Check if there's a reference image (image-to-image case)
    if (files.image) {
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
      
      // Add reference image to request
      requestData.reference_image = `data:${imgType.mime};base64,${base64Image}`;
      requestData.reference_strength = parseFloat(fields.strength) || 0.5;
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