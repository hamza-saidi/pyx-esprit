import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Avatar, LinearProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import axios from '../api/axios';

const PLAN_COLORS = { starter: '#6366f1', pro: '#0ea5e9', enterprise: '#f59e0b' };
const DEFAULT_PLAN_COLOR = '#64748b';

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function ExpireBadge({ days }) {
  if (days < 0) return <Chip label="Expirée" size="small" sx={{ bgcolor: '#fee2e2', color: '#ef4444', fontWeight: 700, height: 22 }} />;
  if (days <= 30) return <Chip label={`${days}j`} size="small" sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 700, height: 22 }} />;
  return <Chip label={`${days}j`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, height: 22 }} />;
}

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

  // c.licence is the club's active Subscription (joined to Plan), or null if
  // none was ever assigned - real data from GET /superadmin/clubs, no
  // fabrication.
  const enriched = clubs.map((c) => ({
    ...c,
    plan: c.licence?.plan?.slug || null,
    planNom: c.licence?.plan?.nom || null,
    expiry: c.licence?.date_fin ? c.licence.date_fin.slice(0, 10) : null,
    licenceKey: c.licence?.licence_key || null,
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
                  const days = c.expiry ? daysUntil(c.expiry) : null;
                  const planColor = c.plan ? (PLAN_COLORS[c.plan] || DEFAULT_PLAN_COLOR) : '#94a3b8';
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
                        {c.licenceKey ? (
                          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f1f5f9', color: '#475569', px: 1, py: 0.4, borderRadius: 1 }}>
                            {c.licenceKey}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.planNom ? (
                          <Chip
                            label={c.planNom}
                            size="small"
                            sx={{
                              bgcolor: `${planColor}18`,
                              color: planColor,
                              fontWeight: 700, fontSize: 11, height: 22,
                            }}
                          />
                        ) : (
                          <Chip label="Aucun plan" size="small" sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', fontWeight: 700, fontSize: 11, height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{c.expiry || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {days != null ? <ExpireBadge days={days} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
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
