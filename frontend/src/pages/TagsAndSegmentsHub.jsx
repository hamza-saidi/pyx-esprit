import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import Tags from './Tags';
import Segments from './Segments';

const TagsAndSegmentsHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.startsWith('/segments') ? 1 : 0;

  return (
    <Box>
      <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => navigate(v === 0 ? '/tags' : '/segments')}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13.5,
              minHeight: 44,
              gap: 0.75,
            },
            '& .MuiTabs-indicator': { backgroundColor: '#0969da', height: 2 },
            '& .Mui-selected': { color: '#0969da !important' },
          }}
        >
          <Tab icon={<LabelIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Étiquettes" />
          <Tab icon={<GroupWorkIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Segments" />
        </Tabs>
      </Box>
      {tab === 0 ? <Tags /> : <Segments />}
    </Box>
  );
};

export default TagsAndSegmentsHub;
