import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStatistics, fetchDashboard, fetchComparison, fetchSegmentStats } from '../features/statistics/statisticsSlice';
import { fetchCampaigns } from '../features/campaigns/campaignsSlice';
import { fetchSegments } from '../features/segments/segmentsSlice';
import {
  Box, Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel, Paper,
  Grid, Card, CardContent, CardHeader, Tabs, Tab, Chip, Alert, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Divider, LinearProgress, Pagination
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Campaign as CampaignIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const Statistics = () => {
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: campaigns = [] } = useSelector((state) => state.campaigns || {});
  const { items: segments = [] } = useSelector((state) => state.segments || {});
  const { data, dashboard, comparison, segmentStats, loading, error } = useSelector((state) => state.statistics);
  
  const [searchParams] = useSearchParams();
  const initialTab = parseInt(searchParams.get('tab') || '0', 10);
  const initialCampaignId = parseInt(searchParams.get('campaignId') || '', 10) || searchParams.get('campaignId') || '';

  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaignId);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [periode, setPeriode] = useState('30j');
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // États pour le filtrage de la liste des contacts
  const [activitySearch, setActivitySearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(activitySearch);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [activitySearch]);


  const [contactTab, setContactTab] = useState(0);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    dispatch(fetchCampaigns());
    dispatch(fetchSegments());
    dispatch(fetchDashboard(periode));
  }, [dispatch, periode]);

  useEffect(() => {
    if (selectedCampaign) {
      const statusMap = ['all', 'openers', 'clickers', 'non_openers', 'errors'];
      dispatch(fetchStatistics({ 
        campaignId: selectedCampaign, 
        page, 
        limit: rowsPerPage, 
        search: debouncedSearch,
        status: statusMap[contactTab] || 'all'
      }));
    }
  }, [dispatch, selectedCampaign, page, debouncedSearch, contactTab, rowsPerPage]);



  useEffect(() => {
    if (selectedSegment) {
      dispatch(fetchSegmentStats(selectedSegment));
    }
  }, [dispatch, selectedSegment]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      dispatch(fetchComparison({ periode1: '30j', periode2: '60j' }));
    }
  };

  const getVariationIcon = (variation) => {
    if (variation > 0) return <TrendingUpIcon color="success" />;
    if (variation < 0) return <TrendingDownIcon color="error" />;
    return <RemoveIcon color="action" />;
  };

  const getVariationColor = (variation) => {
    if (variation > 0) return 'success.main';
    if (variation < 0) return 'error.main';
    return 'text.secondary';
  };

  const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '—';
  const getLastInteraction = (item) => item.date_clic || item.date_ouverture || item.date_envoi;
  const formatStatusChip = (statut) => {
    const colorMap = {
      envoyé: 'default',
      livré: 'default',
      ouvert: 'success',
      cliqué: 'warning',
      erreur: 'error',
      bounce: 'error',
      spam: 'error'
    };
    return (
      <Chip
        label={statut || '—'}
        size="small"
        color={colorMap[statut] || 'default'}
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  const handleFollowUp = async (groupKey) => {
    try {
      const { data } = await axios.get(`/campagnes/${selectedCampaign}/followup-groups`);
      if (data.groups && data.groups[groupKey]) {
        const ids = data.groups[groupKey].contact_ids;
        if (ids.length === 0) {
          toast.info('Aucun contact dans cette catégorie.');
          return;
        }
        navigate(`/composer?campagneMode=1&isFollowUp=1&contactIds=${ids.join(',')}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du chargement des groupes.');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // On ne bloque l'affichage total que lors du TOUT PREMIER chargement d'une campagne
  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📊 Tableau de Bord & Statistiques
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={periode}
            label="Période"
            onChange={(e) => {
              setPeriode(e.target.value);
              dispatch(fetchDashboard(e.target.value));
            }}
          >
            <MenuItem value="7j">7 jours</MenuItem>
            <MenuItem value="30j">30 jours</MenuItem>
            <MenuItem value="90j">90 jours</MenuItem>
            <MenuItem value="1an">1 an</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Vue d'ensemble" />
        <Tab label="Comparaisons" />
        <Tab label="Campagnes" />
        
        <Tab label="Segments" />
      </Tabs>

      {/* Vue d'ensemble */}
      {activeTab === 0 && dashboard && (
        <Box>
          {/* Métriques principales */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CampaignIcon color="primary" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Campagnes
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.metriques_globales?.total_campagnes ?? '—'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <EmailIcon color="success" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Emails envoyés
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.metriques_globales?.total_envois ?? '—'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <PeopleIcon color="info" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Contacts
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.metriques_globales?.total_contacts ?? '—'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
          </Grid>

          {/* Performance email */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Performance Email" />
                <CardContent>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Taux d'ouverture</Typography>
                      <Typography variant="h6" color="primary">
                        {dashboard.performance_email?.taux_ouverture ?? '—'}{dashboard.performance_email?.taux_ouverture != null ? '%' : ''}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboard.performance_email?.taux_ouverture ?? 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography>Taux de clic</Typography>
                      <Typography variant="h6" color="success">
                        {dashboard.performance_email?.taux_clic ?? '—'}{dashboard.performance_email?.taux_clic != null ? '%' : ''}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboard.performance_email?.taux_clic ?? 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Répartition des campagnes" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={(dashboard.repartition_campagnes || []).map((stat) => ({
                          name: `${stat.statut} (${stat.type})`,
                          value: stat.count
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(dashboard.repartition_campagnes || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Graphiques de performance */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader title="Performance des campagnes par statut" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.repartition_campagnes || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="statut" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Nombre de campagnes" />
                      <Bar dataKey="total_envoyes" fill="#82ca9d" name="Total envoyés" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader title="Répartition des contacts" />
                <CardContent>
                  <Box>
                    {(dashboard.repartition_contacts || []).map((stat) => (
                      <Box key={stat.type_client} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">
                            {stat.type_client === 'membre' ? 'Membres' : 'Entreprises'}
                          </Typography>
                          <Typography variant="h6">
                            {stat.count}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={dashboard.metriques_globales?.total_contacts
                            ? (stat.count / dashboard.metriques_globales.total_contacts) * 100
                            : 0}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Comparaisons */}
      {activeTab === 1 && comparison && (
        <Box>
          <Typography variant="h5" mb={3}>Comparaison des performances</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Période récente" />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    {new Date(comparison.periode1.date_debut).toLocaleDateString()} - {new Date(comparison.periode1.date_fin).toLocaleDateString()}
                  </Typography>
                  <Box>
                    <Typography>Campagnes: {comparison.periode1.stats.campagnes}</Typography>
                    <Typography>Emails: {comparison.periode1.stats.envois}</Typography>
                    <Typography>Taux ouverture: {comparison.periode1.stats.taux_ouverture}%</Typography>
                    <Typography>Taux clic: {comparison.periode1.stats.taux_clic}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Période précédente" />
                <CardContent>
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    {new Date(comparison.periode2.date_debut).toLocaleDateString()} - {new Date(comparison.periode2.date_fin).toLocaleDateString()}
                  </Typography>
                  <Box>
                    <Typography>Campagnes: {comparison.periode2.stats.campagnes}</Typography>
                    <Typography>Emails: {comparison.periode2.stats.envois}</Typography>
                    <Typography>Taux ouverture: {comparison.periode2.stats.taux_ouverture}%</Typography>
                    <Typography>Taux clic: {comparison.periode2.stats.taux_clic}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Variations */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title="Variations (%)" />
            <CardContent>
              <Grid container spacing={2}>
                {Object.entries(comparison.variations).map(([key, value]) => (
                  <Grid item xs={6} sm={3} key={key}>
                    <Box textAlign="center">
                      <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
                        {getVariationIcon(value)}
                      </Box>
                      <Typography variant="h6" color={getVariationColor(value)}>
                        {value > 0 ? '+' : ''}{value}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {key === 'campagnes' ? 'Campagnes' :
                         key === 'envois' ? 'Emails' :
                         key === 'taux_ouverture' ? 'Ouverture' :
                         key === 'taux_clic' ? 'Clics' : 'Contacts'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Analyse */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title="Analyse automatique" />
            <CardContent>
              {(comparison.analyse || []).map((analyse, index) => (
                <Alert key={index} severity="info" sx={{ mb: 1 }}>
                  {analyse}
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Campagnes */}
      {activeTab === 2 && (
        <Box>
          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', border: 'none' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#334155' }}>
                Sélectionner une campagne
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={selectedCampaign}
                  onChange={(e) => { setSelectedCampaign(e.target.value); setPage(1); }}
                  displayEmpty
                  sx={{ borderRadius: 2, bgcolor: '#f1f5f9' }}
                >
                  <MenuItem value="" disabled>Choisir une campagne...</MenuItem>
                  {campaigns.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.titre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          {selectedCampaign && data && (
            <Box>
              {/* Quick Stats Grid */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { 
                    label: 'Ouverts', 
                    value: data.stats_en_temps_reel?.ouverts || 0, 
                    total: data.stats_en_temps_reel?.total || 0, 
                    color: '#22c55e', 
                    sub: 'sur envois' 
                  },
                  { 
                    label: 'Clics', 
                    value: data.stats_en_temps_reel?.clics || 0, 
                    total: 'Interactions', 
                    color: '#f59e0b', 
                    sub: 'enregistrées' 
                  },
                  { 
                    label: "Taux d'ouverture", 
                    value: (data.stats_en_temps_reel?.total > 0) 
                      ? `${(((data.stats_en_temps_reel?.ouverts || 0) / data.stats_en_temps_reel.total) * 100).toFixed(2)}%` 
                      : '0.00%', 
                    color: '#3b82f6', 
                    sub: 'Engagement' 
                  },
                  { 
                    label: 'Taux de clic', 
                    value: (data.stats_en_temps_reel?.total > 0) 
                      ? `${(((data.stats_en_temps_reel?.clics || 0) / data.stats_en_temps_reel.total) * 100).toFixed(2)}%` 
                      : '0.00%', 
                    color: '#6366f1', 
                    sub: 'Conversion' 
                  }
                ].map((stat, i) => (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Card sx={{ height: '100%', borderRadius: 3, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}>
                          {stat.label}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color }}>
                            {stat.value}
                          </Typography>
                          {stat.total && stat.total !== 'Interactions' && (
                            <Typography variant="body2" color="text.secondary">
                              / {stat.total}
                            </Typography>
                          )}
                        </Box>

                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          {stat.sub}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Grid container spacing={4}>
                {/* Daily Activity Chart */}
                <Grid item xs={12} lg={8}>
                  <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardHeader title="Activité quotidienne" titleTypographyProps={{ variant: 'h6', fontWeight: 700 }} />
                    <Divider />
                    <CardContent>
                      <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                        <ResponsiveContainer>
                          <AreaChart data={data.timeline || []}>
                            <defs>
                              <linearGradient id="colorEnv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="envoyés" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEnv)" />
                            <Area type="monotone" dataKey="ouverts" stroke="#22c55e" strokeWidth={3} fillOpacity={0} />
                            <Area type="monotone" dataKey="clics" stroke="#f59e0b" strokeWidth={3} fillOpacity={0} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Top Engaged Contacts */}
                <Grid item xs={12} lg={4}>
                  <Card sx={{ borderRadius: 3, height: '100%' }}>
                    <CardHeader title="Contacts les plus engagés" titleTypographyProps={{ variant: 'h6', fontWeight: 700 }} />
                    <Divider />
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ px: 2 }}>
                        {(data.top_contacts || []).map((contact, i) => (
                          <Box key={i} sx={{ 
                            py: 2, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: i < (data.top_contacts.length - 1) ? '1px solid #f1f5f9' : 'none'
                          }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{contact.nom}</Typography>
                              <Typography variant="caption" color="text.secondary">{contact.email}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>{contact.nombre_ouvertures} pts</Typography>
                              <Typography variant="caption" color="text.secondary">Engagement</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Main Table Card */}
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    {loading && (
                      <Box sx={{ width: '100%', position: 'absolute', top: 0, zIndex: 10 }}>
                        <LinearProgress />
                      </Box>
                    )}
                    <CardHeader 
                      title="Détail des interactions par contact"
                      titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                      action={
                        <TextField
                          size="small"
                          placeholder="Rechercher un contact..."
                          value={activitySearch}
                          onChange={(e) => { setActivitySearch(e.target.value); setPage(1); }}
                          sx={{ 
                            width: 250,
                            '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8fafc' }
                          }}
                        />
                      }
                    />
                    
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                      {(() => {
                        const counts = data.pagination?.counts || { all: 0, openers: 0, clickers: 0, non_openers: 0, errors: 0 };
                        const tabs = [
                          { label: 'Tous', count: counts.all, color: 'primary', key: 'all' },
                          { label: 'Ouvreurs', count: counts.openers, color: 'success', key: 'openers' },
                          { label: 'Cliqueurs', count: counts.clickers, color: 'warning', key: 'clickers' },
                          { label: 'Non-ouvreurs', count: counts.non_openers, color: 'info', key: 'non_openers' },
                          { label: 'Erreurs', count: counts.errors, color: 'error', key: 'errors' }
                        ];

                        return (
                          <Box>
                            <Tabs 
                              value={contactTab} 
                              onChange={(_, v) => { setContactTab(v); setPage(1); }}
                              sx={{ '& .MuiTab-root': { minHeight: 64 } }}
                            >
                              {tabs.map((t, i) => (
                                <Tab key={i} label={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.label}</Typography>
                                    <Chip label={t.count} size="small" color={t.color} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                  </Box>
                                } />
                              ))}
                            </Tabs>

                            {/* Follow-up Banner */}
                            {contactTab > 0 && tabs[contactTab].count > 0 && (
                              <Box sx={{ 
                                p: 2, 
                                bgcolor: '#f1f5f9', 
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                                  💡 Vous pouvez relancer ces <strong>{tabs[contactTab].count}</strong> contacts avec une nouvelle campagne ciblée.
                                </Typography>
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  onClick={() => handleFollowUp(tabs[contactTab].key)}
                                  sx={{ 
                                    textTransform: 'none', 
                                    borderRadius: 2,
                                    boxShadow: 'none',
                                    fontWeight: 700,
                                    bgcolor: '#1e293b',
                                    '&:hover': { bgcolor: '#334155' }
                                  }}
                                >
                                  🔁 Créer une campagne de suivi
                                </Button>
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                    </Box>


                    <TableContainer>
                      <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem' }}>Contact</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem' }}>Dernière action</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem' }}>Ouvertures</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem' }}>Clics</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem' }}>Statut</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(data.contact_activity || []).map((activity) => (
                            <TableRow key={activity.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{activity.nom}</Typography>
                                <Typography variant="caption" color="text.secondary">{activity.email}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>{formatDateTime(getLastInteraction(activity))}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{activity.nombre_ouvertures || 0}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{activity.nombre_clics || 0}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                {formatStatusChip(activity.statut)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Affichage de <strong>{rowsPerPage}</strong> sur <strong>{data.pagination?.total || 0}</strong> contacts
                      </Typography>
                      <Pagination 
                        count={data.pagination?.totalPages || 1} 
                        page={page} 
                        onChange={(_, v) => setPage(v)}
                        color="primary"
                        shape="rounded"
                        size="medium"
                      />
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {/* Segments */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h5" mb={3}>Statistiques par segment</Typography>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Segment</InputLabel>
            <Select 
              value={selectedSegment} 
              label="Segment" 
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              {segments.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {segmentStats && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Métriques du segment" />
                  <CardContent>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Campagnes</Typography>
                        <Typography variant="h6" color="primary">
                          {segmentStats.statistiques.total_campagnes}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Emails envoyés</Typography>
                        <Typography variant="h6" color="success">
                          {segmentStats.statistiques.total_envois}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Ouverts</Typography>
                        <Typography variant="h6" color="info">
                          {segmentStats.statistiques.total_ouverts}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Clics</Typography>
                        <Typography variant="h6" color="warning">
                          {segmentStats.statistiques.total_clics}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Taux d'ouverture</Typography>
                        <Typography variant="h6" color="primary">
                          {segmentStats.statistiques.taux_ouverture}%
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Taux de clic</Typography>
                        <Typography variant="h6" color="success">
                          {segmentStats.statistiques.taux_clic}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Performance par campagne" />
                  <CardContent>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Campagne</TableCell>
                            <TableCell align="right">Envoyés</TableCell>
                            <TableCell align="right">Ouverts</TableCell>
                            <TableCell align="right">Clics</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(segmentStats.performance_par_campagne || []).map((campagne) => (
                            <TableRow key={campagne.id}>
                              <TableCell>{campagne.titre}</TableCell>
                              <TableCell align="right">{campagne.nb_envoyes}</TableCell>
                              <TableCell align="right">{campagne.nb_ouverts}</TableCell>
                              <TableCell align="right">{campagne.nb_clics}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Statistics; 