import React from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, Divider,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptIcon from '@mui/icons-material/Receipt';

const INVOICES = [
  { id: 'INV-2026-007', tenant: 'Demo Corp', plan: 'Enterprise', montant: '350 TND', date: '2026-07-01', statut: 'payée' },
  { id: 'INV-2026-006', tenant: 'Demo Corp', plan: 'Professional', montant: '149 TND', date: '2026-07-01', statut: 'payée' },
  { id: 'INV-2026-005', tenant: 'Demo Corp', plan: 'Enterprise', montant: '350 TND', date: '2026-06-01', statut: 'payée' },
  { id: 'INV-2026-004', tenant: 'Demo Corp', plan: 'Professional', montant: '149 TND', date: '2026-06-01', statut: 'payée' },
  { id: 'INV-2026-003', tenant: 'Demo Corp', plan: 'Starter', montant: '49 TND', date: '2026-05-01', statut: 'payée' },
];

const PLAN_COLORS = { Starter: '#6366f1', Professional: '#0ea5e9', Enterprise: '#f59e0b' };

function RevCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight={800} lineHeight={1}>{value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>{label}</Typography>
            {sub && (
              <Typography variant="caption" sx={{ color, fontWeight: 600, display: 'block', mt: 0.25 }}>{sub}</Typography>
            )}
          </Box>
          <Box sx={{ p: 1.25, bgcolor: `${color}15`, borderRadius: 1.5 }}>
            <Icon sx={{ fontSize: 20, color }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function OwnerBilling() {
  return (
    <Box>
      {/* Revenue KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <RevCard icon={AccountBalanceIcon} label="MRR" value="499 TND" sub="+12% ce mois" color="#10b981" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={TrendingUpIcon} label="ARR (projeté)" value="5 988 TND" sub="Base MRR × 12" color="#0ea5e9" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={CreditCardIcon} label="Paiements en attente" value="0" color="#f59e0b" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={ReceiptIcon} label="Factures (2026)" value={INVOICES.length.toString()} sub="Toutes payées" color="#6366f1" />
        </Grid>
      </Grid>

      {/* Revenue by plan */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { plan: 'Starter', montant: '49 TND', tenants: 0, color: '#6366f1' },
          { plan: 'Professional', montant: '149 TND', tenants: 2, color: '#0ea5e9' },
          { plan: 'Enterprise', montant: '350 TND', tenants: 1, color: '#f59e0b' },
        ].map((p) => (
          <Grid item xs={12} sm={4} key={p.plan}>
            <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: p.color }}>{p.plan}</Typography>
                  <Chip label={`${p.tenants} tenant${p.tenants !== 1 ? 's' : ''}`} size="small"
                    sx={{ bgcolor: `${p.color}15`, color: p.color, fontWeight: 700, height: 20, fontSize: 11 }} />
                </Box>
                <Typography variant="h6" fontWeight={800}>{p.tenants * parseInt(p.montant) || 0} TND</Typography>
                <Typography variant="caption" color="text.secondary">{p.montant} / tenant / mois</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Invoice history */}
      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Historique de facturation</Typography>
          <Typography variant="caption" color="text.secondary">Dernières transactions</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['N° Facture', 'Tenant', 'Plan', 'Montant', 'Date', 'Statut'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {INVOICES.map((inv) => (
                <TableRow key={inv.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: 1 }}>
                      {inv.id}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{inv.tenant}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.plan}
                      size="small"
                      sx={{ bgcolor: `${PLAN_COLORS[inv.plan]}18`, color: PLAN_COLORS[inv.plan], fontWeight: 700, height: 22, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{inv.montant}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{inv.date}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label="Payée" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, height: 22, fontSize: 11 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
