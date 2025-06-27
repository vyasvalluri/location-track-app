import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SurveyorTrackMap from './SurveyorTrackMap';
import config from './config';
import SurveyorManagementPage from './pages/SurveyorManagementPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import HistoricalRoutesPage from './pages/HistoricalRoutesPage';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { FormControl, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SurveyorDashboard = () => {
  const [tab, setTab] = useState(0);
  
  return (
    <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif'
      }}>
      <div style={{ 
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                marginBottom: '0.5rem',
                letterSpacing: '-0.025em'
              }}>
                🗺️ Surveyor Tracking Dashboard
              </h1>
              <p style={{
                fontSize: '1.1rem',
                color: '#64748b',
                margin: 0,
                fontWeight: 500
              }}>
                Real-time monitoring and historical route analysis
              </p>
            </div>
            <div style={{
              fontSize: '4rem',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📍
            </div>
          </div>

          {/* Tab Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tab} 
              onChange={(e, newValue) => setTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 120,
                  padding: '12px 24px'
                },
                '& .Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }
              }}
            >
              <Tab label="📍 Live Tracking" />
              <Tab label="🛣️ Historical Routes" />
              <Tab label="👥 Surveyor Management" />
            </Tabs>
          </Box>
        </div>

        {/* Main Content */}
        <div style={{ minHeight: 700 }}>
          {/* Tab 0: Live Tracking Page */}
          {tab === 0 && <LiveTrackingPage />}
          
          {/* Tab 1: Historical Routes Page */}
          {tab === 1 && <HistoricalRoutesPage />}
          
          {/* Tab 2: Surveyor Management */}
          {tab === 2 && (
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
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
                <h2 style={{ 
                  fontSize: '1.6rem', 
                  fontWeight: 700, 
                  margin: 0, 
                  marginBottom: '0.5rem',
                  letterSpacing: '0.5px'
                }}>
                  Surveyor Management
                </h2>
                <p style={{ 
                  fontSize: '1rem', 
                  margin: 0, 
                  opacity: 0.95 
                }}>
                  Manage and monitor surveyor accounts
                </p>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '16px',
                border: '2px dashed #cbd5e1'
              }}>
                <div style={{ 
                  fontSize: '4rem', 
                  marginBottom: '1rem',
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>🚧</div>
                <h3 style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  margin: '0 0 1rem 0' 
                }}>
                  Under Development
                </h3>
                <p style={{ 
                  fontSize: '1rem', 
                  color: '#64748b', 
                  lineHeight: '1.6',
                  margin: 0,
                  maxWidth: '500px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  The surveyor management features are currently under development. 
                  This section will include user management, access control, and 
                  surveyor account administration tools.
                </p>
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem 1.5rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'inline-block'
                }}>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 600, 
                    color: '#059669' 
                  }}>
                    💡 Use Live Tracking and Historical Routes for surveyor monitoring
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyorDashboard;
