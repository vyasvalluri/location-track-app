// This script helps setup the port configuration for the project
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the config.sh file
const configShPath = path.join(__dirname, '..', 'deploy', 'config.sh');
// Path to the config.js file in the src directory
const configJsPath = path.join(__dirname, '..', 'src', 'config.js');

// Function to read port values from config.sh
function readConfigSh() {
  console.log('Reading configuration from config.sh');
  try {
    if (!fs.existsSync(configShPath)) {
      console.error('Config file not found:', configShPath);
      return null;
    }
    
    const configContent = fs.readFileSync(configShPath, 'utf8');
    
    // Extract port values
    const backendPortMatch = configContent.match(/BACKEND_PORT=(\d+)/);
    const frontendPortMatch = configContent.match(/FRONTEND_PORT=(\d+)/);
    const databasePortMatch = configContent.match(/DATABASE_PORT=(\d+)/);
    
    const backendPort = backendPortMatch ? backendPortMatch[1] : '6060';
    const frontendPort = frontendPortMatch ? frontendPortMatch[1] : '3000';
    const databasePort = databasePortMatch ? databasePortMatch[1] : '5433';
    
    return { backendPort, frontendPort, databasePort };
  } catch (error) {
    console.error('Error reading config file:', error);
    return null;
  }
}

// Function to update config.js with port values
function updateConfigJs(ports) {
  console.log('Updating config.js with values:', ports);
  
  try {
    if (!fs.existsSync(configJsPath)) {
      console.error('Config.js file not found:', configJsPath);
      return false;
    }
    
    // Read the existing config.js
    let configJsContent = fs.readFileSync(configJsPath, 'utf8');
    
    // Update the port values
    configJsContent = configJsContent.replace(/BACKEND_API:\s*\d+/, `BACKEND_API: ${ports.backendPort}`);
    configJsContent = configJsContent.replace(/FRONTEND:\s*\d+/, `FRONTEND: ${ports.frontendPort}`);
    configJsContent = configJsContent.replace(/DATABASE:\s*\d+/, `DATABASE: ${ports.databasePort}`);
    
    // Write the updated content
    fs.writeFileSync(configJsPath, configJsContent, 'utf8');
    console.log('Successfully updated config.js');
    return true;
  } catch (error) {
    console.error('Error updating config.js:', error);
    return false;
  }
}

// Main function
function main() {
  console.log('Setting up port configuration...');
  
  let ports = readConfigSh();
  
  if (!ports) {
    console.log('Using default port values');
    ports = { backendPort: '6060', frontendPort: '3000', databasePort: '5433' };
  }
  
  const success = updateConfigJs(ports);
  
  if (success) {
    console.log('Configuration completed successfully');
    console.log(`Backend API will run on port ${ports.backendPort}`);
    console.log(`Frontend will run on port ${ports.frontendPort}`);
    console.log(`Database connection on port ${ports.databasePort}`);
  } else {
    console.error('Configuration failed');
  }
}

// Run the main function
main();
