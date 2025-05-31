import React, { useState, useEffect } from 'react';
import { TextField, Button, Paper, Typography, InputAdornment, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const SurveyorForm = ({ onSave, selected }) => {
  const [form, setForm] = useState({ id: '', name: '', city: '', projectName: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (selected) {
      setForm(selected);
    } else {
      setForm({ id: '', name: '', city: '', projectName: '', username: '', password: '' });
    }
  }, [selected]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    let finalForm = { ...form };
    // Improved cascading logic for projectName
    if (!finalForm.projectName) {
      finalForm.projectName =
        form.projectName ||
        form.project ||
        form.Project ||
        form.project_name ||
        (selected && (selected.projectName || selected.project || selected.Project || selected.project_name)) ||
        '';
    }
    
    // Check if username is available when creating a new surveyor
    const checkUsername = !selected || selected.username !== form.username;
    
    if (finalForm.id && finalForm.name) {
      // If creating a new user or updating username, check if username is available
      if (checkUsername && finalForm.username) {
        // Import config to get the backend host
        import('../config').then(module => {
          const config = module.default;
          fetch(`${config.backendHost}/api/surveyors/check-username?username=${encodeURIComponent(finalForm.username)}`)
            .then(res => res.json())
            .then(data => {
              if (data.available) {
                saveSurveyor(finalForm);
              } else {
                alert('Username is already taken. Please choose another.');
              }
            });
        });
      } else {
        saveSurveyor(finalForm);
      }
    }
  };
  
  const saveSurveyor = (finalForm) => {
    // Import config to get the backend host
    import('../config').then(module => {
      const config = module.default;
      fetch(`${config.backendHost}/api/surveyors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalForm),
      })
        .then(res => res.json())
        .then(data => {
          onSave();
          setForm({ id: '', name: '', city: '', projectName: '', username: '', password: '' });
        });
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Paper style={{ padding: 16, marginBottom: 20 }}>
      <Typography variant="h6">Add/Update Surveyor</Typography>
      <TextField label="ID" name="id" value={form.id} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Project" name="projectName" value={form.projectName} onChange={handleChange} fullWidth margin="normal" />
      
      {/* Authentication Fields */}
      <Typography variant="subtitle1" style={{ marginTop: 20, marginBottom: 10 }}>Authentication Details</Typography>
      <TextField 
        label="Username" 
        name="username" 
        value={form.username} 
        onChange={handleChange} 
        fullWidth 
        margin="normal" 
      />
      <TextField 
        label="Password" 
        name="password" 
        type={showPassword ? "text" : "password"} 
        value={form.password} 
        onChange={handleChange} 
        fullWidth 
        margin="normal" 
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={togglePasswordVisibility} edge="end">
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleSubmit} 
        style={{ marginTop: 16 }}
      >
        Save
      </Button>
    </Paper>
  );
};

export default SurveyorForm;
