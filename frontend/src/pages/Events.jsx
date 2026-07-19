import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Tooltip, Chip, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, FormControlLabel, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/EventBusy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EnhancedPagination from '../components/EnhancedPagination';
import {
  fetchEvents, createEvent, updateEvent, deleteEvent, cancelEvent,
} from '../features/events/eventsSlice';

const STATUT_CONFIG = {
  planifié: { label: 'Planifié', color: '#0a84d6', bg: '#e7f3fc' },
  en_cours: { label: 'En cours', color: '#059669', bg: '#dcfce7' },
  annule: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  termine: { label: 'Terminé', color: '#64748b', bg: '#f1f5f9' },
};

const emptyEvent = {
  titre: '',
  date: '',
  lieu: '',
  description: '',
  index_requis: '',
  capacite_max: '',
  type_evenement: 'tournoi',
  prix: '',
  recurrent: false,
  frequence: 'hebdomadaire',
  nombre_occurrences: '',
};

const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Events = () => {
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, total, page, totalPages, statsGlobales } = useSelector((state) => state.events);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);

  const [cancelDialog, setCancelDialog] = useState({ open: false, id: null, raison: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  const loadEvents = () => {
    dispatch(fetchEvents({
      page: currentPage,
      limit: pageSize,
      search: search || undefined,
      statut: statutFilter || undefined,
      type: typeFilter || undefined,
    }));
  };

  useEffect(() => { loadEvents(); }, [dispatch, currentPage, pageSize, statutFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setCurrentPage(1); loadEvents(); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = (event = null) => {
    if (event) {
      setEdit(event);
      setForm({
        titre: event.titre || '',
        date: toDatetimeLocal(event.date),
        lieu: event.lieu || '',
        description: event.description || '',
        index_requis: event.index_requis ?? '',
        capacite_max: event.capacite_max ?? '',
        type_evenement: event.type_evenement || 'tournoi',
        prix: event.prix ?? '',
        recurrent: false,
        frequence: 'hebdomadaire',
        nombre_occurrences: '',
      });
    } else {
      setEdit(null);
      setForm(emptyEvent);
    }
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        titre: form.titre.trim(),
        date: form.date ? new Date(form.date).toISOString() : undefined,
        lieu: form.lieu.trim(),
        description: form.description.trim() || undefined,
        index_requis: form.index_requis === '' ? undefined : Number(form.index_requis),
        capacite_max: form.capacite_max === '' ? undefined : Number(form.capacite_max),
        type_evenement: form.type_evenement,
        prix: form.prix === '' ? undefined : Number(form.prix),
      };
      if (!edit && form.recurrent) {
        payload.evenement_recurrent = {
          frequence: form.frequence,
          nombre_occurrences: form.nombre_occurrences ? Number(form.nombre_occurrences) : undefined,
        };
      }

      if (edit) {
        await dispatch(updateEvent({ id: edit.id, data: payload })).unwrap();
        toast.success('Événement mis à jour.');
      } else {
        await dispatch(createEvent(payload)).unwrap();
        toast.success('Événement créé.');
      }
      setOpen(false);
      loadEvents();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await dispatch(cancelEvent({ id: cancelDialog.id, raison_annulation: cancelDialog.raison })).unwrap();
      toast.success('Événement annulé.');
      setCancelDialog({ open: false, id: null, raison: '' });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : "Erreur lors de l'annulation.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deleteEvent(deleteDialog.id)).unwrap();
      toast.success('Événement supprimé.');
      setDeleteDialog({ open: false, id: null });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Erreur lors de la suppression.');
    }
  };

  const totalPlanifies = Object.entries(statsGlobales).reduce(
    (sum, [key, count]) => (key.startsWith('planifié') ? sum + count : sum),
    0
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={4} gap={3}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>
            Tournois &amp; Événements
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organisez vos tournois, gérez les invitations et suivez les confirmations.
          </Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ px: 4 }}>
          Nouvel événement
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 3, borderRadius: 0, border: '1px solid #bfc9cf', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={`${total} événement(s)`} size="small" sx={{ bgcolor: '#0a84d6', color: '#fff', fontWeight: 700, borderRadius: 0 }} />
        {totalPlanifies > 0 && (
          <Chip label={`${totalPlanifies} planifié(s)`} size="small" variant="outlined" sx={{ borderRadius: 0 }} />
        )}
        <TextField
          size="small"
          placeholder="Rechercher (titre, lieu...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220, ml: 'auto' }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statutFilter} label="Statut" onChange={(e) => { setStatutFilter(e.target.value); setCurrentPage(1); }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="planifié">Planifié</MenuItem>
            <MenuItem value="en_cours">En cours</MenuItem>
            <MenuItem value="annule">Annulé</MenuItem>
            <MenuItem value="termine">Terminé</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="tournoi">Tournoi</MenuItem>
            <MenuItem value="competition">Compétition</MenuItem>
            <MenuItem value="social">Social</MenuItem>
            <MenuItem value="formation">Formation</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 0, border: '1px solid #bfc9cf' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5F7F9' }}>
              <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Lieu</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Invités</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun événement.</TableCell></TableRow>
            )}
            {!loading && items.map((event) => {
              const cfg = STATUT_CONFIG[event.statut] || { label: event.statut, color: '#64748b', bg: '#f1f5f9' };
              const confirmed = (event.rsvps || []).filter((r) => r.statut === 'confirmé').length;
              return (
                <TableRow key={event.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${event.id}`)}>
                  <TableCell sx={{ fontWeight: 600 }}>{event.titre}</TableCell>
                  <TableCell>{new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                  <TableCell>{event.lieu}</TableCell>
                  <TableCell>{event.type_evenement}</TableCell>
                  <TableCell>
                    <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, borderRadius: 0 }} />
                  </TableCell>
                  <TableCell>
                    {confirmed}{event.capacite_max ? ` / ${event.capacite_max}` : ''} confirmé(s)
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Voir le détail">
                      <IconButton size="small" onClick={() => navigate(`/events/${event.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => handleOpen(event)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {event.statut !== 'annule' && event.statut !== 'termine' && (
                      <Tooltip title="Annuler">
                        <IconButton size="small" onClick={() => setCancelDialog({ open: true, id: event.id, raison: '' })}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: event.id })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2}>
        <EnhancedPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          loading={loading}
          itemLabel="événements"
        />
      </Box>

      {/* Create/Edit dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{edit ? "Modifier l'événement" : 'Nouvel événement'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titre"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Date et heure"
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Lieu"
              value={form.lieu}
              onChange={(e) => setForm({ ...form, lieu: e.target.value })}
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
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={form.type_evenement}
                  label="Type"
                  onChange={(e) => setForm({ ...form, type_evenement: e.target.value })}
                >
                  <MenuItem value="tournoi">Tournoi</MenuItem>
                  <MenuItem value="competition">Compétition</MenuItem>
                  <MenuItem value="social">Social</MenuItem>
                  <MenuItem value="formation">Formation</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Prix (€)"
                type="number"
                value={form.prix}
                onChange={(e) => setForm({ ...form, prix: e.target.value })}
                fullWidth
              />
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                label="Index requis (max)"
                type="number"
                value={form.index_requis}
                onChange={(e) => setForm({ ...form, index_requis: e.target.value })}
                helperText="Laisser vide si aucune restriction"
                fullWidth
              />
              <TextField
                label="Capacité maximale"
                type="number"
                value={form.capacite_max}
                onChange={(e) => setForm({ ...form, capacite_max: e.target.value })}
                helperText="Laisser vide si illimitée"
                fullWidth
              />
            </Box>

            {!edit && (
              <Box sx={{ p: 2, bgcolor: '#F5F7F9', border: '1px solid #e2e8f0' }}>
                <FormControlLabel
                  control={<Switch checked={form.recurrent} onChange={(e) => setForm({ ...form, recurrent: e.target.checked })} />}
                  label="Événement récurrent"
                />
                {form.recurrent && (
                  <Box display="flex" gap={2} mt={1}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Fréquence</InputLabel>
                      <Select
                        value={form.frequence}
                        label="Fréquence"
                        onChange={(e) => setForm({ ...form, frequence: e.target.value })}
                      >
                        <MenuItem value="quotidien">Quotidien</MenuItem>
                        <MenuItem value="hebdomadaire">Hebdomadaire</MenuItem>
                        <MenuItem value="mensuel">Mensuel</MenuItem>
                        <MenuItem value="annuel">Annuel</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Nombre d'occurrences"
                      type="number"
                      size="small"
                      value={form.nombre_occurrences}
                      onChange={(e) => setForm({ ...form, nombre_occurrences: e.target.value })}
                      helperText="Défaut : 12"
                      fullWidth
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={saving}>Annuler</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : (edit ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Cancel event dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, id: null, raison: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Annuler l&apos;événement ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Les invitations en attente seront automatiquement annulées.
          </Typography>
          <TextField
            label="Raison (optionnel)"
            value={cancelDialog.raison}
            onChange={(e) => setCancelDialog({ ...cancelDialog, raison: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, id: null, raison: '' })}>Retour</Button>
          <Button color="error" variant="contained" onClick={handleCancelConfirm}>Annuler l&apos;événement</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer l&apos;événement ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est irréversible pour l&apos;affichage (suppression douce). Un événement en cours ne peut pas être supprimé.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Events;
