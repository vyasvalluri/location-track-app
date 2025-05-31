import React, { useState } from 'react';
import SurveyorForm from '../components/SurveyorForm';
import SurveyorList from '../components/SurveyorList';
import { Grid } from '@mui/material';

const SurveyorManagementPage = () => {
  const [selectedSurveyor, setSelectedSurveyor] = useState(null);
  const reload = () => setSelectedSurveyor(null);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SurveyorForm onSave={reload} selected={selectedSurveyor} />
      </Grid>
      <Grid item xs={12} md={6}>
        <SurveyorList onSelect={setSelectedSurveyor} />
      </Grid>
    </Grid>
  );
};

export default SurveyorManagementPage;
