import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  Mouse as MouseIcon,
  Error as ErrorIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const CampaignStats = ({ campagne, statistiques, envois = [] }) => {
  if (!campagne) return null;

  const stats = statistiques || {};
  const statsEnTempsReel = stats.stats_en_temps_reel || {};
  
  // Calculer les pourcentages
  const tauxOuverture = statsEnTempsReel.taux_ouverture || 0;
  const tauxClic = statsEnTempsReel.taux_clic || 0;
  const tauxErreur = campagne.nb_envoyes > 0 ? 
    (campagne.nb_erreurs / campagne.nb_envoyes * 100).toFixed(2) : 0;

  // Statistiques des envois par statut
  const envoisParStatut = envois.reduce((acc, envoi) => {
    acc[envoi.statut] = (acc[envoi.statut] || 0) + 1;
    return acc;
  }, {});

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'envoyé': return 'success';
      case 'erreur': return 'error';
      case 'en_cours': return 'warning';
      case 'en_attente': return 'info';
      default: return 'default';
    }
  };

  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'envoyé': return <CheckCircleIcon />;
      case 'erreur': return <ErrorIcon />;
      case 'en_cours': return <ScheduleIcon />;
      case 'en_attente': return <ScheduleIcon />;
      default: return <EmailIcon />;
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case 'envoyé': return 'Envoyés';
      case 'erreur': return 'Erreurs';
      case 'en_cours': return 'En cours';
      case 'en_attente': return 'En attente';
      default: return statut;
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Statistiques de la campagne
      </Typography>

      {/* Métriques principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <EmailIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div">
                    {campagne.nb_envoyes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Emails envoyés
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <VisibilityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div">
                    {statsEnTempsReel.ouverts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Emails ouverts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <MouseIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div">
                    {statsEnTempsReel.clics || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Clics
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <ErrorIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="div">
                    {campagne.nb_erreurs || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Erreurs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Taux et pourcentages */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Taux d'ouverture
            </Typography>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h4" component="span" sx={{ mr: 2 }}>
                {tauxOuverture}%
              </Typography>
              <TrendingUpIcon color="success" />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={parseFloat(tauxOuverture)} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {statsEnTempsReel.ouverts || 0} ouvertures sur {campagne.nb_envoyes || 0} emails
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Taux de clic
            </Typography>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h4" component="span" sx={{ mr: 2 }}>
                {tauxClic}%
              </Typography>
              <MouseIcon color="info" />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={parseFloat(tauxClic)} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {statsEnTempsReel.clics || 0} clics sur {campagne.nb_envoyes || 0} emails
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Détails des envois */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Statut des envois
            </Typography>
            <List>
              {Object.entries(envoisParStatut).map(([statut, count]) => (
                <ListItem key={statut}>
                  <ListItemIcon>
                    {getStatutIcon(statut)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={getStatutLabel(statut)}
                    secondary={`${count} emails`}
                  />
                  <Chip 
                    label={count} 
                    color={getStatutColor(statut)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Informations de la campagne
            </Typography>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Statut:</Typography>
                <Chip 
                  label={campagne.statut} 
                  color={campagne.statut === 'envoyée' ? 'success' : 'primary'}
                  size="small"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Date d'envoi:</Typography>
                <Typography variant="body2">
                  {campagne.date_envoi ? 
                    new Date(campagne.date_envoi).toLocaleDateString('fr-FR') : 
                    'Non envoyée'
                  }
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Date de programmation:</Typography>
                <Typography variant="body2">
                  {campagne.date_programmation ? 
                    new Date(campagne.date_programmation).toLocaleDateString('fr-FR') : 
                    'Non programmée'
                  }
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Type:</Typography>
                <Chip 
                  label={campagne.type_campagne} 
                  variant="outlined"
                  size="small"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Priorité:</Typography>
                <Chip 
                  label={campagne.priorite} 
                  color={campagne.priorite === 'urgente' ? 'error' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Statistiques détaillées */}
      {stats.id && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Statistiques détaillées
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">
                  {stats.nb_desabonnements || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Désabonnements
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">
                  {stats.nb_bounces || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bounces
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">
                  {stats.nb_spam || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Signalés spam
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">
                  {((statsEnTempsReel.ouverts / campagne.nb_envoyes) * 100 || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taux de livraison
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default CampaignStats;
