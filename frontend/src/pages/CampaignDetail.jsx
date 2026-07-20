import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  Grid, Paper, Divider, IconButton, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination,
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
import DownloadIcon from '@mui/icons-material/Download';
import ScienceIcon from '@mui/icons-material/Science';
import axios from '../api/axios';
import FollowUpWizard from '../components/FollowUpWizard';

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

const exportCSV = (rows, filename) => {
  const headers = ['Prénom', 'Nom', 'Email', 'Statut', 'Date ouverture', 'Date clic'];
  const lines = [
    headers.join(';'),
    ...rows.map(e => [
      e.contact?.prenom || '',
      e.contact?.nom || '',
      e.contact?.email || '',
      e.statut || '',
      e.date_ouverture ? new Date(e.date_ouverture).toLocaleString('fr-FR') : '',
      e.date_clic ? new Date(e.date_clic).toLocaleString('fr-FR') : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

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
  const opened = envois.filter(e => e.date_ouverture);
  const pagedOpened = opened.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isABTest = campaign.parametres?.test_ab === true;

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
            onClick={() => setFollowUpOpen(true)}
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

      {/* A/B Test results */}
      {isABTest && (() => {
        const varA = envois.filter(e => e.variante === 'A');
        const varB = envois.filter(e => e.variante === 'B');
        const hasData = varA.length > 0 || varB.length > 0;
        if (!hasData) {
          return (
            <Alert icon={<ScienceIcon fontSize="small" />} severity="info" sx={{ mb: 3, fontSize: 13 }}>
              <strong>Campagne A/B Test</strong> — Les résultats comparatifs seront disponibles après l'envoi.
            </Alert>
          );
        }
        const calc = (v) => ({
          total: v.length,
          ouverts: v.filter(e => e.date_ouverture).length,
          clics: v.filter(e => e.date_clic).length,
        });
        const sA = calc(varA), sB = calc(varB);
        const rateA = sA.total > 0 ? sA.ouverts / sA.total : 0;
        const rateB = sB.total > 0 ? sB.ouverts / sB.total : 0;
        const winner = rateA >= rateB ? 'A' : 'B';
        const winnerColor = winner === 'A' ? '#2563eb' : '#7c3aed';
        return (
          <Paper elevation={0} sx={{ border: '1px solid #bfdbfe', borderRadius: 2, p: 2.5, mb: 3, bgcolor: '#f0f7ff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScienceIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Résultats A/B Test</Typography>
            </Box>
            <Grid container spacing={2}>
              {[
                { label: 'Variante A', sujet: campaign.sujet, stats: sA, color: '#2563eb', bg: '#eff6ff' },
                { label: 'Variante B', sujet: campaign.parametres?.sujet_b || '—', stats: sB, color: '#7c3aed', bg: '#f5f3ff' },
              ].map(({ label, sujet, stats, color, bg }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Paper elevation={0} sx={{ border: `2px solid ${label === `Variante ${winner}` ? color : '#e2e8f0'}`, borderRadius: 2, p: 2, bgcolor: bg, position: 'relative' }}>
                    {label === `Variante ${winner}` && sA.total > 0 && sB.total > 0 && (
                      <Chip label="Gagnant" size="small" sx={{ position: 'absolute', top: 8, right: 8, bgcolor: color, color: '#fff', fontWeight: 700, fontSize: 10 }} />
                    )}
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color, mb: 0.5 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#57606a', mb: 1.5, fontStyle: 'italic' }} noWrap title={sujet}>{sujet}</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box>
                        <Typography sx={{ fontSize: 10, color: '#57606a', textTransform: 'uppercase', fontWeight: 700 }}>Envois</Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0d1117', fontVariantNumeric: 'tabular-nums' }}>{stats.total.toLocaleString('fr-FR')}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10, color: '#57606a', textTransform: 'uppercase', fontWeight: 700 }}>Ouvertures</Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                          {stats.total > 0 ? ((stats.ouverts / stats.total) * 100).toFixed(1) + ' %' : '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10, color: '#57606a', textTransform: 'uppercase', fontWeight: 700 }}>Clics</Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                          {stats.total > 0 ? ((stats.clics / stats.total) * 100).toFixed(1) + ' %' : '—'}
                        </Typography>
                      </Box>
                    </Box>
                    {stats.total > 0 && (
                      <LinearProgress variant="determinate" value={Math.min((stats.ouverts / stats.total) * 100, 100)}
                        sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#16a34a', borderRadius: 2 } }} />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {sA.total > 0 && sB.total > 0 && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: `${winnerColor}10`, border: `1px solid ${winnerColor}30` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: winnerColor }}>
                  Gagnant : Variante {winner} — Taux d'ouverture {winner === 'A' ? (rateA * 100).toFixed(1) : (rateB * 100).toFixed(1)} % vs {winner === 'A' ? (rateB * 100).toFixed(1) : (rateA * 100).toFixed(1)} %
                </Typography>
              </Box>
            )}
          </Paper>
        );
      })()}

      {/* Recipients who opened */}
      {opened.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>
              Destinataires ayant ouvert ({opened.length.toLocaleString('fr-FR')})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={() => exportCSV(envois, `campagne-${id}-destinataires.csv`)}
              sx={{ fontSize: 11, textTransform: 'none', borderColor: '#e2e8f0', color: '#57606a', '&:hover': { borderColor: '#2563eb', color: '#2563eb' } }}
            >
              Exporter CSV
            </Button>
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
                {pagedOpened.map((e, i) => (
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
          <TablePagination
            component="div"
            count={opened.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Lignes :"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
            sx={{ borderTop: '1px solid #e2e8f0', fontSize: 12 }}
          />
        </Paper>
      )}

      <FollowUpWizard
        open={followUpOpen}
        campaign={campaign}
        onClose={() => setFollowUpOpen(false)}
        onSuccess={() => setFollowUpOpen(false)}
      />

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
