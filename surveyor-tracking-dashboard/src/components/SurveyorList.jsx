import React, { useEffect, useState, useMemo } from 'react';
import { ListItem, ListItemText, Paper, Typography, Divider, TextField } from '@mui/material';
import { FixedSizeList as VirtualList } from 'react-window';

const SurveyorList = ({ onSelect }) => {
  const [surveyors, setSurveyors] = useState([]);
  const [search, setSearch] = useState('');

  const loadSurveyors = () => {
    // Import config to get the backend host
    import('../config').then(module => {
      const config = module.default;
      fetch(`${config.backendHost}/api/surveyors`)
        .then(res => res.json())
        .then(data => setSurveyors(data));
    });
  };

  useEffect(() => {
    loadSurveyors();
  }, []);

  // Filtered surveyors for search
  const filteredSurveyors = useMemo(() => {
    if (!search) return surveyors;
    const q = search.toLowerCase();
    return surveyors.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.projectName || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q)
    );
  }, [surveyors, search]);

  // Virtualized row renderer
  const Row = ({ index, style }) => {
    const s = filteredSurveyors[index];
    return (
      <div style={style} key={s.id}>
        <ListItem
          button
          onClick={() => onSelect(s)}
          style={{
            borderRadius: 10,
            marginBottom: 8,
            background: '#fff',
            boxShadow: '0 1px 4px rgba(99,102,241,0.06)',
            transition: 'background 0.2s, box-shadow 0.2s',
            border: '1px solid #e0e7ff',
            cursor: 'pointer',
            padding: '0.7rem 1.2rem',
          }}
          className="surveyor-list-item"
        >
          <ListItemText
            primary={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>{s.name}</span>
                {s.username && (
                  <span style={{ 
                    backgroundColor: '#e0e7ff', 
                    color: '#4338ca', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    @{s.username}
                  </span>
                )}
              </div>
            }
            secondary={<span style={{ color: '#64748b' }}>{s.city} <span style={{ color: '#6366f1', fontWeight: 500 }}>&mdash; {s.projectName || <span style={{ color: '#f43f5e' }}>No Project</span>}</span></span>}
          />
        </ListItem>
      </div>
    );
  };

  return (
    <Paper elevation={4} style={{ padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', boxShadow: '0 4px 24px rgba(99,102,241,0.10)' }}>
      <Typography variant="h5" style={{ fontWeight: 700, color: '#6366f1', marginBottom: 12, letterSpacing: 0.5, textAlign: 'center' }}>
        Surveyors
      </Typography>
      <Divider style={{ marginBottom: 12 }} />
      <TextField
        label="Search by name, username, city, or project"
        variant="outlined"
        size="small"
        fullWidth
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, background: '#fff', borderRadius: 8 }}
      />
      <div style={{ height: 400, width: '100%' }}>
        <VirtualList
          height={400}
          itemCount={filteredSurveyors.length}
          itemSize={68}
          width="100%"
        >
          {Row}
        </VirtualList>
      </div>
      <style>{`
        .surveyor-list-item:hover {
          background: linear-gradient(90deg, #6366f1 0%, #60a5fa 100%) !important;
          color: #fff !important;
          box-shadow: 0 2px 12px rgba(99,102,241,0.13);
        }
        .surveyor-list-item:hover .MuiListItemText-primary {
          color: #fff !important;
        }
        .surveyor-list-item:hover .MuiListItemText-secondary {
          color: #e0e7ff !important;
        }
      `}</style>
    </Paper>
  );
};

export default SurveyorList;
