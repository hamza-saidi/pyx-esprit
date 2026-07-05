import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, CircularProgress, Grid,
  Card, CardContent, Divider, Chip, Tooltip, Alert, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Euro as EuroIcon,
  Timer as TimerIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const MembershipPlans = () => {
  const toast = useToast();
  const location = useLocation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [open, setOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState({ nom: '', prix: 0, duree_mois: 12, description: '' });
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/contacts/memberships');
      setPlans(res.data);
    } catch (err) {
      setError("Erreur lors du chargement des abonnements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpen = (plan = null) => {
    if (plan) {
      setEditPlan(plan);
      setForm({ nom: plan.nom, prix: plan.prix, duree_mois: plan.duree_mois, description: plan.description || '' });
    } else {
      setEditPlan(null);
      setForm({ nom: '', prix: 0, duree_mois: 12, description: '' });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('create') === '1') {
      handleOpen();
    }
  }, [location.search]);

  const handleSave = async () => {
    if (!form.nom) { toast.warning("Le nom est requis."); return; }
    setSaving(true);
    try {
      if (editPlan) {
        await axios.put(`/contacts/memberships/${editPlan.id}`, form);
      } else {
        await axios.post('/contacts/memberships', form);
      }
      setOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce type d'abonnement ?")) return;
    try {
      await axios.delete(`/contacts/memberships/${id}`);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#204170', mb: 1 }}>Types d'Abonnements</Typography>
          <Typography variant="body1" color="text.secondary">Définissez les différentes offres de membership pour vos golfeurs.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpen()}
          sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Créer un Forfait
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
      ) : plans.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, border: '2px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
          <TrendingUpIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Aucun forfait configuré.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => handleOpen()}>Commencer maintenant</Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card sx={{ 
                borderRadius: 4, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}>
                <CardContent sx={{ flex: 1, p: 4 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{plan.nom}</Typography>
                    <Chip label={plan.actif ? "Actif" : "Inactif"} color={plan.actif ? "success" : "default"} size="small" variant="outlined" />
                  </Box>
                  
                  <Box display="flex" alignItems="baseline" mb={3}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#204170' }}>{plan.prix}€</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>/ {plan.duree_mois} mois</Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ height: 60, overflow: 'hidden', mb: 3 }}>
                    {plan.description || "Aucune description fournie pour ce forfait."}
                  </Typography>

                  <Box display="flex" gap={1} mb={1}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                    <Typography variant="body2">Accès prioritaire</Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                    <Typography variant="body2">Relances automatiques activées</Typography>
                  </Box>
                </CardContent>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title="Éditer"><IconButton onClick={() => handleOpen(plan)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Supprimer"><IconButton color="error" onClick={() => handleDelete(plan.id)}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Editor Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editPlan ? 'Modifier le Forfait' : 'Nouveau Forfait'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <TextField 
              label="Nom du forfait" 
              fullWidth 
              value={form.nom} 
              onChange={(e) => setForm({...form, nom: e.target.value})}
              placeholder="ex: Abonnement Annuel Gold"
            />
            <Box display="flex" gap={2}>
              <TextField 
                label="Prix" 
                fullWidth 
                type="number"
                value={form.prix} 
                onChange={(e) => setForm({...form, prix: e.target.value})}
                InputProps={{ startAdornment: <InputAdornment position="start"><EuroIcon /></InputAdornment> }}
              />
              <TextField 
                label="Durée (mois)" 
                fullWidth 
                type="number"
                value={form.duree_mois} 
                onChange={(e) => setForm({...form, duree_mois: e.target.value})}
                InputProps={{ startAdornment: <InputAdornment position="start"><TimerIcon /></InputAdornment> }}
              />
            </Box>
            <TextField 
              label="Description" 
              fullWidth 
              multiline 
              rows={3}
              value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="Détails de l'offre..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ fontWeight: 700 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MembershipPlans;
