import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import axios from '../api/axios';

const SERVICE_ICONS = {
  'Base de données': StorageIcon,
  'Redis / BullMQ': CloudQueueIcon,
  'Service email': EmailIcon,
};

const STATUS_COLOR = { ok: '#10b981', warn: '#f59e0b', error: '#ef4444' };
const STATUS_LABEL = { ok: 'Opérationnel', warn: 'Non configuré', error: 'En panne' };
const LEVEL_COLOR = { error: '#ef4444', warn: '#f59e0b' };
const LEVEL_LABEL = { error: 'Erreur', warn: 'Warning' };

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function ServiceCard({ svc }) {
  const Icon = SERVICE_ICONS[svc.name] || StorageIcon;
  const color = STATUS_COLOR[svc.status];
  const StatusIcon = svc.status === 'ok' ? CheckCircleIcon : svc.status === 'warn' ? WarningAmberIcon : ErrorIcon;

  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1.25}>
          <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
            <Icon sx={{ fontSize: 18, color: '#475569' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>{svc.name}</Typography>
            <Typography variant="caption" sx={{ color }}>{STATUS_LABEL[svc.status]}</Typography>
          </Box>
        </Box>
        <StatusIcon sx={{ fontSize: 22, color }} />
      </CardContent>
    </Card>
  );
}

export default function OwnerMonitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/superadmin/monitoring');
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Impossible de charger les métriques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  const degraded = data.status !== 'ok';

  return (
    <Box>
      {/* Global status banner */}
      <Card sx={{
        border: `1px solid ${degraded ? '#fcd34d' : '#bbf7d0'}`,
        bgcolor: degraded ? '#fffbeb' : '#f0fdf4',
        boxShadow: 'none', borderRadius: 2, mb: 3,
      }}>
        <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          {degraded
            ? <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
            : <CheckCircleIcon sx={{ color: '#10b981', fontSize: 26 }} />}
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700} sx={{ color: degraded ? '#92400e' : '#14532d', lineHeight: 1.2 }}>
              {degraded ? 'Dégradation partielle' : 'Tous les systèmes opérationnels'}
            </Typography>
            <Typography variant="caption" sx={{ color: degraded ? '#b45309' : '#166534' }}>
              Uptime process : {formatUptime(data.uptime_seconds)}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', flexShrink: 0 }}>
            Mis à jour à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </CardContent>
      </Card>

      {/* KPIs row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: '#6366f115', borderRadius: 1.5 }}>
                <CloudQueueIcon sx={{ fontSize: 18, color: '#6366f1' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1}>
                  {data.queue.available ? data.queue.waiting + data.queue.active + data.queue.delayed : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.queue.available ? 'Jobs en file (BullMQ)' : 'Queue BullMQ non configurée'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: '#ef444415', borderRadius: 1.5 }}>
                <ErrorIcon sx={{ fontSize: 18, color: '#ef4444' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1}>{data.erreurs_24h}</Typography>
                <Typography variant="caption" color="text.secondary">Erreurs / warnings (24h)</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: '#0ea5e915', borderRadius: 1.5 }}>
                <AccessTimeIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1}>{formatUptime(data.uptime_seconds)}</Typography>
                <Typography variant="caption" color="text.secondary">Uptime process</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Services grid */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#0f172a' }}>
        Services
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.services.map((svc) => (
          <Grid item xs={12} sm={4} key={svc.name}>
            <ServiceCard svc={svc} />
          </Grid>
        ))}
      </Grid>

      {/* Recent errors log */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Journal des erreurs</Typography>
          <Typography variant="caption" color="text.secondary">
            Lignes [ERROR]/[WARN] des dernières 24h (backend/logs/app.log)
          </Typography>
        </Box>
        {data.journal.length === 0 && (
          <Box sx={{ px: 3, py: 4, textAlign: 'center', color: '#94a3b8' }}>
            <Typography variant="body2">Aucune erreur sur les dernières 24h</Typography>
          </Box>
        )}
        {data.journal.map((e, i) => (
          <React.Fragment key={i}>
            <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label={LEVEL_LABEL[e.level]} size="small" sx={{
                bgcolor: `${LEVEL_COLOR[e.level]}18`,
                color: LEVEL_COLOR[e.level],
                fontWeight: 700, fontSize: 11, height: 20, flexShrink: 0,
              }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', flexShrink: 0, fontFamily: 'monospace', fontSize: 11 }}>
                {e.timestamp.slice(0, 19).replace('T', ' ')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.message}
              </Typography>
            </Box>
            {i < data.journal.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>
    </Box>
  );
}
