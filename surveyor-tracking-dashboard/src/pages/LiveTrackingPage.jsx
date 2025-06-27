import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FormControl, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SurveyorTrackMap from '../SurveyorTrackMap';
import config from '../config';

const LiveTrackingPage = () => {
  const [surveyors, setSurveyors] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [surveyorId, setSurveyorId] = useState('');
  
  // Debug: Log surveyorId changes
  useEffect(() => {
    console.log('🔄 LiveTrackingPage - surveyorId changed to:', surveyorId);
  }, [surveyorId]);
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [surveyorSearch, setSurveyorSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load surveyors
  const loadSurveyors = useCallback(() => {
    console.log('Fetching surveyors for live tracking...');
    fetch(`${config.backendHost}/api/surveyors`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Live tracking - surveyors loaded:', data);
        
        // Filter client-side if needed
        let filteredData = data;
        if (city || project) {
          filteredData = data.filter(surveyor => {
            const matchesCity = !city || (surveyor.city && surveyor.city.toLowerCase().includes(city.toLowerCase()));
            const matchesProject = !project || (surveyor.projectName && surveyor.projectName.toLowerCase().includes(project.toLowerCase()));
            return matchesCity && matchesProject;
          });
        }
        
        // Normalize the IDs for case-insensitive comparison
        const normalizedData = filteredData.map(surveyor => ({
          ...surveyor,
          normalizedId: surveyor.id ? surveyor.id.toLowerCase() : ''
        }));
        
        setSurveyors(normalizedData);
        
        // Auto-select first online surveyor if available
        if (!surveyorId && normalizedData.length > 0) {
          const firstSurveyor = normalizedData[0];
          console.log('Auto-selecting first surveyor for live tracking:', firstSurveyor.id);
          setSurveyorId(firstSurveyor.id);
        }
      })
      .catch(err => console.error('Failed to load surveyors for live tracking:', err));
  }, [city, project, surveyorId]);

  // Load online/offline status
  const loadStatus = useCallback(() => {
    console.log('Fetching surveyor status for live tracking...');
    fetch(`${config.backendHost}/api/surveyors/status`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            console.warn('Status endpoint not available, using fallback method');
            return {};
          }
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Live tracking - status data received:', data);
        if (data) setStatusMap(data);
      })
      .catch(err => {
        console.error('Failed to load status for live tracking:', err);
      });
  }, []);

  // Initial load + status interval for live tracking
  useEffect(() => {
    loadSurveyors();
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // every 10 sec for live tracking
    return () => clearInterval(interval);
  }, [loadSurveyors, loadStatus]);

  // Helper to get all surveyor IDs (memoized to prevent unnecessary re-renders)
  const allSurveyorIds = useMemo(() => {
    return surveyors
      .map(surveyor => surveyor.id || surveyor.surveyorId || surveyor._id || '')
      .filter(id => !!id);
  }, [surveyors]);

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

  // Group surveyors by project
  const groupedSurveyors = useMemo(() => {
    const groups = {};
    filteredSurveyors.forEach(surveyor => {
      const project = surveyor.projectName || 'Other';
      if (!groups[project]) groups[project] = [];
      groups[project].push(surveyor);
    });
    return groups;
  }, [filteredSurveyors]);

  // Get current time for live tracking
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // Last hour for live view

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>📍</div>
          <div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Live Tracking
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: '0.25rem 0 0 0',
              fontWeight: '500'
            }}>
              Real-time locations & movement
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', gap: '2rem', height: '700px' }}>
            {/* Left: Live Tracking Controls */}
            <div style={{ 
              width: '320px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              paddingRight: '1rem',
              borderRight: '1px solid rgba(99, 102, 241, 0.1)'
            }}>
              {/* Live Status Header */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                color: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  margin: '0',
                  letterSpacing: '0.5px'
                }}>
                  Live Control
                </h2>
                <p style={{
                  fontSize: '0.9rem',
                  margin: '0.5rem 0 0 0',
                  opacity: 0.9
                }}>
                  Real-time tracking active
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    placeholder="Filter by city"
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
                    placeholder="Filter by project"
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
                    transition: 'all 0.3s ease'
                  }}
                >
                  🔍 Apply Filters
                </button>
              </div>

              {/* Surveyor Selector */}
              <div>
                <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Live Tracking:</label>
                
                {/* Search input */}
                <FormControl fullWidth variant="outlined" style={{ marginBottom: '0.75rem' }}>
                  <TextField
                    placeholder="Search surveyors..."
                    size="small"
                    value={surveyorSearch}
                    onChange={(e) => setSurveyorSearch(e.target.value)}
                    onClick={() => setIsDropdownOpen(true)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon style={{ color: '#10b981' }} />
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
                
                {/* Dropdown */}
                <div style={{ position: 'relative' }}>
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
                        <span style={{ fontWeight: 600, color: '#10b981' }}>All Surveyors (Live)</span>
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
                        <span style={{ color: '#94a3b8' }}>-- Select for live tracking --</span>
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
                      maxHeight: '300px',
                      overflowY: 'auto',
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      zIndex: 10,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      marginTop: '0.25rem'
                    }}>
                      <div style={{ padding: '0.5rem' }}>
                        {/* Quick selections */}
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                          <div 
                            onClick={() => { 
                              console.log('🔄 Dropdown: Setting surveyorId to ALL');
                              setSurveyorId('ALL'); 
                              setIsDropdownOpen(false); 
                            }}
                            style={{ padding: '0.5rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#10b981' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f0fdf4'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            🔴 All Surveyors Live ({surveyors.length})
                          </div>
                        </div>
                        
                        {/* Individual surveyors */}
                        {Object.keys(groupedSurveyors).length > 0 ? (
                          Object.entries(groupedSurveyors).map(([project, projectSurveyors]) => (
                            <div key={project} style={{ marginBottom: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.75rem', 
                                backgroundColor: '#f0fdf4',
                                fontWeight: 600, 
                                fontSize: '0.85rem', 
                                color: '#166534',
                                borderRadius: 6
                              }}>
                                {project} ({projectSurveyors.length})
                              </div>
                              {projectSurveyors.map(surveyor => {
                                const id = surveyor.id || '';
                                const name = surveyor.name || surveyor.fullName || id;
                                const city = surveyor.city || '';
                                const isOnline = Object.keys(statusMap).some(key => 
                                  key.toLowerCase() === id.toLowerCase() && statusMap[key] === 'Online');
                                
                                return (
                                  <div 
                                    key={id}
                                    onClick={() => {
                                      console.log('🔄 Dropdown: Setting surveyorId to', id);
                                      setSurveyorId(id);
                                      setIsDropdownOpen(false);
                                    }}
                                    style={{ 
                                      padding: '0.5rem 0.75rem', 
                                      cursor: 'pointer',
                                      borderRadius: 6,
                                      backgroundColor: surveyorId === id ? '#dcfce7' : 'transparent'
                                    }}
                                    onMouseOver={(e) => {
                                      if (surveyorId !== id) e.target.style.backgroundColor = '#f8fafc';
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
                            No surveyors available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Status Indicator */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                color: 'white',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔴</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>LIVE TRACKING</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Updates every 10 seconds</div>
              </div>
            </div>

            {/* Right: Live Map */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '700px',
              background: '#f8fafc',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                padding: '1.5rem 2rem', 
                borderBottom: '1px solid rgba(16, 185, 129, 0.1)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem' 
                }}>
                  <div style={{ fontSize: '1.5rem' }}>🗺️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.1rem' }}>Live Tracking Map</div>
                    <div style={{ fontSize: '0.85rem', color: '#16a34a' }}>Real-time positions • Auto-refresh</div>
                  </div>
                </div>
                {surveyorId === 'ALL' && (
                  <div style={{ 
                    background: 'linear-gradient(45deg, #10b981 0%, #34d399 100%)', 
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>🔴</span>
                    {allSurveyorIds.length} Live
                  </div>
                )}
              </div>
              
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                minHeight: '600px'
              }}>
                {(surveyorId && surveyorId !== 'ALL') && (
                  <>
                    {console.log('🗺️ Rendering individual surveyor map for:', surveyorId)}
                    <SurveyorTrackMap
                      key={`individual-${surveyorId}`}
                      surveyorIds={[surveyorId]}
                      from={oneHourAgo.toISOString()}
                      to={now.toISOString()}
                      liveTracking={true}
                    />
                  </>
                )}
                {surveyorId === 'ALL' && allSurveyorIds.length > 0 && (
                  <>
                    {console.log('🗺️ Rendering ALL surveyors map for:', allSurveyorIds)}
                    <SurveyorTrackMap
                      key={`all-${allSurveyorIds.join('-')}`}
                      surveyorIds={allSurveyorIds}
                      from={oneHourAgo.toISOString()}
                      to={now.toISOString()}
                      liveTracking={true}
                    />
                  </>
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
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: '16px',
                    margin: '2rem',
                    border: '2px dashed #bbf7d0'
                  }}>
                    <div style={{ 
                      fontSize: '4rem',
                      background: 'linear-gradient(45deg, #10b981, #34d399)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>📍</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#166534', marginBottom: '0.5rem' }}>
                        Ready for Live Tracking
                      </div>
                      <div style={{ fontSize: '1rem', lineHeight: '1.5', color: '#16a34a' }}>
                        Select a surveyor to start<br />
                        real-time location monitoring
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#16a34a',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      🔴 Auto-updates every 10 seconds
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
