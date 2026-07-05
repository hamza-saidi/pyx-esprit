import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import {
  Box, Typography, Grid, Card, CardContent, Button, CircularProgress, Alert, Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  RecordVoiceOver as SubscriberIcon,
  MarkEmailRead as OpenIcon,
  AdsClick as ClickIcon,
  PersonAdd as PersonAddIcon,
  Campaign as CampaignIcon,
  AutoFixHigh as HealthIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const BENCHMARKS = { openRate: 28, clickRate: 3.5 };

const KpiCard = ({ label, value, desc, Icon, color, trend }) => (
  <Card>
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
        <Box
          sx={{
            p: 1,
            bgcolor: `${color}18`,
            borderRadius: 2,
            display: 'inline-flex',
          }}
        >
          <Icon sx={{ color, fontSize: 20 }} />
        </Box>
        {trend === 'above' && (
          <Chip
            icon={<TrendingUpIcon sx={{ fontSize: '13px !important' }} />}
            label="Au-dessus moy."
            size="small"
            sx={{ bgcolor: '#d1fae5', color: '#059669', fontWeight: 700, fontSize: 11, height: 22 }}
          />
        )}
        {trend === 'below' && (
          <Chip
            icon={<TrendingDownIcon sx={{ fontSize: '13px !important' }} />}
            label="Sous la moy."
            size="small"
            sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, fontSize: 11, height: 22 }}
          />
        )}
      </Box>
      <Typography
        variant="h4"
        fontWeight={800}
        sx={{ letterSpacing: '-0.03em', lineHeight: 1, mb: 0.5, color: '#0f172a' }}
      >
        {value}
      </Typography>
      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      {desc && (
        <Typography variant="caption" color="text.secondary">
          {desc}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const EmptyChart = ({ message, actionLabel, actionPath }) => {
  const navigate = useNavigate();
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      gap={1.5}
    >
      <Typography color="text.secondary" fontSize={14} textAlign="center">
        {message}
      </Typography>
      {actionLabel && (
        <Button variant="outlined" size="small" onClick={() => navigate(actionPath)}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ loading: true, data: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/campagnes/stats/dashboard');
        setStats({ loading: false, data: res.data });
      } catch {
        setStats({ loading: false, data: null });
      }
    })();
  }, []);

  if (stats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={36} sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  const openRate = stats.data?.performance_email?.taux_ouverture ?? null;
  const clickRate = stats.data?.performance_email?.taux_clic ?? null;
  const totalAudience = stats.data?.audience_metrics?.total ?? 0;
  const activeContacts = stats.data?.audience_metrics?.actif ?? 0;
  const inactiveRatio = totalAudience > 0 ? (totalAudience - activeContacts) / totalAudience : 0;

  const alerts = [];
  if (totalAudience > 0 && inactiveRatio > 0.3) {
    alerts.push({
      severity: 'warning',
      message: `${(totalAudience - activeContacts).toLocaleString()} contacts inactifs ou désabonnés (${Math.round(inactiveRatio * 100)}% de votre audience)`,
      actionLabel: 'Nettoyer',
      actionPath: '/health',
    });
  }
  if (openRate !== null && openRate < BENCHMARKS.openRate) {
    alerts.push({
      severity: 'info',
      message: `Taux d'ouverture ${openRate}% — inférieur à la moyenne secteur (${BENCHMARKS.openRate}%). Testez un nouvel objet d'email.`,
      actionLabel: 'Voir stats',
      actionPath: '/statistics',
    });
  }

  const activeRatio = totalAudience > 0 ? Math.round((activeContacts / totalAudience) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {/* Header */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={4}
        gap={2}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              textTransform: 'capitalize',
              color: '#64748b',
              display: 'block',
              mb: 0.25,
            }}
          >
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.025em', color: '#0f172a' }}>
            Bonjour 👋
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<HealthIcon />}
            onClick={() => navigate('/health')}
          >
            Santé audience
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => navigate('/contacts?add=1')}
          >
            Ajouter un contact
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<CampaignIcon />}
            onClick={() => navigate('/campagnes?create=1')}
          >
            Nouvelle campagne
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box display="flex" flexDirection="column" gap={1.5} mb={4}>
          {alerts.map((alert, i) => (
            <Alert
              key={i}
              severity={alert.severity}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => navigate(alert.actionPath)}
                  sx={{ fontWeight: 700 }}
                >
                  {alert.actionLabel}
                </Button>
              }
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total Audience"
            value={totalAudience.toLocaleString()}
            desc="Contacts dans votre base"
            Icon={PeopleIcon}
            color="#2563eb"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Abonnés actifs"
            value={activeContacts.toLocaleString()}
            desc={totalAudience > 0 ? `${activeRatio}% de votre audience` : 'Aucun contact'}
            Icon={SubscriberIcon}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Taux d'ouverture"
            value={openRate != null ? `${openRate}%` : '—'}
            desc={
              openRate != null
                ? `Moy. secteur : ${BENCHMARKS.openRate}%`
                : 'Envoyez votre première campagne'
            }
            Icon={OpenIcon}
            color={openRate != null && openRate >= BENCHMARKS.openRate ? '#10b981' : '#f59e0b'}
            trend={
              openRate != null
                ? openRate >= BENCHMARKS.openRate
                  ? 'above'
                  : 'below'
                : null
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Taux de clic"
            value={clickRate != null ? `${clickRate}%` : '—'}
            desc={
              clickRate != null
                ? `Moy. secteur : ${BENCHMARKS.clickRate}%`
                : 'Aucune campagne envoyée'
            }
            Icon={ClickIcon}
            color={clickRate != null && clickRate >= BENCHMARKS.clickRate ? '#10b981' : '#f59e0b'}
            trend={
              clickRate != null
                ? clickRate >= BENCHMARKS.clickRate
                  ? 'above'
                  : 'below'
                : null
            }
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={3} color="text.primary">
                Croissance de l'audience — 30 derniers jours
              </Typography>
              <Box height={300}>
                {stats.data?.audience_metrics?.growth?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.data.audience_metrics.growth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dx={-8}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: 13,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Nouveaux contacts"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart
                    message="Pas encore de données de croissance."
                    actionLabel="Importer des contacts"
                    actionPath="/contacts"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={3} color="text.primary">
                Top Étiquettes
              </Typography>
              <Box flex={1} minHeight={280}>
                {stats.data?.audience_metrics?.top_tags?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.data.audience_metrics.top_tags}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        vertical
                        stroke="#f1f5f9"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="nom"
                        type="category"
                        width={88}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 13,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Contacts"
                        fill="#2563eb"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart
                    message="Aucune étiquette créée."
                    actionLabel="Créer une étiquette"
                    actionPath="/tags"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
