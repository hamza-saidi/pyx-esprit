import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import Members from './Members';
import MembershipPlans from './MembershipPlans';

const MembersAndPlansHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.startsWith('/membership-plans') ? 1 : 0;

  return (
    <Box>
      <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => navigate(v === 0 ? '/members' : '/membership-plans')}
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
          <Tab icon={<PeopleIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Membres" />
          <Tab icon={<StarIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Plans d'abonnement" />
        </Tabs>
      </Box>
      {tab === 0 ? <Members /> : <MembershipPlans />}
    </Box>
  );
};

export default MembersAndPlansHub;
