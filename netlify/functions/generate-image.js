// netlify/functions/generate-image.js
const jwt = require('jsonwebtoken');

exports.handler = async function(event, context) {
  try {
    console.log("Image generation function called", {
      method: event.httpMethod,
      contentType: event.headers['content-type'] || event.headers['Content-Type'],
      bodyLength: event.body ? event.body.length : 0,
      isBase64: event.isBase64Encoded
    });

    // Simply return a mock task_id for testing
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Mock task created successfully",
        task_id: "mock_" + Date.now()
      })
    };
  } catch (error) {
    console.error("Error in image generation function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.toString(),
        stack: error.stack
      })
    };
  }
};