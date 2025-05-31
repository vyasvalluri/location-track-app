// Simple Node.js script to test API connectivity
const http = require('http');

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
testEndpoint('http://localhost:6060/actuator/health');
setTimeout(() => testEndpoint('http://localhost:6060/api/surveyors'), 1000);

// Remote endpoint testing removed - using localhost only
