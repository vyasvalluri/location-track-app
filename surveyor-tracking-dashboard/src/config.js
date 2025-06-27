
// Get port from environment or use default
const getEnvPort = (defaultPort) => {
  if (process.env.REACT_APP_PORT_CONFIG) {
    try {
      const config = JSON.parse(process.env.REACT_APP_PORT_CONFIG);
      return config[defaultPort] || defaultPort;
    } catch (e) {
      console.warn('Could not parse port configuration from environment');
    }
  }
  return defaultPort;
};

// Centralized port configuration
const PORTS = {
  // Backend API port
  BACKEND_API: getEnvPort(6565),
  // Frontend port
  FRONTEND: getEnvPort(9898),
  // Database port if needed
  DATABASE: getEnvPort(5432)
};

const config = {
  // Base URLs constructed using the port configuration
  backendHost: `http://183.82.114.29:${PORTS.BACKEND_API}`,
  frontendHost: `http://183.82.114.29:${PORTS.FRONTEND}`,
  
  // WebSocket related URLs - SockJS expects HTTP/HTTPS, not ws://
  webSocketUrl: `http://183.82.114.29:${PORTS.BACKEND_API}/ws/location`,
  
  // Export ports for direct access when needed
  ports: PORTS,
  
  // Error handling helper function
  handleFetchError: (error, endpoint) => {
    console.error(`Error fetching from ${endpoint}:`, error);
    // Add more detailed logging for network issues
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('Network error - Check if backend server is running and accessible');
      console.error('Backend URL:', config.backendHost);
    }
    return error;
  }
};

export default config;