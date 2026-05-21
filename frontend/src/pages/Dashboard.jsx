import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import {
  Box, Typography, Grid, Card, CardContent, Button, CircularProgress, Tooltip as MuiTooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  RecordVoiceOver as SubscriberIcon,
  MarkEmailRead as OpenIcon,
  AdsClick as ClickIcon,
  PersonAdd as PersonAddIcon,
  Campaign as CampaignIcon,
  AutoFixHigh as HealthIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ loading: true, data: null });

  useEffect(() => {
    
    // Fetch global email performance stats
    (async () => {
      try {
        const res = await axios.get('/statistics/dashboard');
        setStats({ loading: false, data: res.data });
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
        setStats({ loading: false, data: null });
      }
    })();
  }, []);

  const renderKpiCard = ({ label, value, Icon, tooltipDesc }) => (
    <MuiTooltip title={tooltipDesc} arrow placement="top">
        <Card sx={{
        bgcolor: '#FFFFFF',
        color: '#3b3f44',
        border: '1px solid #bfc9cf',
        borderRadius: 0,
        boxShadow: 0,
        height: '100%',
        transition: 'border-color .2s ease',
        '&:hover': { borderColor: '#0a84d6' }
        }}>
        <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <Icon sx={{ color: '#0a84d6' }} />
                <Typography variant="body2" sx={{ textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, color: '#8a9298' }}>
                    {label}
                </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                {value}
            </Typography>
        </CardContent>
        </Card>
    </MuiTooltip>
  );

  if (stats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} sx={{ color: '#0a84d6' }} />
      </Box>
    );
  }

  const openRateStr = stats.data?.performance_email?.taux_ouverture != null 
    ? `${stats.data.performance_email.taux_ouverture}%` 
    : 'N/A';
  
  const clickRateStr = stats.data?.performance_email?.taux_clic != null 
    ? `${stats.data.performance_email.taux_clic}%` 
    : 'N/A';

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={6} gap={3}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>
            Audience Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your high-level metrics for audience growth and campaign engagement.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<HealthIcon />} onClick={() => navigate('/health')} sx={{ borderColor: '#bfc9cf', color: '#3b3f44' }}>
            Clean Audience
          </Button>
          <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => navigate('/contacts?add=1')} sx={{ borderColor: '#bfc9cf', color: '#3b3f44' }}>
            Add Contact
          </Button>
          <Button variant="contained" color="secondary" startIcon={<CampaignIcon />} onClick={() => navigate('/campagnes?create=1')}>
            New Campaign
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={6}>
        <Grid item xs={12} sm={6} md={3}>
          {renderKpiCard({
            label: 'Total Audience',
            value: stats.data?.audience_metrics?.total || 0,
            Icon: PeopleIcon,
            tooltipDesc: 'Total number of contacts in your database.'
          })}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderKpiCard({
            label: 'Subscribed',
            value: stats.data?.audience_metrics?.actif || 0,
            Icon: SubscriberIcon,
            tooltipDesc: 'Contacts opted-in to receive campaigns.'
          })}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderKpiCard({
            label: 'Avg Open Rate',
            value: openRateStr,
            Icon: OpenIcon,
            tooltipDesc: 'Average unique opens per delivered email across all campaigns.'
          })}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderKpiCard({
            label: 'Avg Click Rate',
            value: clickRateStr,
            Icon: ClickIcon,
            tooltipDesc: 'Average unique clicks per delivered email across all campaigns.'
          })}
        </Grid>
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={4}>
        {/* Audience Growth Chart */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Audience Growth (Last 30 Days)
          </Typography>
          <Box sx={{ p: 4, bgcolor: '#FFFFFF', border: '1px solid #bfc9cf', height: 400 }}>
            {stats.data?.audience_metrics?.growth?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.data.audience_metrics.growth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bfc9cf" />
                    <XAxis dataKey="date" tick={{ fill: '#8a9298', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#8a9298', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                    <RechartsTooltip 
                        contentStyle={{ borderRadius: 0, border: '1px solid #bfc9cf', boxShadow: 'none' }}
                    />
                    <Line type="monotone" dataKey="New Contacts" stroke="#0a84d6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="text.secondary">Not enough data to display growth.</Typography>
                </Box>
            )}
          </Box>
        </Grid>

        {/* Top Tags Bar Chart */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Top Audience Tags
          </Typography>
          <Box sx={{ p: 4, bgcolor: '#FFFFFF', border: '1px solid #bfc9cf', height: 400 }}>
             {stats.data?.audience_metrics?.top_tags?.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.data.audience_metrics.top_tags} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#bfc9cf" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="nom" type="category" width={100} tick={{ fill: '#3b3f44', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f5f7f9' }} contentStyle={{ borderRadius: 0, border: '1px solid #bfc9cf' }} />
                        <Bar dataKey="count" name="Contacts" fill="#3b3f44" radius={[0, 4, 4, 0]} maxBarSize={30} />
                    </BarChart>
                 </ResponsiveContainer>
             ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="text.secondary">No tags assigned yet.</Typography>
                </Box>
             )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
 