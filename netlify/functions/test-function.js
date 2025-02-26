// netlify/functions/test-function.js
exports.handler = async function(event, context) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Test function is working!",
        event: {
          httpMethod: event.httpMethod,
          headers: event.headers,
          queryStringParameters: event.queryStringParameters,
          body: event.body ? (event.isBase64Encoded ? "(base64 encoded)" : event.body.slice(0, 100) + "...") : null,
          isBase64Encoded: event.isBase64Encoded
        }
      })
    };
  };