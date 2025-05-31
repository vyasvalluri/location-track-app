// A simple Node.js script to test the surveyor status endpoint
const http = require('http');

function testStatusEndpoint() {
  console.log('Testing surveyor status API endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 6060,
    path: '/api/surveyors/status',
    method: 'GET'
  };

  const req = http.request(options, res => {
    console.log(`Status code: ${res.statusCode}`);

    if (res.statusCode !== 200) {
      console.error(`Error: API returned status code ${res.statusCode}`);
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    
    res.on('data', (chunk) => { rawData += chunk; });
    
    res.on('end', () => {
      try {
        const statuses = JSON.parse(rawData);
        console.log('Successfully received surveyor statuses:');
        console.log(JSON.stringify(statuses, null, 2));
      } catch (e) {
        console.error('Failed to parse response:', e.message);
      }
    });
  });

  req.on('error', error => {
    console.error('Error connecting to API:', error.message);
  });

  req.end();
}

// Test updating a surveyor's activity (assuming there's at least one surveyor with ID '1')
function testUpdateActivity() {
  console.log('Testing update activity endpoint...');

  const options = {
    hostname: 'localhost',
    port: 6060,
    path: '/api/surveyors/1/activity',
    method: 'POST'
  };

  const req = http.request(options, res => {
    console.log(`Status code (update activity): ${res.statusCode}`);
    
    if (res.statusCode !== 200) {
      console.error(`Error: Activity update API returned status code ${res.statusCode}`);
    } else {
      console.log('Successfully updated surveyor activity');
      
      // Re-check the status after updating activity
      setTimeout(testStatusEndpoint, 1000);
    }
  });

  req.on('error', error => {
    console.error('Error connecting to update activity API:', error.message);
  });

  req.end();
}

// Run tests
setTimeout(() => {
  testStatusEndpoint();
  
  // Update activity for a surveyor after 2 seconds
  setTimeout(testUpdateActivity, 2000);
}, 1000);
