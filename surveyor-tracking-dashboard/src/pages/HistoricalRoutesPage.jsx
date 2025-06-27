import React, { useState, useCallback, useMemo, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FormControl, InputAdornment, TextField, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SurveyorTrackMap from '../SurveyorTrackMap';
import config from '../config';
import { getTracingService } from '../tracing';

const HistoricalRoutesPage = () => {
  const [surveyors, setSurveyors] = useState([]);
  const [surveyorId, setSurveyorId] = useState('');
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [surveyorSearch, setSurveyorSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [from, setFrom] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
  const [to, setTo] = useState(new Date());
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [showMap, setShowMap] = useState(false); // New state to control map visibility

  // Get OpenTelemetry tracing service
  const tracingService = getTracingService();

  // Load surveyors (only when needed, not automatically)
  const loadSurveyors = useCallback(() => {
    console.log('🏛️ Loading surveyors for historical routes...');
    
    const fetchSpan = tracingService.traceDataFetch('surveyors-list', {
      'filter.city': city || 'none',
      'filter.project': project || 'none'
    });
    
    fetch(`${config.backendHost}/api/surveyors`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('🏛️ Historical routes - surveyors loaded:', data.length, 'surveyors');
        
        // Filter client-side if needed
        let filteredData = data;
        if (city || project) {
          filteredData = data.filter(surveyor => {
            const matchesCity = !city || (surveyor.city && surveyor.city.toLowerCase().includes(city.toLowerCase()));
            const matchesProject = !project || (surveyor.projectName && surveyor.projectName.toLowerCase().includes(project.toLowerCase()));
            return matchesCity && matchesProject;
          });
          console.log(`🏛️ Filtered to ${filteredData.length} surveyors based on city/project filters`);
        }
        
        // Normalize the IDs for case-insensitive comparison
        const normalizedData = filteredData.map(surveyor => ({
          ...surveyor,
          normalizedId: surveyor.id ? surveyor.id.toLowerCase() : ''
        }));
        
        setSurveyors(normalizedData);
        console.log('🏛️ Historical routes surveyors state updated');
        
        fetchSpan.end(true, normalizedData.length);
      })
      .catch(err => {
        console.error('🏛️ Failed to load surveyors for historical routes:', err);
        fetchSpan.end(false, 0, err);
      });
  }, [city, project, tracingService]);

  // Fetch route data manually when button is clicked
  const fetchRouteData = useCallback(() => {
    if (!surveyorId || surveyorId === 'ALL') {
      alert('Please select a specific surveyor to view historical routes.');
      return;
    }

    console.log('🏛️ User clicked Fetch Historical Route button');
    
    const routeSpan = tracingService.traceRouteOperation('historical-fetch', {
      'surveyor.id': surveyorId,
      'route.start_time': from.toISOString(),
      'route.end_time': to.toISOString(),
      'route.type': 'historical'
    });
    
    setIsLoading(true);
    setLastFetchTime(new Date());
    setShowMap(false); // Hide map during loading
    
    console.log('🏛️ Fetching historical route data for:', surveyorId, 'from:', from, 'to:', to);
    
    // Set route data to trigger map refresh
    const newRouteData = {
      surveyorId,
      from: from.toISOString(),
      to: to.toISOString(),
      timestamp: Date.now()
    };
    
    setRouteData(newRouteData);
    
    // Simulate loading time for better UX, then show map
    setTimeout(() => {
      setIsLoading(false);
      setShowMap(true); // Show map after loading
      console.log('🏛️ Historical route data ready, showing map');
      
      routeSpan.end(true);
    }, 1000);
  }, [surveyorId, from, to, tracingService]);

  // Clear route data and hide map
  const clearRouteData = useCallback(() => {
    console.log('🏛️ Clearing route data and hiding map');
    setRouteData(null);
    setShowMap(false);
    setIsLoading(false);
  }, []);

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

  // Load surveyors on component mount
  useEffect(() => {
    console.log('🏛️ HistoricalRoutesPage mounted - loading surveyors automatically');
    loadSurveyors();
  }, [loadSurveyors]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
          <div style={{ fontSize: '2rem' }}>🛣️</div>
          <div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: '0',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Historical Routes
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: '0.25rem 0 0 0',
              fontWeight: '500'
            }}>
              Route analysis & movement patterns
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
          <div style={{ display: 'flex', gap: '2rem', height: '850px' }}>
            {/* Left: Historical Analysis Controls */}
            <div style={{ 
              width: '320px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              paddingRight: '1rem',
              borderRight: '1px solid rgba(245, 158, 11, 0.1)'
            }}>
              {/* Historical Analysis Header */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
                <h2 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  margin: '0',
                  letterSpacing: '0.3px'
                }}>
                  Route Analysis
                </h2>
                <p style={{
                  fontSize: '0.8rem',
                  margin: '0.25rem 0 0 0',
                  opacity: 0.9
                }}>
                  Manual fetch • No auto-refresh
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
                  🔍 Load Surveyors
                </button>
              </div>

              {/* Surveyor Selector */}
              <div>
                <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Select Surveyor:</label>
                
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
                          <SearchIcon style={{ color: '#f59e0b' }} />
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
                      {surveyorId ? (
                        (() => {
                          const selectedSurveyor = surveyors.find(s => s.id && s.id.toLowerCase() === surveyorId.toLowerCase());
                          const name = selectedSurveyor?.name || surveyorId;
                          return (
                            <span>
                              <span style={{ fontWeight: 600 }}>{name}</span>
                              <span style={{ color: '#64748b' }}> ({surveyorId})</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-- Select surveyor for analysis --</span>
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
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      marginTop: '0.25rem'
                    }}>
                      <div style={{ padding: '0.5rem' }}>
                        {/* Individual surveyors only (no "All" option for historical) */}
                        {Object.keys(groupedSurveyors).length > 0 ? (
                          Object.entries(groupedSurveyors).map(([project, projectSurveyors]) => (
                            <div key={project} style={{ marginBottom: '0.75rem' }}>
                              <div style={{ 
                                padding: '0.25rem 0.75rem', 
                                backgroundColor: '#fef3c7',
                                fontWeight: 600, 
                                fontSize: '0.85rem', 
                                color: '#92400e',
                                borderRadius: 6
                              }}>
                                {project} ({projectSurveyors.length})
                              </div>
                              {projectSurveyors.map(surveyor => {
                                const id = surveyor.id || '';
                                const name = surveyor.name || surveyor.fullName || id;
                                const city = surveyor.city || '';
                                
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
                                      backgroundColor: surveyorId === id ? '#fef3c7' : 'transparent'
                                    }}
                                    onMouseOver={(e) => {
                                      if (surveyorId !== id) e.target.style.backgroundColor = '#f8fafc';
                                    }}
                                    onMouseOut={(e) => {
                                      if (surveyorId !== id) e.target.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <div>
                                      <span style={{ fontWeight: 600 }}>{name}</span>
                                      <span style={{ color: '#64748b', marginLeft: '0.25rem', fontSize: '0.9rem' }}>({id})</span>
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
                            No surveyors loaded. Click "Load Surveyors" first.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range Pickers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                alignItems: 'stretch'
              }}>
                {/* Fetch Button */}
                <Button
                  onClick={fetchRouteData}
                  disabled={!surveyorId || isLoading}
                  variant="contained"
                  size="large"
                  style={{
                    background: surveyorId && !isLoading 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : '#94a3b8',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    boxShadow: surveyorId && !isLoading 
                      ? '0 8px 25px rgba(245, 158, 11, 0.4)' 
                      : 'none',
                    transition: 'all 0.3s ease',
                    textTransform: 'none'
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{ 
                        display: 'inline-block', 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid #ffffff30',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '0.5rem'
                      }} />
                      Fetching Route...
                    </>
                  ) : (
                    <>
                      🔍 Fetch Historical Route
                    </>
                  )}
                </Button>

                {/* Clear Map Button */}
                <Button
                  onClick={clearRouteData}
                  disabled={isLoading || !routeData}
                  variant="contained"
                  size="large"
                  style={{
                    background: routeData && !isLoading
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : '#94a3b8',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    boxShadow: routeData && !isLoading
                      ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                      : 'none',
                    transition: 'all 0.3s ease',
                    textTransform: 'none',
                    opacity: routeData && !isLoading ? 1 : 0.6
                  }}
                >
                  🗑️ Clear Map
                </Button>
              </div>

              {/* Last Fetch Info */}
              {lastFetchTime && (
                <div style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Last Fetch:</div>
                  <div>{lastFetchTime.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Right: Historical Routes Map */}
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
                borderBottom: '1px solid rgba(245, 158, 11, 0.1)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem' 
                }}>
                  <div style={{ fontSize: '1.5rem' }}>🗺️</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1.1rem' }}>Historical Routes Map</div>
                    <div style={{ fontSize: '0.85rem', color: '#d97706' }}>Manual fetch • Route analysis</div>
                  </div>
                </div>
                {routeData && (
                  <div style={{ 
                    background: 'linear-gradient(45deg, #f59e0b 0%, #d97706 100%)', 
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📊</span>
                    Route Analysis
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
                {routeData && showMap && (
                  <SurveyorTrackMap
                    key={routeData.timestamp} // Force re-render on new fetch
                    surveyorIds={[routeData.surveyorId]}
                    from={routeData.from}
                    to={routeData.to}
                    liveTracking={false}
                  />
                )}
                {(!routeData || !showMap) && (
                  <div style={{ 
                    padding: '4rem 2rem', 
                    textAlign: 'center',
                    color: '#64748b',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                    borderRadius: '16px',
                    margin: '2rem',
                    border: '2px dashed #fbbf24'
                  }}>
                    <div style={{ 
                      fontSize: '4rem',
                      background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>🛣️</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#92400e', marginBottom: '0.5rem' }}>
                        {isLoading ? 'Loading Historical Route...' : 'Ready for Route Analysis'}
                      </div>
                      <div style={{ fontSize: '1rem', lineHeight: '1.5', color: '#d97706' }}>
                        {isLoading ? (
                          'Please wait while we fetch and analyze the route data...'
                        ) : (
                          <>
                            1. Select a surveyor from dropdown<br />
                            2. Choose your date range<br />
                            3. Click "Fetch Historical Route"<br />
                            4. Map will load with the route data
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#d97706',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      {isLoading ? '⏳ Fetching data...' : '📊 Manual fetch only • No auto-refresh'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS for loading animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HistoricalRoutesPage;
