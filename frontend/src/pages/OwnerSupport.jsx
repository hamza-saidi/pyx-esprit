import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Avatar, TextField, InputAdornment, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import AddIcon from '@mui/icons-material/Add';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const PRIORITE_COLORS = { haute: '#ef4444', normale: '#f59e0b', basse: '#10b981' };
const STATUT_COLORS = { ouvert: '#ef4444', en_cours: '#f59e0b', resolu: '#10b981' };
const STATUT_LABELS = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu' };
const PRIORITE_LABELS = { haute: 'Haute', normale: 'Normale', basse: 'Basse' };

const emptyForm = { club_id: '', sujet: '', description: '', categorie: '', priorite: 'normale' };

export default function OwnerSupport() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ticketsRes, clubsRes] = await Promise.all([
        axios.get('/superadmin/tickets'),
        axios.get('/superadmin/clubs'),
      ]);
      setTickets(ticketsRes.data);
      setClubs(clubsRes.data);
    } catch (e) {
      setError('Impossible de charger les tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter((t) =>
    !search ||
    t.sujet.toLowerCase().includes(search.toLowerCase()) ||
    (t.club?.nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/superadmin/tickets', {
        club_id: form.club_id || undefined,
        sujet: form.sujet,
        description: form.description || undefined,
        categorie: form.categorie || undefined,
        priorite: form.priorite,
      });
      toast.success('Ticket créé.');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatutChange = async (ticket, statut) => {
    try {
      await axios.patch(`/superadmin/tickets/${ticket.id}`, { statut });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>;
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  const openCount = tickets.filter((t) => t.statut === 'ouvert').length;
  const inProgress = tickets.filter((t) => t.statut === 'en_cours').length;
  const resolved = tickets.filter((t) => t.statut === 'resolu').length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
        {/* Summary chips */}
        <Box display="flex" gap={1.5} flexWrap="wrap">
          {[
            { label: `${openCount} ouvert${openCount !== 1 ? 's' : ''}`, color: '#ef4444' },
            { label: `${inProgress} en cours`, color: '#f59e0b' },
            { label: `${resolved} résolus`, color: '#10b981' },
          ].map((s) => (
            <Chip key={s.label} label={s.label} size="small"
              sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 700, fontSize: 12, height: 26 }} />
          ))}
        </Box>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpen}>
          Nouveau ticket
        </Button>
      </Box>

      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Tickets support</Typography>
            <Typography variant="caption" color="text.secondary">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>,
              sx: { fontSize: 13, borderRadius: 1.5 },
            }}
            sx={{ minWidth: 220 }}
          />
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['#', 'Tenant', 'Sujet', 'Catégorie', 'Priorité', 'Statut', 'Date'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    <HeadsetMicIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.35 }} />
                    Aucun ticket
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>T-{t.id}</Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ bgcolor: '#0ea5e9', width: 26, height: 26, fontSize: 11, fontWeight: 700 }}>
                        {(t.club?.nom || 'Plateforme').charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>{t.club?.nom || 'Plateforme'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                      {t.sujet}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {t.categorie ? (
                      <Chip label={t.categorie} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, height: 20, fontSize: 11 }} />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITE_LABELS[t.priorite]}
                      size="small"
                      sx={{ bgcolor: `${PRIORITE_COLORS[t.priorite]}18`, color: PRIORITE_COLORS[t.priorite], fontWeight: 700, height: 22, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={t.statut}
                      onChange={(e) => handleStatutChange(t, e.target.value)}
                      size="small"
                      variant="standard"
                      disableUnderline
                      sx={{
                        fontSize: 11, fontWeight: 700, color: STATUT_COLORS[t.statut],
                        '& .MuiSelect-select': { py: 0.25, bgcolor: `${STATUT_COLORS[t.statut]}18`, borderRadius: 1, px: 1 },
                      }}
                    >
                      {Object.entries(STATUT_LABELS).map(([val, label]) => (
                        <MenuItem key={val} value={val} sx={{ fontSize: 12 }}>{label}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{t.date_creation?.slice(0, 10)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* New ticket dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau ticket</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tenant (optionnel)</InputLabel>
              <Select
                value={form.club_id}
                label="Tenant (optionnel)"
                onChange={(e) => setForm({ ...form, club_id: e.target.value })}
              >
                <MenuItem value=""><em>— Concerne la plateforme —</em></MenuItem>
                {clubs.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Sujet"
              value={form.sujet}
              onChange={(e) => setForm({ ...form, sujet: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Catégorie"
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                placeholder="Import, Email, Config…"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={form.priorite}
                  label="Priorité"
                  onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                >
                  <MenuItem value="haute">Haute</MenuItem>
                  <MenuItem value="normale">Normale</MenuItem>
                  <MenuItem value="basse">Basse</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving || !form.sujet.trim()}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
