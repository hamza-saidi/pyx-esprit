import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Table,
  TableBody, TableCell, TableHead, TableRow, CircularProgress, Alert,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import axios from '../api/axios';

// Cosmetic only (not stored server-side) - keyed by slug so new plans added
// later just fall back to a neutral color instead of breaking.
const PLAN_COLORS = { starter: '#6366f1', pro: '#0ea5e9', enterprise: '#f59e0b' };
const DEFAULT_COLOR = '#64748b';

const FEATURES = [
  { label: 'Contacts', key: 'contacts' },
  { label: 'Emails / mois', key: 'emails' },
  { label: 'Utilisateurs', key: 'users' },
  { label: 'Automatisations', key: 'automations', bool: true },
  { label: 'Accès API', key: 'api', bool: true },
  { label: 'SLA garanti', key: 'sla', bool: true },
  { label: 'Support', key: 'support' },
];

function FeatureValue({ val }) {
  if (val === true) return <CheckIcon sx={{ color: '#10b981', fontSize: 18 }} />;
  if (val === false) return <RemoveIcon sx={{ color: '#cbd5e1', fontSize: 18 }} />;
  return <Typography variant="body2" fontWeight={500}>{val}</Typography>;
}

function toDisplayPlan(p) {
  const color = PLAN_COLORS[p.slug] || DEFAULT_COLOR;
  return {
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    prix: p.prix_mensuel != null ? `${Number(p.prix_mensuel)} ${p.devise}` : 'Sur devis',
    periode: p.prix_mensuel != null ? '/ mois' : '',
    color,
    popular: p.slug === 'pro',
    tenants: p.tenants || 0,
    contacts: p.contacts_limit || 'Illimités',
    emails: p.emails_limit || 'Illimités',
    users: p.users_limit || 'Illimités',
    automations: !!p.automations_enabled,
    api: !!p.api_enabled,
    sla: !!p.sla_enabled,
    support: p.support_level || '—',
    description: p.description || '',
  };
}

export default function OwnerPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get('/superadmin/plans')
      .then(({ data }) => setPlans(data.map(toDisplayPlan)))
      .catch(() => setError('Impossible de charger les plans.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalTenants = plans.reduce((s, p) => s + p.tenants, 0);

  return (
    <Box>
      {/* Summary row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {plans.map((plan) => (
          <Grid item xs={12} sm={4} key={plan.id}>
            <Card sx={{
              border: `1px solid ${plan.popular ? plan.color : '#e2e8f0'}`,
              boxShadow: plan.popular ? `0 0 0 1px ${plan.color}` : 'none',
              borderRadius: 2,
              position: 'relative',
              overflow: 'visible',
            }}>
              {plan.popular && (
                <Box sx={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  bgcolor: plan.color, color: '#fff', px: 1.5, py: 0.25, borderRadius: 5,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  Le plus populaire
                </Box>
              )}
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Box>
                    <Typography fontWeight={700} sx={{ color: plan.color }}>{plan.nom}</Typography>
                    <Typography variant="caption" color="text.secondary">{plan.description}</Typography>
                  </Box>
                  <Box sx={{ p: 1, bgcolor: `${plan.color}15`, borderRadius: 1.5 }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 18, color: plan.color }} />
                  </Box>
                </Box>
                <Box display="flex" alignItems="baseline" gap={0.5} mb={1.5}>
                  <Typography variant="h5" fontWeight={800}>{plan.prix}</Typography>
                  <Typography variant="caption" color="text.secondary">{plan.periode}</Typography>
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tenants actifs</Typography>
                  <Chip
                    label={plan.tenants}
                    size="small"
                    sx={{ bgcolor: `${plan.color}15`, color: plan.color, fontWeight: 700, height: 22 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Feature matrix */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Comparaison des fonctionnalités</Typography>
          <Typography variant="caption" color="text.secondary">
            {totalTenants} tenant{totalTenants !== 1 ? 's' : ''} actif{totalTenants !== 1 ? 's' : ''} au total
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>Fonctionnalité</TableCell>
                {plans.map((p) => (
                  <TableCell key={p.id} align="center" sx={{ fontWeight: 700, color: p.color, fontSize: 13 }}>
                    {p.nom}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {FEATURES.map((feat) => (
                <TableRow key={feat.key} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ color: '#475569', fontSize: 13 }}>{feat.label}</TableCell>
                  {plans.map((p) => (
                    <TableCell key={p.id} align="center">
                      <FeatureValue val={p[feat.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
