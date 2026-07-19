import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Alert,
  IconButton, Tooltip, TextField, InputAdornment, Chip, Dialog,
  DialogContent, DialogActions, LinearProgress,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const FILE_ICONS = { pdf: '📄', mp4: '🎬', mov: '🎬', webm: '🎬' };
const isImage = (name) => /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(name);
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function MediaLibrary() {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [deletingName, setDeletingName] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/templates/media/recent');
      setFiles(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post('/templates/media/upload', fd, {
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });
      toast.success('Fichier uploadé');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (name) => {
    setDeletingName(name);
    try {
      await axios.delete(`/templates/media/${encodeURIComponent(name)}`);
      toast.success('Fichier supprimé');
      setFiles(f => f.filter(x => x.name !== name));
      if (preview?.name === name) setPreview(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur suppression');
    } finally {
      setDeletingName(null);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiée');
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#0d1117' }}>Bibliothèque médias</Typography>
          <Typography sx={{ fontSize: 13, color: '#57606a', mt: 0.3 }}>
            {files.length} fichier{files.length !== 1 ? 's' : ''} · Images et pièces jointes de vos campagnes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: 220, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{ fontSize: 13, textTransform: 'none', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
          >
            {uploading ? 'Upload…' : 'Ajouter un fichier'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf,video/*" hidden onChange={handleUpload} />
        </Box>
      </Box>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 4, borderRadius: 2 }} />
          <Typography sx={{ fontSize: 12, color: '#57606a', mt: 0.5 }}>{uploadProgress} % uploadé</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} sx={{ color: '#2563eb' }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px dashed #e2e8f0', borderRadius: 2, p: 6, textAlign: 'center' }}>
          <ImageIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
          <Typography sx={{ color: '#57606a', fontSize: 14 }}>
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun fichier uploadé pour le moment'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(file => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={file.name}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                  '&:hover': { borderColor: '#2563eb', boxShadow: '0 0 0 2px #dbeafe' },
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onClick={() => setPreview(file)}
              >
                {/* Thumbnail */}
                <Box sx={{ height: 120, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {isImage(file.name) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 36 }}>{FILE_ICONS[file.name.split('.').pop()?.toLowerCase()] || '📎'}</Typography>
                  )}
                </Box>
                {/* Info */}
                <Box sx={{ p: 1.2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#0d1117', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                    {file.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{fmtDate(file.mtime)}</Typography>
                </Box>
                {/* Actions */}
                <Box sx={{ display: 'flex', borderTop: '1px solid #f1f5f9', p: 0.5, gap: 0.5 }} onClick={e => e.stopPropagation()}>
                  <Tooltip title="Copier l'URL">
                    <IconButton size="small" onClick={() => copyUrl(file.url)}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" sx={{ color: '#ef4444', ml: 'auto' }}
                      onClick={() => handleDelete(file.name)}
                      disabled={deletingName === file.name}
                    >
                      {deletingName === file.name
                        ? <CircularProgress size={14} />
                        : <DeleteIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Preview dialog */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md">
        <DialogContent sx={{ p: 0, position: 'relative', minWidth: 320, minHeight: 200, bgcolor: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconButton onClick={() => setPreview(null)} size="small"
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          {preview && isImage(preview.name) && (
            <img src={preview.url} alt={preview.name} style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
          )}
        </DialogContent>
        {preview && (
          <DialogActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{preview.name}</Typography>
              <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(preview.mtime)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => copyUrl(preview.url)}>
                Copier l'URL
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />}
                onClick={() => handleDelete(preview.name)} disabled={deletingName === preview.name}>
                Supprimer
              </Button>
            </Box>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
