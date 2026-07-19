import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '../context/ToastContext';
import axios from '../api/axios';
import {
  Box, Typography, Button, Paper, IconButton, Grid, Card, CardContent, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  fetchEvent, fetchEventStats, inviteContacts, updateRsvp, clearCurrentEvent,
} from '../features/events/eventsSlice';

const STATUT_CONFIG = {
  planifié: { label: 'Planifié', color: '#0a84d6', bg: '#e7f3fc' },
  en_cours: { label: 'En cours', color: '#059669', bg: '#dcfce7' },
  annule: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
  termine: { label: 'Terminé', color: '#64748b', bg: '#f1f5f9' },
};

const RSVP_CONFIG = {
  invité: { label: 'Invité', color: '#d97706', bg: '#fef9c3' },
  confirmé: { label: 'Confirmé', color: '#059669', bg: '#dcfce7' },
  absent: { label: 'Absent', color: '#64748b', bg: '#f1f5f9' },
  annule: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2' },
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { current: event, currentLoading, eventStats } = useSelector((state) => state.events);

  const [contactOptions, setContactOptions] = useState([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchEvent(id));
    dispatch(fetchEventStats(id));
  }, [dispatch, id]);

  useEffect(() => {
    load();
    return () => dispatch(clearCurrentEvent());
  }, [load, dispatch]);

  const searchContacts = async (query) => {
    if (!query || query.trim().length < 2) { setContactOptions([]); return; }
    setContactSearchLoading(true);
    try {
      const res = await axios.get('/contacts', { params: { search: query, limit: 10 } });
      const already = new Set((event?.rsvps || []).map((r) => r.contact_id));
      setContactOptions((res.data.data || []).filter((c) => !already.has(c.id)));
    } catch {
      setContactOptions([]);
    } finally {
      setContactSearchLoading(false);
    }
  };

  const handleInvite = async () => {
    if (selectedContacts.length === 0) return;
    setInviting(true);
    try {
      const result = await dispatch(inviteContacts({
        id,
        contact_ids: selectedContacts.map((c) => c.id),
        message_personnalise: inviteMessage || undefined,
      })).unwrap();
      toast.success(result.message || 'Invitations envoyées.');
      setSelectedContacts([]);
      setInviteMessage('');
      load();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : "Erreur lors de l'invitation.");
    } finally {
      setInviting(false);
    }
  };

  const handleRsvpChange = async (rsvpId, statut) => {
    try {
      await dispatch(updateRsvp({ rsvpId, statut })).unwrap();
      toast.success('Statut mis à jour.');
      load();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Erreur lors de la mise à jour.');
    }
  };

  if (currentLoading && !event) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!event) {
    return (
      <Box>
        <Typography>Événement introuvable.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/events')}>Retour</Button>
      </Box>
    );
  }

  const statutCfg = STATUT_CONFIG[event.statut] || { label: event.statut, color: '#64748b', bg: '#f1f5f9' };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate('/events')}><ArrowBackIcon /></IconButton>
        <Box flexGrow={1}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif' }}>{event.titre}</Typography>
            <Chip label={statutCfg.label} size="small" sx={{ bgcolor: statutCfg.bg, color: statutCfg.color, fontWeight: 700, borderRadius: 0 }} />
          </Box>
          <Typography variant="body1" color="text.secondary">
            {new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })} · {event.lieu}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Invités</Typography>
            <Typography variant="h4">{eventStats?.statistiques?.total_invites ?? '—'}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Taux de confirmation</Typography>
            <Typography variant="h4">{eventStats?.statistiques?.taux_confirmation ?? '0'}%</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Taux de participation</Typography>
            <Typography variant="h4">{eventStats?.statistiques?.taux_participation ?? '0'}%</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Capacité</Typography>
            <Typography variant="h4">{event.capacite_max ? `${eventStats?.statistiques?.confirmes ?? 0}/${event.capacite_max}` : 'Illimitée'}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {event.description && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 0, border: '1px solid #bfc9cf' }}>
          <Typography variant="body1">{event.description}</Typography>
        </Paper>
      )}

      {/* Invite section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 0, border: '1px solid #bfc9cf' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700, mb: 2 }}>
          Inviter des contacts
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">
          <Autocomplete
            multiple
            sx={{ flex: 1, minWidth: 280 }}
            options={contactOptions}
            value={selectedContacts}
            loading={contactSearchLoading}
            getOptionLabel={(c) => `${c.prenom} ${c.nom} (${c.email})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, value) => setSelectedContacts(value)}
            onInputChange={(_, value) => searchContacts(value)}
            renderInput={(params) => (
              <TextField {...params} label="Rechercher des contacts (nom, email...)" size="small" />
            )}
          />
          <TextField
            label="Message personnalisé (optionnel)"
            size="small"
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <Button
            variant="contained"
            color="secondary"
            startIcon={inviting ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
            onClick={handleInvite}
            disabled={inviting || selectedContacts.length === 0}
          >
            Inviter
          </Button>
        </Box>
      </Paper>

      {/* RSVP list */}
      <Paper sx={{ borderRadius: 0, border: '1px solid #bfc9cf' }}>
        <Box sx={{ p: 2, bgcolor: '#F5F7F9', borderBottom: '1px solid #bfc9cf' }}>
          <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
            Invités ({event.rsvps?.length || 0})
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Handicap</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!event.rsvps || event.rsvps.length === 0) && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Aucun invité pour le moment.</TableCell></TableRow>
              )}
              {event.rsvps?.map((rsvp) => {
                const cfg = RSVP_CONFIG[rsvp.statut] || { label: rsvp.statut, color: '#64748b', bg: '#f1f5f9' };
                return (
                  <TableRow key={rsvp.id}>
                    <TableCell>{rsvp.contact?.prenom} {rsvp.contact?.nom}</TableCell>
                    <TableCell>{rsvp.contact?.email}</TableCell>
                    <TableCell>{rsvp.contact?.handicap ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, borderRadius: 0 }} />
                    </TableCell>
                    <TableCell align="right">
                      {rsvp.statut !== 'confirmé' && rsvp.statut !== 'annule' && (
                        <Tooltip title="Confirmer">
                          <IconButton size="small" color="success" onClick={() => handleRsvpChange(rsvp.id, 'confirmé')}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {rsvp.statut !== 'absent' && rsvp.statut !== 'annule' && (
                        <Tooltip title="Marquer absent">
                          <IconButton size="small" onClick={() => handleRsvpChange(rsvp.id, 'absent')}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default EventDetail;
