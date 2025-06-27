import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box, 
  InputAdornment, 
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

const Login = ({ onLogin, onCancel }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      // Import config dynamically to avoid circular dependencies
      const config = await import('../config').then(module => module.default);
      console.log('Attempting login with backend at:', config.backendHost);
      const response = await fetch(`${config.backendHost}/api/surveyors/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit', // Don't send credentials 
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        onLogin(data.surveyor);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' }}
    >
      <Paper 
        elevation={4} 
        sx={{ 
          p: 4, 
          maxWidth: 400, 
          width: '100%',
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(99,102,241,0.15)'
        }}
      >
        <Typography 
          variant="h5" 
          align="center" 
          sx={{ 
            mb: 3, 
            fontWeight: 600, 
            color: '#6366f1'
          }}
        >
          Surveyor Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            name="username"
            value={credentials.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => setShowPassword(!showPassword)} 
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Box mt={3} display="flex" justifyContent="space-between">
            {onCancel && (
              <Button 
                variant="outlined" 
                color="inherit" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            
            <Button 
              type="submit"
              variant="contained" 
              color="primary"
              fullWidth={!onCancel}
              disabled={loading}
              sx={{ ml: onCancel ? 1 : 0 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Login'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
