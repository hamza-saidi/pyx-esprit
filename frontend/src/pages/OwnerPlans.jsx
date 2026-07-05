import React from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider, Table,
  TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const PLANS = [
  {
    id: 'starter',
    nom: 'Starter',
    prix: '49 TND',
    periode: '/ mois',
    color: '#6366f1',
    tenants: 0,
    contacts: '5 000',
    emails: '50 000',
    users: '3',
    automations: false,
    api: false,
    sla: false,
    support: 'Email',
    description: 'Pour démarrer avec les bases du marketing email',
  },
  {
    id: 'pro',
    nom: 'Professional',
    prix: '149 TND',
    periode: '/ mois',
    color: '#0ea5e9',
    tenants: 2,
    contacts: '50 000',
    emails: '500 000',
    users: '10',
    automations: true,
    api: false,
    sla: false,
    support: 'Email + Chat',
    description: 'Pour les équipes marketing actives',
    popular: true,
  },
  {
    id: 'enterprise',
    nom: 'Enterprise',
    prix: 'Sur devis',
    periode: '',
    color: '#f59e0b',
    tenants: 1,
    contacts: 'Illimités',
    emails: 'Illimités',
    users: 'Illimités',
    automations: true,
    api: true,
    sla: true,
    support: 'Dédié 24/7',
    description: 'Pour les grandes organisations',
  },
];

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

export default function OwnerPlans() {
  const totalTenants = PLANS.reduce((s, p) => s + p.tenants, 0);

  return (
    <Box>
      {/* Summary row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {PLANS.map((plan) => (
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
                {PLANS.map((p) => (
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
                  {PLANS.map((p) => (
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
