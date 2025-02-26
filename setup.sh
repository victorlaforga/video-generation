#!/bin/bash

# Create directory structure
mkdir -p netlify/functions

# Create package.json
cat > package.json << 'EOF'
{
  "name": "kling-ai-interface",
  "version": "1.0.0",
  "description": "Interface for Kling AI image and video generation",
  "main": "index.html",
  "scripts": {
    "start": "netlify dev",
    "serve": "serve ."
  },
  "dependencies": {
    "file-type": "^16.5.4",
    "form-data": "^4.0.0",
    "jsonwebtoken": "^9.0.0",
    "multiparty": "^4.2.3",
    "node-fetch": "^2.6.7"
  },
  "devDependencies": {
    "netlify-cli": "^12.0.0",
    "serve": "^14.0.0"
  }
}
EOF

# Create netlify.toml
cat > netlify.toml << 'EOF'
[build]
  command = "# no build command needed"
  publish = "."

[dev]
  command = "npx serve"
  port = 8888
  publish = "."

[functions]
  directory = "netlify/functions"
EOF

echo "Project structure created successfully!"