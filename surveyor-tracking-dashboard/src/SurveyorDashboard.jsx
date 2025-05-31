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
    let query = [];
    if (city) query.push(`city=${encodeURIComponent(city)}`);
    if (project) query.push(`project=${encodeURIComponent(project)}`);
    const q = query.length > 0 ? '?' + query.join('&') : '';

    console.log(`Fetching surveyors with query: ${q}`);
    fetch(`${config.backendHost}/api/surveyors/filter${q}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Surveyors loaded:', data); // Debug: log the returned surveyor data
        console.log(`Loaded ${data.length} surveyors`);
        
        // Check what IDs are available in the data
        const ids = data.map(s => s.id);
        console.log('Surveyor IDs:', ids);
        
        // Normalize the IDs to lower case for case-insensitive comparison
        const normalizedData = data.map(surveyor => ({
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
    fetch(`${config.backendHost}/api/surveyors/status`)
      .then(res => res.json())
      .then(data => setStatusMap(data))
      .catch(err => console.error('Failed to load status:', err));
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
    <div className="dashboard-bg" style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #e0e7ff 0%, #f8fafc 60%, #dbeafe 100%)', padding: '2rem 0' }}>
      <div className="dashboard-container">
        {/* Main Content */}
        <div style={{ minHeight: 700 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: '2rem' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="dashboard tabs">
              <Tab label="Dashboard" />
              <Tab label="Surveyor Management" />
            </Tabs>
          </Box>
          {tab === 0 && (
            <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
              {/* Left: Controls */}
              <div className="card" style={{ flex: '0 0 350px', minWidth: 300, padding: '2rem 1.5rem', marginBottom: 0 }}>
                <div style={{ background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', color: '#fff', borderRadius: '12px', padding: '1.2rem 2rem', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px', boxShadow: '0 2px 8px rgba(99,102,241,0.08)', textAlign: 'center' }}>
                  📍 Surveyor Tracking Dashboard
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontWeight: 500, marginRight: 6 }}>City:</label>
                    <input
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 120, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, marginRight: 6 }}>Project:</label>
                    <input
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      placeholder="e.g. Smart Survey"
                      style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 120, width: '100%' }}
                    />
                  </div>
                  <button onClick={loadSurveyors} style={{ background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.3rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>
                    🔍 Filter
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

                {/* Date Range Pickers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontWeight: 500, marginRight: 8 }}>From:</label>
                    <DatePicker
                      selected={from}
                      onChange={date => setFrom(date)}
                      showTimeSelect
                      dateFormat="Pp"
                      className="date-picker"
                      style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '0.5rem 0.8rem', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 500, marginRight: 8 }}>To:</label>
                    <DatePicker
                      selected={to}
                      onChange={date => setTo(date)}
                      showTimeSelect
                      dateFormat="Pp"
                      className="date-picker"
                      style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '0.5rem 0.8rem', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Live Tracking Toggle */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ fontWeight: 500, marginRight: 8 }}>Enable Live Tracking</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={liveTracking}
                      onChange={e => setLiveTracking(e.target.checked)}
                      style={{ accentColor: '#6366f1', width: 22, height: 22, marginRight: 8 }}
                    />
                    <span style={{ color: liveTracking ? '#6366f1' : '#64748b', fontWeight: 600 }}>{liveTracking ? 'ON' : 'OFF'}</span>
                  </label>
                </div>
              </div>
              {/* Right: Map */}
              <div className="card" style={{ flex: 1, minWidth: 400, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #e0e7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#334155' }}>Tracking Map</div>
                  {surveyorId === 'ALL' && (
                    <div style={{ 
                      backgroundColor: '#e0e7ff', 
                      color: '#4338ca',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {allSurveyorIds.length} Surveyors
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      padding: '2rem', 
                      textAlign: 'center',
                      color: '#64748b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{ fontSize: '3rem' }}>🗺️</div>
                      <div style={{ fontWeight: 600 }}>No Surveyors Selected</div>
                      <div style={{ fontSize: '0.9rem' }}>Select a surveyor to see their tracking data</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === 1 && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <SurveyorManagementPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyorDashboard;
