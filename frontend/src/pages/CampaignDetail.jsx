import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  Grid, Paper, Divider, IconButton, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import SendIcon from '@mui/icons-material/Send';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import ReplyIcon from '@mui/icons-material/Reply';
import axios from '../api/axios';

const STATUS_COLORS = {
  envoyée:     { bg: '#dafbe1', color: '#1a7f37', label: 'Envoyée' },
  en_cours:    { bg: '#fff3cd', color: '#856404', label: 'En cours' },
  programmée:  { bg: '#cfe2ff', color: '#0a58ca', label: 'Programmée' },
  brouillon:   { bg: '#f6f8fa', color: '#57606a', label: 'Brouillon' },
  erreur:      { bg: '#ffebe9', color: '#cf222e', label: 'Erreur' },
  annulée:     { bg: '#f6f8fa', color: '#57606a', label: 'Annulée' },
};

const KPICard = ({ icon, label, value, sub, color = '#2563eb', bg = '#eff6ff' }) => (
  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0d1117', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
    {sub !== undefined && (
      <Typography sx={{ fontSize: 12, color, fontWeight: 600, mt: 0.5 }}>{sub}</Typography>
    )}
  </Paper>
);

const fmt = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const pct = (num, den) => den > 0 ? ((num / den) * 100).toFixed(1) + ' %' : '—';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    axios.get(`/campagnes/${id}`)
      .then(r => { setCampaign(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.message || 'Erreur de chargement'); setLoading(false); });
  }, [id]);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await axios.post(`/campagnes/${id}/dupliquer`);
      navigate('/campagnes');
    } catch { setDuplicating(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress size={28} sx={{ color: '#2563eb' }} />
    </Box>
  );

  if (error) return (
    <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
  );

  const stats = campaign.statistiques || {};
  const nb_envoyes = stats.nb_envoyes || 0;
  const nb_ouverts = stats.nb_ouverts || 0;
  const nb_clics = stats.nb_clics || 0;
  const nb_desab = stats.nb_desabonnements || 0;
  const st = STATUS_COLORS[campaign.statut] || STATUS_COLORS.brouillon;
  const envois = campaign.envois || [];
  const opened = envois.filter(e => e.date_ouverture).slice(0, 20);

  return (
    <Box>
      {/* Topbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton size="small" onClick={() => navigate('/campagnes')} sx={{ color: '#57606a' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#0d1117', flex: 1, minWidth: 0 }} noWrap>
          {campaign.titre}
        </Typography>
        <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }} />

        {campaign.statut === 'envoyée' && (
          <Button size="small" variant="outlined" startIcon={<ReplyIcon />}
            onClick={() => navigate(`/campagnes?followup=${id}`)}
            sx={{ fontSize: 12, textTransform: 'none', borderColor: '#0969da', color: '#0969da' }}>
            Relancer
          </Button>
        )}
        <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />}
          onClick={handleDuplicate} disabled={duplicating}
          sx={{ fontSize: 12, textTransform: 'none' }}>
          Dupliquer
        </Button>
        <Button size="small" variant="outlined" startIcon={<BarChartIcon />}
          onClick={() => navigate(`/statistics?campaignId=${id}`)}
          sx={{ fontSize: 12, textTransform: 'none', borderColor: '#2563eb', color: '#2563eb' }}>
          Stats globales
        </Button>
      </Box>

      {/* Metadata row */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3, p: 2, bgcolor: '#f6f8fa', borderRadius: 2, border: '1px solid #e2e8f0' }}>
        {[
          { label: 'Objet', value: campaign.sujet },
          { label: 'Type', value: campaign.type_campagne },
          { label: 'Créée par', value: campaign.createur?.nom || '—' },
          { label: 'Date envoi', value: fmt(campaign.date_envoi) },
          { label: 'Segment', value: campaign.segment?.nom || (campaign.tags_ids?.length > 0 ? `${campaign.tags_ids.length} tag(s)` : 'Tous les contacts') },
        ].map(({ label, value }) => (
          <Box key={label}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, color: '#0d1117', fontWeight: 500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KPICard icon={<SendIcon fontSize="small" />} label="Envois" value={nb_envoyes.toLocaleString('fr-FR')} bg="#f0f9ff" color="#0284c7" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard icon={<MarkEmailReadIcon fontSize="small" />} label="Ouvertures" value={nb_ouverts.toLocaleString('fr-FR')} sub={pct(nb_ouverts, nb_envoyes)} bg="#f0fdf4" color="#16a34a" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard icon={<AdsClickIcon fontSize="small" />} label="Clics" value={nb_clics.toLocaleString('fr-FR')} sub={pct(nb_clics, nb_envoyes)} bg="#eff6ff" color="#2563eb" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard icon={<UnsubscribeIcon fontSize="small" />} label="Désabonnements" value={nb_desab.toLocaleString('fr-FR')} sub={pct(nb_desab, nb_envoyes)} bg="#fff7ed" color="#ea580c" />
        </Grid>
      </Grid>

      {/* Progress bars */}
      {nb_envoyes > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0d1117', mb: 2 }}>Taux de performance</Typography>
          {[
            { label: 'Taux d\'ouverture', value: nb_envoyes > 0 ? (nb_ouverts / nb_envoyes) * 100 : 0, color: '#16a34a', benchmark: 25 },
            { label: 'Taux de clic', value: nb_envoyes > 0 ? (nb_clics / nb_envoyes) * 100 : 0, color: '#2563eb', benchmark: 5 },
          ].map(({ label, value, color, benchmark }) => (
            <Box key={label} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: '#57606a' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{value.toFixed(1)} %</Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(value, 100)}
                sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
              <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.3 }}>Benchmark secteur : ~{benchmark} %</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Errors */}
      {envois.filter(e => e.statut === 'erreur').length > 0 && (
        <Alert severity="warning" icon={<ErrorOutlineIcon />} sx={{ mb: 3, fontSize: 13 }}>
          {envois.filter(e => e.statut === 'erreur').length} envoi(s) en erreur.{' '}
          <strong>{envois.filter(e => e.statut === 'erreur').map(e => e.contact?.email).filter(Boolean).slice(0, 3).join(', ')}</strong>
          {envois.filter(e => e.statut === 'erreur').length > 3 ? '…' : ''}
        </Alert>
      )}

      {/* Recipients who opened */}
      {opened.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>
              Destinataires ayant ouvert ({opened.length}{envois.filter(e => e.date_ouverture).length > 20 ? '+' : ''})
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fa' }}>
                  {['Contact', 'Email', 'Ouverture', 'Clic'].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: '#57606a', py: 1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {opened.map((e, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontSize: 12 }}>{e.contact ? `${e.contact.prenom} ${e.contact.nom}` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#57606a' }}>{e.contact?.email || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(e.date_ouverture)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {e.date_clic ? <Chip label="Cliqué" size="small" sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 10 }} /> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Email preview */}
      {campaign.contenu_html && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>Aperçu de l'email</Typography>
            <Typography sx={{ fontSize: 12, color: '#57606a' }}>— Objet : {campaign.sujet}</Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa', maxHeight: 500, overflow: 'auto' }}>
            <iframe
              srcDoc={campaign.contenu_html}
              title="Email preview"
              style={{ width: '100%', minHeight: 400, border: 'none', borderRadius: 6, background: '#fff' }}
              sandbox="allow-same-origin"
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
