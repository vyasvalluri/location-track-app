// Simple Node.js script to test API connectivity
const http = require('http');
const fs = require('fs');
const path = require('path');

// Read port configuration from config.js or use default values
let BACKEND_PORT = 6060;
let FRONTEND_PORT = 3000;

// Try to read the config from the dashboard project
try {
  const configFile = path.join(__dirname, 'surveyor-tracking-dashboard/src/config.js');
  if (fs.existsSync(configFile)) {
    const configContent = fs.readFileSync(configFile, 'utf8');
    // Extract BACKEND_API port
    const backendPortMatch = configContent.match(/BACKEND_API:\s*(\d+)/);
    if (backendPortMatch && backendPortMatch[1]) {
      BACKEND_PORT = parseInt(backendPortMatch[1]);
    }
    // Extract FRONTEND port
    const frontendPortMatch = configContent.match(/FRONTEND:\s*(\d+)/);
    if (frontendPortMatch && frontendPortMatch[1]) {
      FRONTEND_PORT = parseInt(frontendPortMatch[1]);
    }
  }
} catch (error) {
  console.warn('Unable to read config file, using default ports', error.message);
}

const testEndpoint = (url) => {
  console.log(`Testing endpoint: ${url}`);
  
  const options = new URL(url);
  
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('Response data:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('Raw response data:', data);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });
  
  req.end();
};

// Test local endpoints
console.log("=== TESTING LOCAL ENDPOINTS ===");
console.log(`Using backend port: ${BACKEND_PORT}`);
testEndpoint(`http://localhost:${BACKEND_PORT}/actuator/health`);
setTimeout(() => testEndpoint(`http://localhost:${BACKEND_PORT}/api/surveyors`), 1000);

// Remote endpoint testing removed - using localhost only
