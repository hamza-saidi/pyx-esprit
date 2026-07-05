import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Table, TableBody,
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, IconButton, Tooltip,
  LinearProgress, Avatar, Divider, Menu, MenuItem, ListItemIcon,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import axios from '../api/axios';

const STATUT_COLORS = { actif: '#10b981', suspendu: '#f59e0b', archive: '#64748b' };
const STATUT_LABELS = { actif: 'Actif', suspendu: 'Suspendu', archive: 'Archivé' };

function StatCard({ icon, label, value, sub, color = '#2563eb' }) {
  return (
    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} lineHeight={1} sx={{ color: '#0f172a' }}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" sx={{ color, fontWeight: 600, display: 'block', mt: 0.25 }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 1.25, bgcolor: `${color}15`, borderRadius: 1.5, display: 'inline-flex', flexShrink: 0 }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 20 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function TenantActionsMenu({ club, onUpdate }) {
  const [anchor, setAnchor] = useState(null);

  const handle = async (nextStatut) => {
    setAnchor(null);
    await onUpdate(club, nextStatut);
  };

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        PaperProps={{ sx: { boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: 1.5, minWidth: 160 } }}>
        {club.statut === 'actif' && (
          <MenuItem onClick={() => handle('suspendu')}>
            <ListItemIcon><PauseCircleIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon>
            <Typography variant="body2">Suspendre</Typography>
          </MenuItem>
        )}
        {club.statut === 'suspendu' && (
          <MenuItem onClick={() => handle('actif')}>
            <ListItemIcon><PlayCircleIcon fontSize="small" sx={{ color: '#10b981' }} /></ListItemIcon>
            <Typography variant="body2">Réactiver</Typography>
          </MenuItem>
        )}
        {club.statut === 'archive' && (
          <MenuItem onClick={() => handle('actif')}>
            <ListItemIcon><CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} /></ListItemIcon>
            <Typography variant="body2">Restaurer</Typography>
          </MenuItem>
        )}
        {club.statut !== 'archive' && (
          <MenuItem onClick={() => handle('archive')} sx={{ color: '#ef4444' }}>
            <ListItemIcon><ArchiveIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            <Typography variant="body2" color="error">Archiver</Typography>
          </MenuItem>
        )}
      </Menu>
    </>
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
      setSuccess(`Tenant "${form.nom}" provisionné avec succès.`);
      setCreateOpen(false);
      setForm({ nom: '', slug: '', email_contact: '', admin_email: '', admin_nom: '', admin_password: '' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatut = async (club, nextStatut) => {
    try {
      await axios.patch(`/superadmin/clubs/${club.id}`, { statut: nextStatut });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const autoSlug = (nom) =>
    nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const actifs = clubs.filter((c) => c.statut === 'actif').length;
  const suspendus = clubs.filter((c) => c.statut === 'suspendu').length;

  return (
    <Box>
      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }} onClose={() => { setError(null); setSuccess(null); }}>
          {error || success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 3, gap: 1 }}>
        <Tooltip title="Actualiser les données">
          <IconButton onClick={load} size="small" sx={{ color: '#64748b' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>
          Nouveau tenant
        </Button>
      </Box>

      {loading ? (
        <LinearProgress sx={{ borderRadius: 4 }} />
      ) : (
        <>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<ApartmentIcon />}
                label="Tenants actifs"
                value={actifs}
                sub={suspendus > 0 ? `${suspendus} suspendu${suspendus > 1 ? 's' : ''}` : 'Aucun suspendu'}
                color="#0ea5e9"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<BusinessIcon />}
                label="Total tenants"
                value={clubs.length}
                sub={`${clubs.length - actifs - suspendus} archivé${clubs.length - actifs - suspendus !== 1 ? 's' : ''}`}
                color="#6366f1"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<PeopleIcon />}
                label="Contacts (plateforme)"
                value={stats?.total_contacts?.toLocaleString('fr-FR')}
                color="#10b981"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<MarkEmailReadIcon />}
                label="Emails envoyés"
                value={stats?.total_envois?.toLocaleString('fr-FR')}
                color="#f59e0b"
              />
            </Grid>
          </Grid>

          <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Registre des tenants</Typography>
                <Typography variant="caption" color="text.secondary">{clubs.length} workspace{clubs.length !== 1 ? 's' : ''} provisionnés</Typography>
              </Box>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tenant</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Identifiant</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Contacts</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Utilisateurs</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Campagnes</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statut</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Provisionné le</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clubs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                        <ApartmentIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.4 }} />
                        Aucun tenant provisionné
                      </TableCell>
                    </TableRow>
                  )}
                  {clubs.map((club) => (
                    <TableRow key={club.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{
                            bgcolor: club.statut === 'archive' ? '#e2e8f0' : '#0ea5e9',
                            color: club.statut === 'archive' ? '#94a3b8' : '#fff',
                            width: 34, height: 34, fontSize: 13, fontWeight: 700,
                          }}>
                            {club.nom.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ color: club.statut === 'archive' ? '#94a3b8' : '#0f172a' }}>
                              {club.nom}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{club.email_contact}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: '#f1f5f9', color: '#475569', px: 1, py: 0.4, borderRadius: 1 }}>
                          {club.slug}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700} variant="body2" sx={{ color: '#0f172a' }}>
                          {(club._stats?.contacts ?? 0).toLocaleString('fr-FR')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700} variant="body2" sx={{ color: '#0f172a' }}>
                          {club._stats?.users ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700} variant="body2" sx={{ color: '#0f172a' }}>
                          {club._stats?.campagnes ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUT_LABELS[club.statut] || club.statut}
                          size="small"
                          sx={{
                            bgcolor: `${STATUT_COLORS[club.statut] || '#64748b'}18`,
                            color: STATUT_COLORS[club.statut] || '#64748b',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {club.createdAt
                            ? new Date(club.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TenantActionsMenu club={club} onUpdate={handleUpdateStatut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ p: 1, bgcolor: '#0ea5e915', borderRadius: 1.5, display: 'inline-flex' }}>
              <ApartmentIcon sx={{ color: '#0ea5e9', fontSize: 18 }} />
            </Box>
            Provisionner un tenant
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
              Workspace
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Nom du tenant *" value={form.nom} size="small" fullWidth
                onChange={(e) => setForm(f => ({ ...f, nom: e.target.value, slug: autoSlug(e.target.value) }))} />
              <TextField label="Slug (identifiant URL) *" value={form.slug} size="small" fullWidth
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                helperText="Lettres minuscules, chiffres et tirets uniquement"
                InputProps={{ sx: { fontFamily: 'monospace' } }} />
              <TextField label="Email de contact" value={form.email_contact} size="small" fullWidth type="email"
                onChange={(e) => setForm(f => ({ ...f, email_contact: e.target.value }))} />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
              Compte administrateur
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Nom *" value={form.admin_nom} size="small" fullWidth
                onChange={(e) => setForm(f => ({ ...f, admin_nom: e.target.value }))} />
              <TextField label="Email *" type="email" value={form.admin_email} size="small" fullWidth
                onChange={(e) => setForm(f => ({ ...f, admin_email: e.target.value }))} />
              <TextField label="Mot de passe *" type="password" value={form.admin_password} size="small" fullWidth
                onChange={(e) => setForm(f => ({ ...f, admin_password: e.target.value }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748b', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : <AddIcon />}
            sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>
            {saving ? 'Provisionnement…' : 'Créer le tenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
