import React, { useState } from 'react';
import { Box, Button, Paper, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem } from '@mui/material';
import EmailRenderer from './EmailRenderer';

export const defaultEmailDoc = {
  version: 1,
  styles: { fontFamily: 'Arial, sans-serif', color: '#333333', buttonColor: '#1976d2' },
  header: { show: true, logoUrl: '', title: '' },
  footer: { show: true, text: '© Votre Club. Se désabonner: {{desabonnement}}' },
  blocks: [
    { type: 'title', text: 'Titre de votre email' },
    { type: 'text', html: '<p>Bonjour {{prenom}},</p><p>Votre message…</p>' },
    { type: 'button', label: 'Voir plus', url: 'https://example.com' }
  ]
};

export default function EmailBlockEditor({ value, onChange }) {
  const [doc, setDoc] = useState(value || defaultEmailDoc);
  const update = (next) => { setDoc(next); onChange?.(next); };
  const [imageDialog, setImageDialog] = useState({ open: false, index: -1, url: '' });
  const [recentAssets, setRecentAssets] = useState([]);
  const [tokenAnchor, setTokenAnchor] = useState(null);
  const tokens = ['{{prenom}}', '{{nom}}', '{{email}}', '{{desabonnement}}'];

  const addBlock = (type) => update({ ...doc, blocks: [...(doc.blocks || []), { type }] });
  const updateBlock = (i, patch) => { const blocks = [...doc.blocks]; blocks[i] = { ...blocks[i], ...patch }; update({ ...doc, blocks }); };
  const removeBlock = (i) => { const blocks = [...doc.blocks]; blocks.splice(i, 1); update({ ...doc, blocks }); };
  const moveBlock = (i, dir) => { const to = i + dir; if (to < 0 || to >= doc.blocks.length) return; const blocks = [...doc.blocks]; const [b] = blocks.splice(i,1); blocks.splice(to,0,b); update({ ...doc, blocks }); };

  return (
    <Box display="grid" gridTemplateColumns="320px 1fr" gap={2}>
      <Paper sx={{ p: 2 }}>
        <Box mb={1}>Ajouter un bloc</Box>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <Button size="small" variant="outlined" onClick={() => addBlock('title')}>Titre</Button>
          <Button size="small" variant="outlined" onClick={() => addBlock('text')}>Texte</Button>
          <Button size="small" variant="outlined" onClick={() => addBlock('image')}>Image</Button>
          <Button size="small" variant="outlined" onClick={() => addBlock('button')}>Bouton</Button>
          <Button size="small" variant="outlined" onClick={() => addBlock('divider')}>Séparateur</Button>
          <Button size="small" variant="outlined" onClick={() => addBlock('spacer')}>Espace</Button>
        </Box>

        <Box mt={2}>Paramètres (Settings)</Box>
        <TextField fullWidth size="small" label="Largeur max (px)" value={doc.styles?.maxWidth || 600} onChange={(e) => update({ ...doc, styles: { ...(doc.styles || {}), maxWidth: Number(e.target.value) || 600 } })} sx={{ mt: 1 }} />
        <TextField fullWidth size="small" label="Police" value={doc.styles?.fontFamily || ''} onChange={(e) => update({ ...doc, styles: { ...(doc.styles || {}), fontFamily: e.target.value } })} sx={{ mt: 1 }} />
        <TextField fullWidth size="small" label="Couleur texte" value={doc.styles?.color || ''} onChange={(e) => update({ ...doc, styles: { ...(doc.styles || {}), color: e.target.value } })} sx={{ mt: 1 }} />
        <TextField fullWidth size="small" label="Couleur boutons" value={doc.styles?.buttonColor || ''} onChange={(e) => update({ ...doc, styles: { ...(doc.styles || {}), buttonColor: e.target.value } })} sx={{ mt: 1 }} />
        <TextField fullWidth size="small" label="Fond (page)" value={doc.styles?.pageBg || '#ffffff'} onChange={(e) => update({ ...doc, styles: { ...(doc.styles || {}), pageBg: e.target.value } })} sx={{ mt: 1 }} />

        <Box mt={2}>En‑tête</Box>
        <TextField fullWidth size="small" label="Titre" value={doc.header?.title || ''} onChange={(e) => update({ ...doc, header: { ...(doc.header || {}), show: true, title: e.target.value } })} sx={{ mt: 1 }} />
        <TextField fullWidth size="small" label="Logo URL" value={doc.header?.logoUrl || ''} onChange={(e) => update({ ...doc, header: { ...(doc.header || {}), show: true, logoUrl: e.target.value } })} sx={{ mt: 1 }} />

        <Box mt={2}>Pied de page</Box>
        <TextField fullWidth size="small" label="Texte" value={doc.footer?.text || ''} onChange={(e) => update({ ...doc, footer: { ...(doc.footer || {}), show: true, text: e.target.value } })} sx={{ mt: 1 }} />
      </Paper>

      <Box>
        {(doc.blocks || []).map((b, i) => (
          <Paper key={i} sx={{ p: 2, mb: 1 }}>
            <Box display="flex" gap={1} mb={1}>
              <Button size="small" onClick={() => moveBlock(i, -1)}>↑</Button>
              <Button size="small" onClick={() => moveBlock(i, 1)}>↓</Button>
              <Button size="small" color="error" onClick={() => removeBlock(i)}>Supprimer</Button>
            </Box>
            {b.type === 'title' && (
              <TextField fullWidth label="Texte du titre" value={b.text || ''} onChange={(e) => updateBlock(i, { text: e.target.value })} />
            )}
            {b.type === 'text' && (
              <Box>
                <Box display="flex" gap={1} mb={1}>
                  <Button size="small" onClick={(e)=>setTokenAnchor(e.currentTarget)}>Insérer un jeton</Button>
                </Box>
                <TextField fullWidth multiline minRows={4} label="Texte (basique)" value={b.html || ''} onChange={(e) => updateBlock(i, { html: e.target.value })} helperText="Placeholders: {{prenom}}, {{nom}}, {{desabonnement}}" />
                <Menu anchorEl={tokenAnchor} open={!!tokenAnchor} onClose={()=>setTokenAnchor(null)}>
                  {tokens.map(t => (
                    <MenuItem key={t} onClick={()=>{ updateBlock(i, { html: (b.html||'') + ' ' + t }); setTokenAnchor(null); }}>{t}</MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
            {b.type === 'image' && (
              <Box display="flex" gap={1}>
                <TextField fullWidth label="URL de l'image" value={b.url || ''} onChange={(e) => updateBlock(i, { url: e.target.value })} />
                <Button onClick={() => setImageDialog({ open: true, index: i, url: b.url || '' })}>Parcourir…</Button>
              </Box>
            )}
            {b.type === 'button' && (
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                <TextField label="Label" value={b.label || ''} onChange={(e) => updateBlock(i, { label: e.target.value })} />
                <TextField label="Lien" value={b.url || ''} onChange={(e) => updateBlock(i, { url: e.target.value })} />
                <TextField label="UTM source" value={b.utm_source || ''} onChange={(e)=>updateBlock(i,{ utm_source: e.target.value })} />
                <TextField label="UTM medium" value={b.utm_medium || ''} onChange={(e)=>updateBlock(i,{ utm_medium: e.target.value })} />
                <TextField label="UTM campaign" value={b.utm_campaign || ''} onChange={(e)=>updateBlock(i,{ utm_campaign: e.target.value })} />
              </Box>
            )}
            {b.type === 'spacer' && (
              <TextField label="Hauteur" type="number" value={b.height || 16} onChange={(e) => updateBlock(i, { height: Number(e.target.value) })} />
            )}
            {b.type === 'divider' && (<Box fontSize={12} color="text.secondary">Ligne de séparation</Box>)}
          </Paper>
        ))}
        <Paper sx={{ p: 1 }}>
          <EmailRenderer doc={doc} />
        </Paper>
      </Box>
      <Dialog open={imageDialog.open} onClose={() => setImageDialog({ open: false, index: -1, url: '' })}>
        <DialogTitle>Choisir une image</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={1} mb={1}>
            <Button variant="outlined" size="small" component="label">
              Uploader
              <input hidden type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const form = new FormData();
                form.append('file', f);
                try {
                  const res = await fetch('/api/templates/media/upload', { method:'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` }, body: form });
                  const data = await res.json();
                  if (res.ok && data.url) {
                    setImageDialog(prev => ({ ...prev, url: data.url }));
                    // refresh recent
                    const rr = await fetch('/api/templates/media/recent', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` } });
                    const list = await rr.json();
                    setRecentAssets(Array.isArray(list) ? list : []);
                  }
                } catch {}
              }} />
            </Button>
            <Button variant="text" size="small" onClick={async ()=>{
              try {
                const rr = await fetch('/api/templates/media/recent', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` } });
                const list = await rr.json();
                setRecentAssets(Array.isArray(list) ? list : []);
              } catch {}
            }}>Rafraîchir</Button>
          </Box>
          <TextField fullWidth label="URL de l'image" value={imageDialog.url} onChange={(e)=>setImageDialog(prev=>({ ...prev, url: e.target.value }))} />
          <Box mt={2} display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1}>
            {recentAssets.map(a => (
              <Button key={a.name} variant="outlined" onClick={()=>setImageDialog(prev=>({ ...prev, url: a.url }))} sx={{ p:0 }}>
                <img src={a.url} alt="" style={{ width:'100%', height:80, objectFit:'cover' }} />
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialog({ open: false, index: -1, url: '' })}>Annuler</Button>
          <Button variant="contained" onClick={() => { if (imageDialog.index >= 0) updateBlock(imageDialog.index, { url: imageDialog.url }); setImageDialog({ open: false, index: -1, url: '' }); }}>Insérer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


