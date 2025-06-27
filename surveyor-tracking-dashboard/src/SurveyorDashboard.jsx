import React, { useState } from 'react';
import LiveTrackingPage from './pages/LiveTrackingPage';
import HistoricalRoutesPage from './pages/HistoricalRoutesPage';
import SurveyorManagementPage from './pages/SurveyorManagementPage';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

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
          {tab === 2 && <SurveyorManagementPage />}
        </div>
      </div>
    </div>
  );
};

export default SurveyorDashboard;
