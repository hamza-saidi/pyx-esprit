import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from '../api/axios';
import {
  Box, Typography, Grid, Card, CardContent, Button, CircularProgress,
  Alert, Chip, Divider, Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  RecordVoiceOver as SubscriberIcon,
  MarkEmailRead as OpenIcon,
  AdsClick as ClickIcon,
  Campaign as CampaignIcon,
  AutoFixHigh as HealthIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const BENCHMARKS = { openRate: 28, clickRate: 3.5 };

const CAMPAIGN_STATUS_CONFIG = {
  brouillon:  { label: 'Brouillon',  color: '#64748b', bg: '#f1f5f9' },
  programmée: { label: 'Programmée', color: '#d97706', bg: '#fef9c3' },
  envoyée:    { label: 'Envoyée',    color: '#059669', bg: '#dcfce7' },
  en_cours:   { label: 'En cours',   color: '#2563eb', bg: '#dbeafe' },
  annulée:    { label: 'Annulée',    color: '#dc2626', bg: '#fee2e2' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - Date.now()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff > 1 && diff <= 30) return `Dans ${diff} j`;
  if (diff < 0 && diff >= -1) return 'Hier';
  if (diff < -1 && diff >= -30) return `Il y a ${Math.abs(diff)} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function firstWord(str) {
  if (!str) return '';
  return str.split(/[\s_-]/)[0];
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, Icon, color, trend, trendLabel }) => (
  <Card variant="outlined" sx={{ borderColor: '#e2e8f0', height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box sx={{ p: 0.875, bgcolor: `${color}14`, borderRadius: 1.5, display: 'inline-flex' }}>
          <Icon sx={{ color, fontSize: 18 }} />
        </Box>
        {trend === 'above' && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingUpIcon sx={{ fontSize: 14, color: '#059669' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
              {trendLabel || 'Dessus moy.'}
            </Typography>
          </Box>
        )}
        {trend === 'below' && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingDownIcon sx={{ fontSize: 14, color: '#d97706' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>
              {trendLabel || 'Sous moy.'}
            </Typography>
          </Box>
        )}
        {trend === 'positive' && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TrendingUpIcon sx={{ fontSize: 14, color: '#059669' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
              {trendLabel}
            </Typography>
          </Box>
        )}
      </Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          mb: 0.375,
          color: '#0f172a',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#475569', mb: sub ? 0.25 : 0 }}>
        {label}
      </Typography>
      {sub && (
        <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ── Campaign Status Chip ──────────────────────────────────────────────────────

const StatusChip = ({ statut }) => {
  const cfg = CAMPAIGN_STATUS_CONFIG[statut] || { label: statut, color: '#64748b', bg: '#f1f5f9' };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </Box>
  );
};

// ── Recent Campaigns Widget ───────────────────────────────────────────────────

const RecentCampaignsWidget = ({ campaigns, loading }) => {
  const navigate = useNavigate();

  return (
    <Card variant="outlined" sx={{ borderColor: '#e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
            Campagnes récentes
          </Typography>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: '13px !important' }} />}
            onClick={() => navigate('/campagnes')}
            sx={{ fontSize: 12, textTransform: 'none', color: '#2563eb', p: 0, minWidth: 0 }}
          >
            Toutes
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        ) : campaigns.length === 0 ? (
          <Box flex={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1.5} py={3}>
            <Typography sx={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
              Aucune campagne pour l'instant.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/campagnes?create=1')}
              sx={{ fontSize: 12, textTransform: 'none' }}
            >
              Créer une campagne
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={0} flex={1}>
            {campaigns.map((c, i) => (
              <Box key={c.id}>
                <Box
                  onClick={() => navigate(`/campagnes`)}
                  sx={{
                    py: 1.375,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc', mx: -1, px: 1, borderRadius: 1.5 },
                    transition: 'background 0.12s',
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <StatusChip statut={c.statut} />
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {relativeDate(c.date_envoi || c.date_programmee || c.date_creation)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.titre}
                  </Typography>
                  {c.statut === 'envoyée' && (c.taux_ouverture != null || c.taux_clic != null) && (
                    <Box display="flex" gap={2} mt={0.5}>
                      {c.taux_ouverture != null && (
                        <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {c.taux_ouverture}%
                          </span>{' '}ouv.
                        </Typography>
                      )}
                      {c.taux_clic != null && (
                        <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {c.taux_clic}%
                          </span>{' '}clics
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
                {i < campaigns.length - 1 && (
                  <Divider sx={{ borderColor: '#f1f5f9' }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Scheduled Strip ───────────────────────────────────────────────────────────

const ScheduledStrip = ({ campaigns }) => {
  const navigate = useNavigate();
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ borderColor: '#fde68a', bgcolor: '#fffbeb', mt: 3 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <ScheduleIcon sx={{ fontSize: 15, color: '#d97706' }} />
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: '#92400e', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Prochaines campagnes programmées
          </Typography>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1.5}>
          {campaigns.map(c => (
            <Box
              key={c.id}
              onClick={() => navigate('/campagnes')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                bgcolor: '#fff',
                border: '1px solid #fde68a',
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { borderColor: '#d97706' },
                transition: 'border-color 0.12s',
                minWidth: 200,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {c.titre}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#d97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {relativeDate(c.date_programmee)}
                  {c.date_programmee && (
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                      {' — '}{new Date(c.date_programmee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 14, color: '#d97706', ml: 'auto', flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Empty Chart State ─────────────────────────────────────────────────────────

const EmptyChart = ({ message, actionLabel, actionPath }) => {
  const navigate = useNavigate();
  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" gap={1.5}>
      <Typography sx={{ color: '#94a3b8', fontSize: 13.5, textAlign: 'center' }}>
        {message}
      </Typography>
      {actionLabel && (
        <Button variant="outlined" size="small" onClick={() => navigate(actionPath)}
          sx={{ fontSize: 12, textTransform: 'none' }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

// ── Onboarding Banner ─────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { num: 1, title: 'Configurez votre expéditeur', desc: 'Connectez SMTP ou Microsoft 365 pour envoyer depuis votre domaine.', path: '/settings', cta: 'Configurer', time: '3 min' },
  { num: 2, title: 'Importez vos premiers contacts', desc: 'Chargez un fichier CSV ou ajoutez des contacts manuellement.', path: '/contacts', cta: 'Importer', time: '5 min' },
  { num: 3, title: 'Choisissez un modèle d\'email', desc: "Parcourez la bibliothèque ou créez le vôtre avec l'assistant IA.", path: '/templates', cta: 'Voir les modèles', time: '10 min' },
  { num: 4, title: 'Envoyez votre première campagne', desc: 'Sélectionnez une audience et envoyez immédiatement ou planifiez.', path: '/campagnes?create=1', cta: 'Créer', time: '5 min' },
];

const OnboardingBanner = ({ totalAudience }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(
    () => localStorage.getItem('pylon_onboarding_dismissed') === '1'
  );
  if (dismissed || totalAudience > 0) return null;
  const dismiss = () => { localStorage.setItem('pylon_onboarding_dismissed', '1'); setDismissed(true); };

  return (
    <Box sx={{ mb: 3.5, border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#fff' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Démarrer avec Pylon Pyx</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>Complétez ces étapes pour envoyer votre première campagne.</Typography>
        </Box>
        <Button size="small" onClick={dismiss} sx={{ color: '#94a3b8', fontSize: 12, textTransform: 'none', minWidth: 0 }}>Ignorer</Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
        {ONBOARDING_STEPS.map((step, i) => (
          <Box key={step.num} sx={{ p: 2.5, borderRight: { sm: i < ONBOARDING_STEPS.length - 1 ? '1px solid #e2e8f0' : 'none' }, borderBottom: { xs: i < ONBOARDING_STEPS.length - 1 ? '1px solid #e2e8f0' : 'none', sm: 'none' } }}>
            <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: '#f1f5f9', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', mb: 1.5 }}>
              {step.num}
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0f172a', mb: 0.5 }}>{step.title}</Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.55, mb: 1.5 }}>{step.desc}</Typography>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Button size="small" variant="outlined" onClick={() => navigate(step.path)} sx={{ fontSize: 11.5, textTransform: 'none', py: 0.5, px: 1.5, borderColor: '#2563eb', color: '#2563eb', '&:hover': { bgcolor: '#f0f7ff' } }}>
                {step.cta}
              </Button>
              <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>~{step.time}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const prenom = firstWord(user?.nom) || 'vous';

  const [dashStats, setDashStats] = useState({ loading: true, data: null });
  const [campaigns, setCampaigns] = useState({ loading: true, data: [] });
  const [healthStats, setHealthStats] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get('/campagnes/stats/dashboard').then(r => r.data).catch(() => null),
      axios.get('/campagnes?limit=6&sort=date_creation&order=DESC').then(r => r.data).catch(() => ({ data: [] })),
      axios.get('/contacts/health/stats').then(r => r.data).catch(() => null),
    ]).then(([stats, camps, health]) => {
      setDashStats({ loading: false, data: stats });
      const list = Array.isArray(camps) ? camps : (camps?.data || []);
      setCampaigns({ loading: false, data: list });
      setHealthStats(health);
    });
  }, []);

  const data = dashStats.data;
  const openRate   = data?.performance_email?.taux_ouverture ?? null;
  const clickRate  = data?.performance_email?.taux_clic ?? null;
  const totalAud   = data?.audience_metrics?.total ?? 0;
  const activeConts = data?.audience_metrics?.actif ?? 0;
  const growthData = data?.audience_metrics?.growth || [];
  const activeRatio = totalAud > 0 ? Math.round((activeConts / totalAud) * 100) : 0;
  const inactiveCount = healthStats?.inactive ?? 0;
  const inactiveRatio = totalAud > 0 ? inactiveCount / totalAud : 0;

  const newThisMonth = growthData.reduce((s, d) => s + (d['Nouveaux contacts'] || 0), 0);

  const recentCampaigns = campaigns.data.slice(0, 4);
  const scheduledCampaigns = campaigns.data.filter(c => c.statut === 'programmée').slice(0, 3);

  const alerts = [];
  if (totalAud > 0 && inactiveRatio > 0.3) {
    alerts.push({
      severity: 'warning',
      message: `${inactiveCount.toLocaleString()} contacts sans ouverture depuis plus de 6 mois (${Math.round(inactiveRatio * 100)}% de votre audience).`,
      actionLabel: 'Nettoyer',
      actionPath: '/health',
    });
  }
  if (openRate !== null && openRate < BENCHMARKS.openRate) {
    alerts.push({
      severity: 'info',
      message: `Taux d'ouverture à ${openRate}% — sous la moyenne secteur (${BENCHMARKS.openRate}%). Testez de nouveaux objets d'email.`,
      actionLabel: 'Voir stats',
      actionPath: '/statistics',
    });
  }
  const upcomingBirthdaysNoAuto = data?.membership_alerts?.upcoming_birthdays_without_automation ?? 0;
  const renewalsDueSoon = data?.membership_alerts?.renewals_due_soon ?? 0;
  if (upcomingBirthdaysNoAuto > 0) {
    alerts.push({
      severity: 'info',
      message: `${upcomingBirthdaysNoAuto} anniversaire(s) dans les 14 prochains jours, mais l'automation d'anniversaire n'est pas activée.`,
      actionLabel: 'Activer',
      actionPath: '/automations',
    });
  }
  if (renewalsDueSoon > 0) {
    alerts.push({
      severity: 'warning',
      message: `${renewalsDueSoon} abonnement(s) arrivent à échéance dans les 30 prochains jours.`,
      actionLabel: 'Voir les automations',
      actionPath: '/automations',
    });
  }

  if (dashStats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={32} sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <Box sx={{ maxWidth: 1200 }}>

      {/* ── Header ── */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3.5}
        gap={2}
      >
        <Box>
          <Typography sx={{ fontSize: 12.5, color: '#64748b', mb: 0.25 }}>
            {todayCap}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', lineHeight: 1.15 }}
          >
            Bonjour, {prenom}
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<HealthIcon />}
            onClick={() => navigate('/health')}
            sx={{ textTransform: 'none', fontSize: 13, borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' } }}
          >
            Santé audience
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CampaignIcon />}
            onClick={() => navigate('/campagnes?create=1')}
            sx={{ textTransform: 'none', fontSize: 13, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, boxShadow: 'none' }}
          >
            Nouvelle campagne
          </Button>
        </Box>
      </Box>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <Box display="flex" flexDirection="column" gap={1} mb={3}>
          {alerts.map((alert, i) => (
            <Alert
              key={i}
              severity={alert.severity}
              action={
                <Button color="inherit" size="small" onClick={() => navigate(alert.actionPath)} sx={{ fontWeight: 700, fontSize: 12 }}>
                  {alert.actionLabel}
                </Button>
              }
              sx={{ fontSize: 13 }}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* ── Onboarding ── */}
      <OnboardingBanner totalAudience={totalAud} />

      {/* ── KPI Row ── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Audience totale"
            value={totalAud.toLocaleString('fr-FR')}
            sub={newThisMonth > 0 ? `+${newThisMonth.toLocaleString('fr-FR')} ce mois` : 'Aucun nouveau contact'}
            Icon={PeopleIcon}
            color="#2563eb"
            trend={newThisMonth > 0 ? 'positive' : null}
            trendLabel={newThisMonth > 0 ? `+${newThisMonth}` : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Abonnés actifs"
            value={activeConts.toLocaleString('fr-FR')}
            sub={totalAud > 0 ? `${activeRatio}% de l'audience` : 'Aucun contact'}
            Icon={SubscriberIcon}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Taux d'ouverture"
            value={openRate != null ? `${openRate}%` : '—'}
            sub={openRate != null ? `Moy. secteur : ${BENCHMARKS.openRate}%` : 'Envoyez votre 1re campagne'}
            Icon={OpenIcon}
            color={openRate != null && openRate >= BENCHMARKS.openRate ? '#10b981' : '#f59e0b'}
            trend={openRate != null ? (openRate >= BENCHMARKS.openRate ? 'above' : 'below') : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Taux de clic"
            value={clickRate != null ? `${clickRate}%` : '—'}
            sub={clickRate != null ? `Moy. secteur : ${BENCHMARKS.clickRate}%` : 'Aucune campagne envoyée'}
            Icon={ClickIcon}
            color={clickRate != null && clickRate >= BENCHMARKS.clickRate ? '#10b981' : '#f59e0b'}
            trend={clickRate != null ? (clickRate >= BENCHMARKS.clickRate ? 'above' : 'below') : null}
          />
        </Grid>
      </Grid>

      {/* ── Main Charts Row ── */}
      <Grid container spacing={2.5}>
        {/* Growth chart */}
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ borderColor: '#e2e8f0' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                  Croissance de l'audience
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>30 derniers jours</Typography>
              </Box>
              <Box height={264}>
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={6}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.07)', fontSize: 12.5 }}
                        cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 2' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Nouveaux contacts"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#growth)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart
                    message="Aucune donnée de croissance pour l'instant."
                    actionLabel="Importer des contacts"
                    actionPath="/contacts"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent campaigns */}
        <Grid item xs={12} md={4}>
          <RecentCampaignsWidget
            campaigns={recentCampaigns}
            loading={campaigns.loading}
          />
        </Grid>
      </Grid>

      {/* ── Scheduled Strip ── */}
      <ScheduledStrip campaigns={scheduledCampaigns} />

    </Box>
  );
};

export default Dashboard;
