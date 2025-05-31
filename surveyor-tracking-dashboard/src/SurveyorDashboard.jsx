import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SurveyorTrackMap from './SurveyorTrackMap';
import config from './config';
import SurveyorManagementPage from './pages/SurveyorManagementPage';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { FormControl, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SurveyorDashboard = () => {
  const [tab, setTab] = useState(0);
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [surveyors, setSurveyors] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [surveyorId, setSurveyorId] = useState('');
  const [liveTracking, setLiveTracking] = useState(false);
  const [from, setFrom] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
  const [to, setTo] = useState(new Date());
  const [surveyorSearch, setSurveyorSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 🔁 Load filtered surveyors
  const loadSurveyors = useCallback(() => {
    console.log(`Fetching surveyors...`);
    // Use the basic surveyors endpoint which should be more reliable
    fetch(`/api/surveyors`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Surveyors loaded:', data); // Debug: log the returned surveyor data
        console.log(`Loaded ${data.length} surveyors`);
        
        // Filter client-side if needed
        let filteredData = data;
        if (city || project) {
          filteredData = data.filter(surveyor => {
            const matchesCity = !city || (surveyor.city && surveyor.city.toLowerCase().includes(city.toLowerCase()));
            const matchesProject = !project || (surveyor.projectName && surveyor.projectName.toLowerCase().includes(project.toLowerCase()));
            return matchesCity && matchesProject;
          });
        }
        
        // Check what IDs are available in the data
        const ids = filteredData.map(s => s.id);
        console.log('Surveyor IDs:', ids);
        
        // Normalize the IDs to lower case for case-insensitive comparison
        const normalizedData = filteredData.map(surveyor => ({
          ...surveyor,
          normalizedId: surveyor.id ? surveyor.id.toLowerCase() : ''
        }));
        
        setSurveyors(normalizedData);
        if (surveyorId !== 'ALL' && !normalizedData.some(surveyor => 
          surveyor.id && surveyorId && surveyor.id.toLowerCase() === surveyorId.toLowerCase())) {
          setSurveyorId('');
        }
      })
      .catch(err => console.error('Failed to load surveyors:', err));
  }, [city, project, surveyorId]);

  // 🔁 Load online/offline status
  const loadStatus = useCallback(() => {
    console.log('Fetching surveyor status...');
    fetch(`/api/surveyors/status`)
      .then(res => {
        console.log('Status response:', res.status, res.statusText);
        if (!res.ok) {
          // If the endpoint returns 404, use a fallback approach
          if (res.status === 404) {
            console.warn('Status endpoint not available, using fallback method');
            // Fallback: Set all surveyors to online (or use another fallback approach)
            return {};
          }
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Status data received:', data);
        if (data) setStatusMap(data);
      })
      .catch(err => {
        console.error('Failed to load status:', err);
        // On error, don't update the status (keep previous state)
      });
  }, []);

  // 🏁 Initial load + status interval
  useEffect(() => {
    loadSurveyors();
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // every 30 sec
    return () => clearInterval(interval);
  }, [loadSurveyors, loadStatus]);

  // Helper to get all surveyor IDs
  const allSurveyorIds = surveyors
    .map(surveyor => surveyor.id || surveyor.surveyorId || surveyor._id || '')
    .filter(id => !!id);

  // Filter surveyors based on search input
  const filteredSurveyors = useMemo(() => {
    if (!surveyorSearch) return surveyors;
    
    return surveyors.filter(surveyor => {
      const id = surveyor.id || '';
      const name = surveyor.name || surveyor.fullName || surveyor.surveyorName || id;
      const project = surveyor.projectName || '';
      const city = surveyor.city || '';
      
      const searchTerm = surveyorSearch.toLowerCase();
      return (
        id.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm) ||
        project.toLowerCase().includes(searchTerm) ||
        city.toLowerCase().includes(searchTerm)
      );
    });
  }, [surveyors, surveyorSearch]);
  
  // Group surveyors by project for better organization
  const groupedSurveyors = useMemo(() => {
    const groups = {};
    filteredSurveyors.forEach(surveyor => {
      const project = surveyor.projectName || 'Other';
      if (!groups[project]) groups[project] = [];
      groups[project].push(surveyor);
    });
    return groups;
  }, [filteredSurveyors]);

  return (
    <div className="dashboard-bg" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
    }}>
      {/* Main Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
        padding: '1.5rem 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(45deg, #fbbf24 0%, #f59e0b 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)',
              transform: 'rotate(-5deg)'
            }}>
              📍
            </div>
            <div>
              <h1 style={{
                color: '#ffffff',
                fontSize: '2.5rem',
                fontWeight: '800',
                margin: '0',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                Surveyor Tracking Dashboard
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.1rem',
                margin: '0.25rem 0 0 0',
                fontWeight: '400'
              }}>
                Real-time monitoring and management platform
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container" style={{ 
        maxWidth: '1600px', 
        margin: '0 auto', 
        padding: '1.5rem',
        overflow: 'hidden'
      }}>
        {/* Enhanced Tab Navigation */}
        <div style={{ marginBottom: '2rem' }}>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '0.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <Tabs 
              value={tab} 
              onChange={(_, v) => setTab(v)} 
              aria-label="dashboard tabs"
              sx={{
                '& .MuiTab-root': {
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  minHeight: '48px',
                  borderRadius: '8px',
                  margin: '0 0.25rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff'
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(45deg, #3b82f6 0%, #06b6d4 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }
                },
                '& .MuiTabs-indicator': {
                  display: 'none'
                }
              }}
            >
              <Tab label="📊 Dashboard" />
              <Tab label="👥 Surveyor Management" />
            </Tabs>
          </Box>
        </div>

        {/* Main Content */}
        <div style={{ minHeight: 700 }}>
          {tab === 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '1.5rem', 
              alignItems: 'flex-start',
              flexWrap: 'nowrap',
              minHeight: '600px'
            }}>
              {/* Left: Enhanced Controls Panel */}
              <div style={{ 
                flex: '0 0 320px', 
                width: '320px',
                minWidth: 320,
                maxWidth: 320,
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '20px',
                padding: '1.5rem',
                marginBottom: 0,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                height: 'fit-content',
                overflowY: 'auto'
              }}>
                {/* Control Panel Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  borderRadius: '16px',
                  padding: '1.5rem 2rem',
                  marginBottom: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                  <h2 style={{
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    margin: '0',
                    letterSpacing: '0.5px'
                  }}>
                    Control Center
                  </h2>
                  <p style={{
                    fontSize: '0.9rem',
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9
                  }}>
                    Filter and track surveyors
                  </p>
                </div>

                {/* Enhanced Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.95rem'
                    }}>
                      🏙️ City
                    </label>
                    <input
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Mumbai, Delhi, Hyderabad"
                      style={{ 
                        padding: '0.75rem 1rem', 
                        borderRadius: '12px', 
                        border: '2px solid #e5e7eb', 
                        width: '100%',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.95rem'
                    }}>
                      📋 Project
                    </label>
                    <input
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      placeholder="e.g. Smart Survey, Metro Mapping"
                      style={{ 
                        padding: '0.75rem 1rem', 
                        borderRadius: '12px', 
                        border: '2px solid #e5e7eb', 
                        width: '100%',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <button 
                    onClick={loadSurveyors} 
                    style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '12px', 
                      padding: '0.75rem 1.5rem', 
                      fontWeight: '600', 
                      fontSize: '1rem', 
                      cursor: 'pointer', 
                      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.3)';
                    }}
                  >
                    🔍 Apply Filters
                  </button>
                </div>

                {/* Enhanced Surveyor Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Surveyor:</label>
                  
                  {/* Search input for filtering surveyors */}
                  <FormControl fullWidth variant="outlined" style={{ marginBottom: '0.75rem' }}>
                    <TextField
                      placeholder="Search by name, ID, project, or city..."
                      size="small"
                      value={surveyorSearch}
                      onChange={(e) => setSurveyorSearch(e.target.value)}
                      onClick={() => setIsDropdownOpen(true)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon style={{ color: '#6366f1' }} />
                          </InputAdornment>
                        ),
                        style: { 
                          background: 'white', 
                          borderRadius: 8,
                          fontSize: '0.95rem'
                        }
                      }}
                    />
                  </FormControl>
                  
                  {/* Custom styled dropdown */}
                  <div style={{ 
                    position: 'relative',
                    marginBottom: '0.75rem'
                  }}>
                    <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{
                      padding: '0.75rem 1rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white'
                    }}>
                      <div>
                        {surveyorId === 'ALL' ? (
                          <span style={{ fontWeight: 600, color: '#6366f1' }}>All Surveyors</span>
                        ) : surveyorId ? (
                          (() => {
                            const selectedSurveyor = surveyors.find(s => s.id && s.id.toLowerCase() === surveyorId.toLowerCase());
                            const name = selectedSurveyor?.name || surveyorId;
                            const isOnline = selectedSurveyor && Object.keys(statusMap).some(key => 
                              key.toLowerCase() === surveyorId.toLowerCase() && statusMap[key] === 'Online');
                            return (
                              <span>
                                <span style={{ fontWeight: 600 }}>{name}</span>
                                <span style={{ color: '#64748b' }}> ({surveyorId})</span>
                                <span> {isOnline ? '🟢' : '🔴'}</span>
                              </span>
                            );
                          })()
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-- Select a surveyor --</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isDropdownOpen ? '▲' : '▼'}</span>
                    </div>
                    
                    {isDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        zIndex: 10,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        marginTop: '0.25rem'
                      }}>
                        <div style={{ padding: '0.5rem' }}>
                          {/* Quick selections */}
                          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <div 
                              onClick={() => { setSurveyorId(''); setIsDropdownOpen(false); }}
                              style={{ padding: '0.5rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#64748b' }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              None
                            </div>
                            <div 
                              onClick={() => { setSurveyorId('ALL'); setIsDropdownOpen(false); }}
                              style={{ padding: '0.5rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#6366f1' }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              All Surveyors ({surveyors.length})
                            </div>
                          </div>
                          
                          {/* Grouped surveyors by project */}
                          {Object.keys(groupedSurveyors).length > 0 ? (
                            Object.entries(groupedSurveyors).map(([project, projectSurveyors]) => (
                              <div key={project} style={{ marginBottom: '0.75rem' }}>
                                <div style={{ 
                                  padding: '0.25rem 0.75rem', 
                                  backgroundColor: '#f8fafc',
                                  fontWeight: 600, 
                                  fontSize: '0.85rem', 
                                  color: '#64748b',
                                  borderRadius: 6
                                }}>
                                  {project} ({projectSurveyors.length})
                                </div>
                                {projectSurveyors.map(surveyor => {
                                  const id = surveyor.id || surveyor.surveyorId || surveyor._id || '';
                                  const name = surveyor.name || surveyor.fullName || surveyor.surveyorName || id;
                                  const city = surveyor.city || '';
                                  // Get online status in a case-insensitive way
                                  const isOnline = Object.keys(statusMap).some(key => 
                                    key.toLowerCase() === id.toLowerCase() && statusMap[key] === 'Online');
                                  
                                  return (
                                    <div 
                                      key={id}
                                      onClick={() => {
                                        setSurveyorId(id);
                                        setIsDropdownOpen(false);
                                      }}
                                      style={{ 
                                        padding: '0.5rem 0.75rem', 
                                        cursor: 'pointer',
                                        borderRadius: 6,
                                        backgroundColor: surveyorId === id ? '#e0e7ff' : 'transparent'
                                      }}
                                      onMouseOver={(e) => {
                                        if (surveyorId !== id) e.target.style.backgroundColor = '#f1f5f9';
                                      }}
                                      onMouseOut={(e) => {
                                        if (surveyorId !== id) e.target.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                          <span style={{ fontWeight: 600 }}>{name}</span>
                                          <span style={{ color: '#64748b', marginLeft: '0.25rem', fontSize: '0.9rem' }}>({id})</span>
                                        </div>
                                        <span>{isOnline ? '🟢' : '🔴'}</span>
                                      </div>
                                      {city && (
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>
                                          📍 {city}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                              No surveyors match your search
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected surveyor info panel */}
                  {surveyorId && surveyorId !== 'ALL' && (
                    <div style={{ 
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      marginTop: '0.75rem',
                      border: '1px solid #e0e7ff'
                    }}>
                      {(() => {
                        const selectedSurveyor = surveyors.find(s => s.id && s.id.toLowerCase() === surveyorId.toLowerCase());
                        if (selectedSurveyor) {
                          const isOnline = Object.keys(statusMap).some(key => 
                            key.toLowerCase() === surveyorId.toLowerCase() && statusMap[key] === 'Online');
                          
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                                  {selectedSurveyor.name}
                                </span>
                                <span style={{ 
                                  backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', 
                                  color: isOnline ? '#166534' : '#b91c1c',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                              </div>
                              
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '80px 1fr',
                                rowGap: '0.5rem',
                                fontSize: '0.85rem',
                                color: '#334155'
                              }}>
                                <div style={{ fontWeight: 600 }}>ID:</div>
                                <div>{selectedSurveyor.id}</div>
                                
                                <div style={{ fontWeight: 600 }}>Project:</div>
                                <div>{selectedSurveyor.projectName || 'N/A'}</div>
                                
                                <div style={{ fontWeight: 600 }}>City:</div>
                                <div>{selectedSurveyor.city || 'N/A'}</div>
                              </div>
                            </>
                          );
                        }
                        return <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading surveyor details...</div>;
                      })()}
                    </div>
                  )}
                </div>

                {/* Enhanced Date Range Pickers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.95rem'
                    }}>
                      📅 From Date & Time
                    </label>
                    <DatePicker
                      selected={from}
                      onChange={date => setFrom(date)}
                      showTimeSelect
                      dateFormat="MMM dd, yyyy h:mm aa"
                      className="date-picker"
                      placeholderText="Select start date and time"
                    />
                  </div>
                  <div>
                    <label style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      display: 'block',
                      color: '#374151',
                      fontSize: '0.95rem'
                    }}>
                      📅 To Date & Time
                    </label>
                    <DatePicker
                      selected={to}
                      onChange={date => setTo(date)}
                      showTimeSelect
                      dateFormat="MMM dd, yyyy h:mm aa"
                      className="date-picker"
                      placeholderText="Select end date and time"
                    />
                  </div>
                </div>

                {/* Enhanced Live Tracking Toggle */}
                <div style={{ 
                  marginBottom: '2rem',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(99, 102, 241, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ 
                        fontWeight: '700', 
                        color: '#1e293b',
                        fontSize: '1rem',
                        marginBottom: '0.25rem'
                      }}>
                        ⚡ Live Tracking
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#64748b' 
                      }}>
                        Real-time location updates
                      </div>
                    </div>
                    <label style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      gap: '0.75rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={liveTracking}
                        onChange={e => setLiveTracking(e.target.checked)}
                        style={{ 
                          accentColor: '#6366f1', 
                          width: 24, 
                          height: 24,
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ 
                        color: liveTracking ? '#6366f1' : '#64748b', 
                        fontWeight: 700,
                        fontSize: '1rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '8px',
                        background: liveTracking ? 'rgba(99, 102, 241, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        border: `1px solid ${liveTracking ? 'rgba(99, 102, 241, 0.2)' : 'rgba(100, 116, 139, 0.2)'}`
                      }}>
                        {liveTracking ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              {/* Right: Enhanced Map */}
              <div className="card map-container" style={{ 
                flex: '1', 
                minWidth: 400, 
                width: 'calc(100% - 340px)',
                height: '600px',
                padding: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'stretch',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '1.5rem 2rem', 
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem' 
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>🗺️</div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>Live Tracking Map</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Real-time surveyor locations</div>
                    </div>
                  </div>
                  {surveyorId === 'ALL' && (
                    <div style={{ 
                      background: 'linear-gradient(45deg, #6366f1 0%, #8b5cf6 100%)', 
                      color: '#ffffff',
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>👥</span>
                      {allSurveyorIds.length} Surveyors
                    </div>
                  )}
                </div>
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: '500px',
                  position: 'relative'
                }}>
                  {(surveyorId && surveyorId !== 'ALL') && (
                    <SurveyorTrackMap
                      surveyorIds={[surveyorId]}
                      from={from.toISOString()}
                      to={to.toISOString()}
                      liveTracking={liveTracking}
                    />
                  )}
                  {surveyorId === 'ALL' && allSurveyorIds.length > 0 && (
                    <SurveyorTrackMap
                      surveyorIds={allSurveyorIds}
                      from={from.toISOString()}
                      to={to.toISOString()}
                      liveTracking={liveTracking}
                    />
                  )}
                  {(!surveyorId || (surveyorId === 'ALL' && allSurveyorIds.length === 0)) && (
                    <div style={{ 
                      padding: '4rem 2rem', 
                      textAlign: 'center',
                      color: '#64748b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
                      borderRadius: '16px',
                      margin: '2rem',
                      border: '2px dashed #cbd5e1'
                    }}>
                      <div style={{ 
                        fontSize: '4rem',
                        background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>🎯</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                          Ready to Track
                        </div>
                        <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                          Select a surveyor from the control panel<br />
                          to view their real-time location data
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}>
                        💡 Tip: Use "All Surveyors" to see everyone at once
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === 1 && (
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                color: '#fff',
                borderRadius: '16px',
                padding: '1.5rem 2rem',
                marginBottom: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <h2 style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  margin: '0',
                  letterSpacing: '0.5px'
                }}>
                  Surveyor Management
                </h2>
                <p style={{
                  fontSize: '0.9rem',
                  margin: '0.5rem 0 0 0',
                  opacity: 0.9
                }}>
                  Add, edit, and manage surveyor profiles
                </p>
              </div>
              <SurveyorManagementPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyorDashboard;
