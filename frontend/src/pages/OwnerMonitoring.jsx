import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import EmailIcon from '@mui/icons-material/Email';
import SpeedIcon from '@mui/icons-material/Speed';
import RouterIcon from '@mui/icons-material/Router';

const SERVICES = [
  { name: 'API Gateway', icon: RouterIcon, uptime: 99.9, latency: '187ms', status: 'ok', requests24h: 4231 },
  { name: 'Base de données', icon: StorageIcon, uptime: 99.7, latency: '23ms', status: 'ok', requests24h: 18403 },
  { name: 'File Redis / BullMQ', icon: CloudQueueIcon, uptime: 100, latency: '1ms', status: 'ok', requests24h: 183 },
  { name: 'Service email (SMTP)', icon: EmailIcon, uptime: 98.4, latency: '—', status: 'warn', requests24h: 412 },
];

const ALERTS = [
  { level: 'warn', time: '12:34', text: 'SMTP — limite de débit approchée (tenant: Demo Corp)' },
  { level: 'ok', time: '10:15', text: 'Pool de connexions DB restauré (pic à 95%)' },
  { level: 'info', time: '08:02', text: 'Déploiement v1.3.2 appliqué — 0 downtime' },
  { level: 'info', time: 'Hier 23:47', text: 'Backup automatique terminé (234 MB)' },
];

const LEVEL_COLOR = { ok: '#10b981', warn: '#f59e0b', error: '#ef4444', info: '#0ea5e9' };
const LEVEL_LABEL = { ok: 'OK', warn: 'Warning', error: 'Erreur', info: 'Info' };

function ServiceCard({ svc }) {
  const Icon = svc.icon;
  const statusColor = svc.status === 'ok' ? '#10b981' : svc.status === 'warn' ? '#f59e0b' : '#ef4444';
  const StatusIcon = svc.status === 'ok' ? CheckCircleIcon : svc.status === 'warn' ? WarningAmberIcon : ErrorIcon;

  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1.25}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
              <Icon sx={{ fontSize: 18, color: '#475569' }} />
            </Box>
            <Typography variant="body2" fontWeight={600}>{svc.name}</Typography>
          </Box>
          <StatusIcon sx={{ fontSize: 18, color: statusColor }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1}>{svc.uptime}%</Typography>
            <Typography variant="caption" color="text.secondary">Uptime 30j</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1}>{svc.latency}</Typography>
            <Typography variant="caption" color="text.secondary">Latence moy.</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1}>{svc.requests24h.toLocaleString('fr-FR')}</Typography>
            <Typography variant="caption" color="text.secondary">Req. 24h</Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={svc.uptime}
          sx={{
            height: 4, borderRadius: 4,
            bgcolor: `${statusColor}20`,
            '& .MuiLinearProgress-bar': { bgcolor: statusColor, borderRadius: 4 },
          }}
        />
      </CardContent>
    </Card>
  );
}

export default function OwnerMonitoring() {
  const [tick, setTick] = useState(0);
  const allOk = SERVICES.every((s) => s.status === 'ok');
  const hasWarn = SERVICES.some((s) => s.status === 'warn');

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box>
      {/* Global status banner */}
      <Card sx={{
        border: `1px solid ${hasWarn ? '#fcd34d' : '#bbf7d0'}`,
        bgcolor: hasWarn ? '#fffbeb' : '#f0fdf4',
        boxShadow: 'none', borderRadius: 2, mb: 3,
      }}>
        <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasWarn
            ? <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
            : <CheckCircleIcon sx={{ color: '#10b981', fontSize: 26 }} />}
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700} sx={{ color: hasWarn ? '#92400e' : '#14532d', lineHeight: 1.2 }}>
              {hasWarn ? 'Dégradation partielle' : 'Tous les systèmes opérationnels'}
            </Typography>
            <Typography variant="caption" sx={{ color: hasWarn ? '#b45309' : '#166534' }}>
              {hasWarn ? '1 service en avertissement — surveillance active' : 'Plateforme Pylon Pyx 100% disponible'}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', flexShrink: 0 }}>
            Mis à jour à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </CardContent>
      </Card>

      {/* KPIs row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Requêtes API (24h)', value: '4 231', icon: SpeedIcon, color: '#0ea5e9' },
          { label: 'Jobs en file', value: '3', icon: CloudQueueIcon, color: '#6366f1' },
          { label: 'Erreurs (24h)', value: '3', icon: ErrorIcon, color: '#ef4444' },
          { label: 'Sessions actives', value: '12', icon: RouterIcon, color: '#10b981' },
        ].map((k) => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: `${k.color}15`, borderRadius: 1.5 }}>
                  <k.icon sx={{ fontSize: 18, color: k.color }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} lineHeight={1}>{k.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Services grid */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#0f172a' }}>
        Services
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {SERVICES.map((svc) => (
          <Grid item xs={12} sm={6} key={svc.name}>
            <ServiceCard svc={svc} />
          </Grid>
        ))}
      </Grid>

      {/* Alerts log */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Journal des alertes</Typography>
          <Typography variant="caption" color="text.secondary">Événements plateforme récents</Typography>
        </Box>
        {ALERTS.map((a, i) => (
          <React.Fragment key={i}>
            <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label={LEVEL_LABEL[a.level]} size="small" sx={{
                bgcolor: `${LEVEL_COLOR[a.level]}18`,
                color: LEVEL_COLOR[a.level],
                fontWeight: 700, fontSize: 11, height: 20, flexShrink: 0,
              }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', flexShrink: 0, fontFamily: 'monospace', fontSize: 11 }}>
                {a.time}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569' }}>{a.text}</Typography>
            </Box>
            {i < ALERTS.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>
    </Box>
  );
}
