import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Divider, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete } from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTags } from '../features/tags/tagsSlice';
import axios from '../api/axios';

const AudienceHealth = () => {
    const dispatch = useDispatch();
    const { items: tags } = useSelector((state) => state.tags || { items: [] });
    const [stats, setStats] = useState({ invalid: 0, bounced: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, category: '', action: '' });
    const [selectedTag, setSelectedTag] = useState(null);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/contacts/health/stats');
            setStats(res.data);
            setError(null);
        } catch (err) {
            console.error('Error loading health stats:', err);
            setError('Failed to load health statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        dispatch(fetchTags());
    }, [dispatch]);

    const handleAction = async () => {
        setActionLoading(true);
        try {
            await axios.post('/contacts/health/bulk-action', {
                category: confirmDialog.category,
                action: confirmDialog.action,
                tagId: selectedTag?.id
            });
            await loadStats();
            setConfirmDialog({ open: false, category: '', action: '' });
            setSelectedTag(null);
        } catch (err) {
            alert('Action failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const categories = [
        { 
            key: 'invalid', 
            label: 'Invalid Emails', 
            count: stats.invalid, 
            icon: <ErrorOutlineIcon sx={{ color: '#d32f2f' }} />, 
            desc: 'Emails with incorrect syntax (missing @, invalid domain, etc.)',
            actions: [
                { label: 'Delete All', variant: 'contained', color: 'error', action: 'delete' },
                { label: 'Tag for Review', variant: 'outlined', action: 'tag' }
            ]
        },
        { 
            key: 'bounced', 
            label: 'Bounced Contacts', 
            count: stats.bounced, 
            icon: <ReplayIcon sx={{ color: '#ed6c02' }} />, 
            desc: 'Contacts whose previous emails resulted in a permanent bounce or error.',
            actions: [
                { label: 'Disable All', variant: 'contained', color: 'primary', action: 'disable' },
                { label: 'Delete All', variant: 'contained', color: 'error', action: 'delete' }
            ]
        },
        { 
            key: 'inactive', 
            label: 'Inactive Contacts', 
            count: stats.inactive, 
            icon: <HourglassEmptyIcon sx={{ color: '#0a84d6' }} />, 
            desc: 'Contacts who haven\'t opened any email in the last 6 months.',
            actions: [
                { label: 'Disable All', variant: 'contained', color: 'primary', action: 'disable' },
                { label: 'Add "Inactive" Tag', variant: 'outlined', action: 'tag' }
            ]
        }
    ];

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box mb={4}>
                <Typography variant="h2" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>Audience Health</Typography>
                <Typography variant="body1" color="text.secondary">
                    Keep your contact list clean to improve deliverability and campaign performance.
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

            <Grid container spacing={4}>
                {categories.map((cat) => (
                    <Grid item xs={12} md={4} key={cat.key}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #bfc9cf', borderRadius: 0 }}>
                            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                <Box display="flex" alignItems="center" mb={2} gap={1.5}>
                                    {cat.icon}
                                    <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>{cat.label}</Typography>
                                </Box>
                                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#3b3f44' }}>{cat.count}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                                    {cat.desc}
                                </Typography>
                            </CardContent>
                            <Divider />
                            <Box p={3} display="flex" flexDirection="column" gap={1.5} sx={{ bgcolor: '#F5F7F9' }}>
                                {cat.actions.map((btn) => (
                                    <Button 
                                        key={btn.label}
                                        fullWidth 
                                        variant={btn.variant} 
                                        color={btn.color || 'primary'}
                                        onClick={() => setConfirmDialog({ open: true, category: cat.key, action: btn.action })}
                                    >
                                        {btn.label}
                                    </Button>
                                ))}
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Confirmation Dialog */}
            <Dialog 
                open={confirmDialog.open} 
                onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
                PaperProps={{ sx: { borderRadius: 0 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Georgia, serif' }}>Confirm Cleanup Action</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom sx={{ mt: 1 }}>
                        Are you sure you want to <strong>{confirmDialog.action}</strong> all contacts in the <strong>{confirmDialog.category}</strong> category?
                    </Typography>
                    {confirmDialog.action === 'tag' && (
                        <Autocomplete
                            options={tags || []}
                            getOptionLabel={(o) => o?.nom || ''}
                            value={selectedTag}
                            onChange={(_, v) => setSelectedTag(v)}
                            renderInput={(params) => <TextField {...params} label="Select Tag" margin="normal" />}
                            sx={{ mt: 2 }}
                        />
                    )}
                    {confirmDialog.action === 'delete' && (
                        <Alert severity="warning" sx={{ mt: 2, borderRadius: 0 }}>This action is permanent and cannot be undone.</Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color={confirmDialog.action === 'delete' ? 'error' : 'secondary'}
                        onClick={handleAction}
                        disabled={actionLoading || (confirmDialog.action === 'tag' && !selectedTag)}
                        sx={{ px: 4 }}
                    >
                        {actionLoading ? <CircularProgress size={24} /> : 'Confirm Action'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AudienceHealth;
