const config = {
  // Set backend host to localhost only
  backendHost: 'http://localhost:6060',
  
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