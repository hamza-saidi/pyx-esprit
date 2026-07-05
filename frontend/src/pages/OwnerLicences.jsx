import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Avatar, LinearProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import axios from '../api/axios';

const PLAN_COLORS = { starter: '#6366f1', pro: '#0ea5e9', enterprise: '#f59e0b' };

function maskKey(slug) {
  const hash = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'PLX-';
  for (let i = 0; i < 12; i++) key += chars[(hash * (i + 1) * 7) % chars.length];
  return key.slice(0, 8) + '-****-****';
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function ExpireBadge({ days }) {
  if (days < 0) return <Chip label="Expirée" size="small" sx={{ bgcolor: '#fee2e2', color: '#ef4444', fontWeight: 700, height: 22 }} />;
  if (days <= 30) return <Chip label={`${days}j`} size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, height: 22 }} />;
  return <Chip label={`${days}j`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, height: 22 }} />;
}

const PLAN_ASSIGN = { 0: 'pro', 1: 'enterprise' };

export default function OwnerLicences() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/superadmin/clubs');
      setClubs(data);
    } catch (e) {
      setError('Impossible de charger les licences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enriched = clubs.map((c, i) => ({
    ...c,
    plan: PLAN_ASSIGN[i] || 'starter',
    expiry: new Date(Date.now() + ((i + 1) * 90 + 60) * 86400000).toISOString().slice(0, 10),
    licenceKey: maskKey(c.slug || String(c.id)),
  }));

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <LinearProgress sx={{ borderRadius: 4 }} />
      ) : (
        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Licences actives</Typography>
              <Typography variant="caption" color="text.secondary">
                {enriched.filter((c) => c.statut === 'actif').length} licence{enriched.filter((c) => c.statut === 'actif').length !== 1 ? 's' : ''} active{enriched.filter((c) => c.statut === 'actif').length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Tooltip title="Actualiser">
              <IconButton onClick={load} size="small" sx={{ color: '#64748b' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['Tenant', 'Clé de licence', 'Plan', 'Expiration', 'Jours restants', 'Statut'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {enriched.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      <VpnKeyIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.35 }} />
                      Aucune licence
                    </TableCell>
                  </TableRow>
                )}
                {enriched.map((c) => {
                  const days = daysUntil(c.expiry);
                  return (
                    <TableRow key={c.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ bgcolor: '#0ea5e9', width: 30, height: 30, fontSize: 12, fontWeight: 700 }}>
                            {c.nom?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{c.nom}</Typography>
                            <Typography variant="caption" color="text.secondary">{c.email_contact}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f1f5f9', color: '#475569', px: 1, py: 0.4, borderRadius: 1 }}>
                          {c.licenceKey}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.plan.charAt(0).toUpperCase() + c.plan.slice(1)}
                          size="small"
                          sx={{
                            bgcolor: `${PLAN_COLORS[c.plan]}18`,
                            color: PLAN_COLORS[c.plan],
                            fontWeight: 700, fontSize: 11, height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{c.expiry}</Typography>
                      </TableCell>
                      <TableCell>
                        <ExpireBadge days={days} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.statut === 'actif' ? 'Active' : c.statut === 'suspendu' ? 'Suspendue' : 'Archivée'}
                          size="small"
                          sx={{
                            bgcolor: c.statut === 'actif' ? '#dcfce7' : '#fee2e2',
                            color: c.statut === 'actif' ? '#16a34a' : '#ef4444',
                            fontWeight: 700, fontSize: 11, height: 22,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </Box>
  );
}
