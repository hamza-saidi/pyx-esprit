import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
  Tabs, Tab, Grid, Card, CardContent, CardActions, Button, Chip,
  TextField, InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { PRO_TEMPLATES } from '../data/proTemplates';

const HtmlThumb = ({ html }) => (
  <Box sx={{
    height: 140, bgcolor: '#f8fafc', overflow: 'hidden',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    borderBottom: '1px solid #e5e7eb', position: 'relative',
  }}>
    <div
      style={{
        transform: 'scale(0.22)',
        transformOrigin: 'top center',
        width: '454%',
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  </Box>
);

const TemplateCard = ({ nom, description, categorie, contenu_html, onUse }) => (
  <Card elevation={0} sx={{
    border: '1px solid #e2e8f0', borderRadius: 2,
    height: '100%', display: 'flex', flexDirection: 'column',
    transition: 'all 0.15s',
    '&:hover': { borderColor: '#2563eb', boxShadow: '0 0 0 3px #dbeafe', transform: 'translateY(-1px)' },
  }}>
    <HtmlThumb html={contenu_html || ''} />
    <CardContent sx={{ flex: 1, py: 1.5, px: 2 }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1} mb={0.5}>
        <Typography fontWeight={700} fontSize={13} sx={{ lineHeight: 1.3 }}>{nom}</Typography>
        {categorie && (
          <Chip label={categorie} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#eff6ff', color: '#2563eb', flexShrink: 0 }} />
        )}
      </Box>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {description}
        </Typography>
      )}
    </CardContent>
    <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
      <Button fullWidth variant="contained" size="small"
        onClick={onUse}
        sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, textTransform: 'none', fontWeight: 600 }}>
        Utiliser ce modèle
      </Button>
    </CardActions>
  </Card>
);

export default function TemplatePicker({ open, savedTemplates = [], onClose, onSelect }) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const filterBySearch = (items) =>
    search.trim()
      ? items.filter(t => (t.nom + (t.description || '') + (t.categorie || '')).toLowerCase().includes(search.toLowerCase()))
      : items;

  const proFiltered = filterBySearch(PRO_TEMPLATES);
  const savedFiltered = filterBySearch(savedTemplates);

  const handleSelect = (html) => {
    onSelect(html);
    onClose();
    setSearch('');
  };

  return (
    <Dialog open={open} onClose={() => { onClose(); setSearch(''); }} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', height: '85vh' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: '#0f172a', color: '#fff', py: 1.5, px: 3,
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <CollectionsBookmarkIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={15}>Choisir un modèle d'email</Typography>
        </Box>
        <IconButton size="small" onClick={() => { onClose(); setSearch(''); }} sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 2, pb: 0, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={1.5}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }}
            sx={{ '& .MuiTab-root': { fontSize: 13, textTransform: 'none', minHeight: 36, fontWeight: 600 } }}>
            <Tab icon={<PublicIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Bibliothèque (${PRO_TEMPLATES.length})`} />
            <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Mes modèles (${savedTemplates.length})`} />
          </Tabs>
          <TextField
            size="small"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: 220, bgcolor: '#fff', borderRadius: 1 }}
          />
        </Box>
      </Box>

      <DialogContent sx={{ bgcolor: '#f8fafc', p: 3, overflowY: 'auto' }}>
        {tab === 0 && (
          proFiltered.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography color="text.secondary" fontSize={13}>Aucun résultat pour "{search}".</Typography>
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {proFiltered.map(pt => (
                <Grid item xs={12} sm={6} md={4} key={pt.id}>
                  <TemplateCard {...pt} onUse={() => handleSelect(pt.contenu_html)} />
                </Grid>
              ))}
            </Grid>
          )
        )}

        {tab === 1 && (
          savedFiltered.length === 0 ? (
            <Box textAlign="center" py={8}>
              <CollectionsBookmarkIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
              <Typography fontWeight={700} color="text.secondary" mb={0.5}>
                {search ? `Aucun résultat pour "${search}"` : 'Aucun modèle enregistré'}
              </Typography>
              {!search && (
                <Typography fontSize={13} color="text.disabled">
                  Créez des modèles depuis la section Templates.
                </Typography>
              )}
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {savedFiltered.map(st => (
                <Grid item xs={12} sm={6} md={4} key={st.id}>
                  <TemplateCard {...st} onUse={() => handleSelect(st.contenu_html)} />
                </Grid>
              ))}
            </Grid>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
