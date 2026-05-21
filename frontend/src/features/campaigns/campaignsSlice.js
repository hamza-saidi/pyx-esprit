import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchCampaigns = createAsyncThunk('campaigns/fetchAll', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/campagnes');
    return res.data; // { data, total, ... }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement campagnes');
  }
});

export const addCampaign = createAsyncThunk('campaigns/add', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/campagnes', data);
    return res.data; // { message, campagne }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || { message: 'Erreur ajout campagne' });
  }
});

export const updateCampaign = createAsyncThunk('campaigns/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/campagnes/${id}`, data);
    return res.data; // { message, campagne }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || { message: 'Erreur modification campagne' });
  }
});

export const deleteCampaign = createAsyncThunk('campaigns/delete', async (id, thunkAPI) => {
  try {
    await axios.delete(`/campagnes/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur suppression campagne');
  }
});

export const calculateRecipients = createAsyncThunk('campaigns/calculateRecipients', async (payload, thunkAPI) => {
  try {
    const res = await axios.post('/campagnes/calculer-destinataires', payload);
    return res.data; // { nombre_destinataires, contacts: [...] }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur calcul destinataires');
  }
});

export const sendCampaign = createAsyncThunk('campaigns/send', async (id, thunkAPI) => {
  try {
    const res = await axios.post(`/campagnes/${id}/envoyer`);
    return res.data; // { message, campagne }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur envoi campagne');
  }
});

export const scheduleCampaign = createAsyncThunk('campaigns/schedule', async ({ id, date_programmation }, thunkAPI) => {
  try {
    const res = await axios.post(`/campagnes/${id}/programmer`, { date_programmation });
    return res.data; // { message, campagne }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur programmation campagne');
  }
});

export const cancelCampaign = createAsyncThunk('campaigns/cancel', async (id, thunkAPI) => {
  try {
    const res = await axios.post(`/campagnes/${id}/annuler`);
    return res.data; // { message, campagne }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur annulation campagne');
  }
});

export const fetchCampaignStatsLight = createAsyncThunk('campaigns/fetchStatsLight', async (id, thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/${id}/statistiques?light=1`);
    return { id, data: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement statistiques');
  }
});

export const duplicateCampaign = createAsyncThunk('campaigns/duplicate', async ({ id, nouveau_titre }, thunkAPI) => {
  try {
    const res = await axios.post(`/campagnes/${id}/dupliquer`, { nouveau_titre });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur duplication campagne');
  }
});

export const fetchFollowupGroups = createAsyncThunk('campaigns/fetchFollowupGroups', async (id, thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/${id}/followup-groups`);
    return res.data; // { campaign_id, campaign_titre, groups: { clickers, openers, non_openers } }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement groupes de suivi');
  }
});

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState: {
    items: [],
    loading: false,
    error: null,
    recipientPreview: { count: 0, contacts: [] },
    progress: {}, // id -> { total, envoyes, erreurs, ouverts, clics, statut }
    total: 0,
    page: 1,
    totalPages: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data || [];
        state.total = action.payload?.total || state.items.length;
        state.page = action.payload?.page || 1;
        state.totalPages = action.payload?.totalPages || 1;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addCampaign.fulfilled, (state, action) => {
        if (action.payload?.campagne) state.items.push(action.payload.campagne);
      })
      .addCase(updateCampaign.fulfilled, (state, action) => {
        const updated = action.payload?.campagne;
        if (updated) {
          const idx = state.items.findIndex((c) => c.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        }
      })
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      })
      .addCase(calculateRecipients.fulfilled, (state, action) => {
        state.recipientPreview.count = action.payload?.nombre_destinataires || 0;
        state.recipientPreview.contacts = action.payload?.contacts || [];
      })
      .addCase(sendCampaign.fulfilled, (state, action) => {
        const updated = action.payload?.campagne;
        if (updated) {
          const idx = state.items.findIndex((c) => c.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        }
      })
      .addCase(scheduleCampaign.fulfilled, (state, action) => {
        const updated = action.payload?.campagne;
        if (updated) {
          const idx = state.items.findIndex((c) => c.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        }
      })
      .addCase(cancelCampaign.fulfilled, (state, action) => {
        const updated = action.payload?.campagne;
        if (updated) {
          const idx = state.items.findIndex((c) => c.id === updated.id);
          if (idx !== -1) state.items[idx] = updated;
        }
      })
      .addCase(fetchCampaignStatsLight.fulfilled, (state, action) => {
        const { id, data } = action.payload;
        state.progress[id] = {
          total: data?.stats_en_temps_reel?.total || 0,
          envoyes: data?.stats_en_temps_reel?.envoyes || 0,
          erreurs: data?.stats_en_temps_reel?.erreurs || 0,
          ouverts: data?.stats_en_temps_reel?.ouverts || 0,
          clics: data?.stats_en_temps_reel?.clics || 0,
          statut: data?.campagne?.statut || 'brouillon',
        };
      })
      .addCase(duplicateCampaign.fulfilled, (state, action) => {
        // Ajouter la campagne dupliquée au début de la liste
        if (action.payload?.campagne) {
          state.items.unshift(action.payload.campagne);
          state.total += 1;
        }
      });
  },
});

export default campaignsSlice.reducer; 