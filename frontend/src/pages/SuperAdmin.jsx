import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Table, TableBody,
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, IconButton, Tooltip,
  LinearProgress, Avatar, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import GolfCourseIcon from '@mui/icons-material/GolfCourse';
import BarChartIcon from '@mui/icons-material/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from '../api/axios';

const STATUT_COLORS = { actif: '#10b981', suspendu: '#f59e0b', archive: '#ef4444' };

function StatCard({ icon, label, value, color = '#2563eb' }) {
  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
        <Box sx={{ p: 1.5, bgcolor: `${color}15`, borderRadius: 2, display: 'inline-flex' }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} lineHeight={1}>{value ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SuperAdmin() {
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ nom: '', slug: '', email_contact: '', admin_email: '', admin_nom: '', admin_password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        axios.get('/superadmin/stats'),
        axios.get('/superadmin/clubs'),
      ]);
      setStats(s.data);
      setClubs(c.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await axios.post('/superadmin/clubs', form);
      setSuccess(`Club "${form.nom}" créé avec succès.`);
      setCreateOpen(false);
      setForm({ nom: '', slug: '', email_contact: '', admin_email: '', admin_nom: '', admin_password: '' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatut = async (club) => {
    const next = club.statut === 'actif' ? 'suspendu' : 'actif';
    try {
      await axios.patch(`/superadmin/clubs/${club.id}`, { statut: next });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const autoSlug = (nom) => nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Console Pylon</Typography>
          <Typography variant="body2" color="text.secondary">
            Administration globale de la plateforme SaaS
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Actualiser">
            <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nouveau club
          </Button>
        </Box>
      </Box>

      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => { setError(null); setSuccess(null); }}>
          {error || success}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Stats globales */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<GolfCourseIcon />} label="Clubs actifs" value={stats?.clubs_actifs} color="#2563eb" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<PeopleIcon />} label="Contacts total" value={stats?.total_contacts?.toLocaleString()} color="#10b981" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<EmailIcon />} label="Campagnes" value={stats?.total_campagnes} color="#8b5cf6" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard icon={<BarChartIcon />} label="Emails envoyés" value={stats?.total_envois?.toLocaleString()} color="#f59e0b" />
            </Grid>
          </Grid>

          {/* Table des clubs */}
          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Typography fontWeight={700}>Clubs / Tenants ({clubs.length})</Typography>
            </Box>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Club</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Contacts</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Utilisateurs</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Campagnes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ bgcolor: '#2563eb', width: 32, height: 32, fontSize: 13, fontWeight: 700 }}>
                          {club.nom.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{club.nom}</Typography>
                          <Typography variant="caption" color="text.secondary">{club.email_contact}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: '#f1f5f9', px: 1, py: 0.5, borderRadius: 1 }}>
                        {club.slug}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700}>{club._stats?.contacts ?? 0}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700}>{club._stats?.users ?? 0}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700}>{club._stats?.campagnes ?? 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={club.statut}
                        size="small"
                        sx={{ bgcolor: `${STATUT_COLORS[club.statut]}20`, color: STATUT_COLORS[club.statut], fontWeight: 700, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={club.statut === 'actif' ? 'Suspendre' : 'Réactiver'}>
                        <IconButton size="small" onClick={() => toggleStatut(club)} color={club.statut === 'actif' ? 'warning' : 'success'}>
                          {club.statut === 'actif' ? <PauseCircleIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Dialog création club */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nouveau club / tenant</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Informations du club</Typography>
          <TextField label="Nom du club *" value={form.nom} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, nom: e.target.value, slug: autoSlug(e.target.value) }))} />
          <TextField label="Slug (URL unique) *" value={form.slug} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
            helperText="Identifiant URL : letters, chiffres, tirets uniquement" />
          <TextField label="Email contact club" value={form.email_contact} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, email_contact: e.target.value }))} />
          <Divider />
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Compte administrateur du club</Typography>
          <TextField label="Nom de l'admin *" value={form.admin_nom} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, admin_nom: e.target.value }))} />
          <TextField label="Email admin *" type="email" value={form.admin_email} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value }))} />
          <TextField label="Mot de passe admin *" type="password" value={form.admin_password} size="small" fullWidth
            onChange={(e) => setForm(f => ({ ...f, admin_password: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" color="secondary" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}>
            Créer le club
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
