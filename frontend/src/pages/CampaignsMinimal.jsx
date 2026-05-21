import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCampaigns } from '../features/campaigns/campaignsSlice';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const CampaignsMinimal = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.campaigns || {});
  
  // Safe data handling
  const safeItems = Array.isArray(items) ? items : [];
  
  useEffect(() => { 
    console.log('Fetching campaigns data...');
    dispatch(fetchCampaigns()).catch(err => console.error('Error fetching campaigns:', err)); 
  }, [dispatch]);

  console.log('CampaignsMinimal render:', { loading, error, itemsCount: safeItems.length });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Campagnes (Minimal Debug)</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>Créer</Button>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement des campagnes...</Typography>
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" flexDirection="column">
          <Typography variant="h6" color="error" gutterBottom>Erreur</Typography>
          <Typography variant="body2" color="error">{String(error)}</Typography>
        </Box>
      ) : safeItems.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" flexDirection="column">
          <Typography variant="h6" color="text.secondary" gutterBottom>Aucune campagne trouvée</Typography>
          <Typography variant="body2" color="text.secondary">Créez votre première campagne pour commencer</Typography>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>Campagnes trouvées: {safeItems.length}</Typography>
          {safeItems.slice(0, 5).map((c, idx) => (
            <Box key={c.id || idx} sx={{ p: 2, border: '1px solid #eee', mb: 1, borderRadius: 1 }}>
              <Typography variant="subtitle1">{String(c.titre || 'Sans titre')}</Typography>
              <Typography variant="body2" color="text.secondary">
                Statut: {String(c.statut || 'Inconnu')} | 
                Date: {c.date_envoi ? new Date(c.date_envoi).toLocaleDateString() : 'Non définie'}
              </Typography>
            </Box>
          ))}
          {safeItems.length > 5 && (
            <Typography variant="body2" color="text.secondary">
              ... et {safeItems.length - 5} autres campagnes
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CampaignsMinimal;