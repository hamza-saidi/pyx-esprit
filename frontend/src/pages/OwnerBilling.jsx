import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const PLAN_COLORS = { starter: '#6366f1', pro: '#0ea5e9', enterprise: '#f59e0b' };
const DEFAULT_PLAN_COLOR = '#64748b';
const STATUT_CONFIG = {
  payee: { label: 'Payée', bg: '#dcfce7', color: '#16a34a' },
  en_attente: { label: 'En attente', bg: '#fef3c7', color: '#d97706' },
  en_retard: { label: 'En retard', bg: '#fee2e2', color: '#ef4444' },
  annulee: { label: 'Annulée', bg: '#f1f5f9', color: '#94a3b8' },
};

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
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ club_id: '', montant: '', date_echeance: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, summaryRes, clubsRes] = await Promise.all([
        axios.get('/superadmin/invoices'),
        axios.get('/superadmin/billing/summary'),
        axios.get('/superadmin/clubs'),
      ]);
      setInvoices(invRes.data);
      setSummary(summaryRes.data);
      setClubs(clubsRes.data);
    } catch (e) {
      setError('Impossible de charger la facturation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = () => {
    setForm({ club_id: '', montant: '', date_echeance: '' });
    setOpen(true);
  };

  const handleClubChange = (clubId) => {
    const club = clubs.find((c) => c.id === clubId);
    setForm({
      ...form,
      club_id: clubId,
      montant: club?.licence?.plan?.prix_mensuel ?? '',
    });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/superadmin/invoices', {
        club_id: form.club_id,
        montant: form.montant || undefined,
        date_echeance: form.date_echeance || undefined,
      });
      toast.success('Facture générée.');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la génération.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (invoice) => {
    const nextStatut = invoice.statut === 'payee' ? 'en_attente' : 'payee';
    try {
      await axios.patch(`/superadmin/invoices/${invoice.id}`, { statut: nextStatut });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2.5}>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpen}>
          Générer une facture
        </Button>
      </Box>

      {/* Revenue KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <RevCard icon={AccountBalanceIcon} label="MRR" value={`${summary.mrr} TND`} color="#10b981" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={TrendingUpIcon} label="ARR (projeté)" value={`${summary.arr} TND`} sub="Base MRR × 12" color="#0ea5e9" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={CreditCardIcon} label="Paiements en attente" value={summary.paiements_en_attente} color="#f59e0b" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <RevCard icon={ReceiptIcon} label={`Factures (${new Date().getFullYear()})`} value={summary.factures_cette_annee} color="#6366f1" />
        </Grid>
      </Grid>

      {/* Revenue by plan */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {summary.revenu_par_plan.map((p) => {
          const color = PLAN_COLORS[p.plan?.toLowerCase()] || DEFAULT_PLAN_COLOR;
          return (
            <Grid item xs={12} sm={4} key={p.plan}>
              <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={600} sx={{ color }}>{p.plan}</Typography>
                    <Chip label={`${p.tenants} tenant${p.tenants !== 1 ? 's' : ''}`} size="small"
                      sx={{ bgcolor: `${color}15`, color, fontWeight: 700, height: 20, fontSize: 11 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={800}>{p.revenu_total} TND</Typography>
                  <Typography variant="caption" color="text.secondary">{p.montant_mensuel} TND / tenant / mois</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {summary.revenu_par_plan.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">Aucun abonnement actif pour le moment.</Alert>
          </Grid>
        )}
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
                {['N° Facture', 'Tenant', 'Plan', 'Montant', 'Date', 'Statut', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    Aucune facture pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => {
                const cfg = STATUT_CONFIG[inv.statut] || STATUT_CONFIG.en_attente;
                const planNom = inv.subscription?.plan?.nom || '—';
                const planColor = PLAN_COLORS[inv.subscription?.plan?.slug] || DEFAULT_PLAN_COLOR;
                return (
                  <TableRow key={inv.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: 1 }}>
                        {inv.reference}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{inv.club?.nom || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={planNom}
                        size="small"
                        sx={{ bgcolor: `${planColor}18`, color: planColor, fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{inv.montant} {inv.devise}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{inv.date_emission?.slice(0, 10)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, height: 22, fontSize: 11 }} />
                    </TableCell>
                    <TableCell align="right">
                      {inv.statut !== 'annulee' && (
                        <Tooltip title={inv.statut === 'payee' ? 'Marquer impayée' : 'Marquer payée'}>
                          <IconButton size="small" onClick={() => toggleStatus(inv)}>
                            {inv.statut === 'payee' ? <UndoIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" color="success" />}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* Generate invoice dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Générer une facture</DialogTitle>
        <form onSubmit={handleGenerate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Tenant</InputLabel>
              <Select
                value={form.club_id}
                label="Tenant"
                onChange={(e) => handleClubChange(e.target.value)}
              >
                {clubs.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Montant (TND)"
              type="number"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              helperText="Pré-rempli depuis le plan actif du tenant, modifiable."
              fullWidth
            />
            <TextField
              label="Date d'échéance (optionnel)"
              type="date"
              value={form.date_echeance}
              onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving || !form.club_id}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Générer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
