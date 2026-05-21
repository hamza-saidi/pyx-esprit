import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Utiliser l'instance axios configurée qui gère automatiquement l'URL de base
const API_BASE = '/campagnes';

// Thunks asynchrones
export const fetchCampagnes = createAsyncThunk(
  'campagnes/fetchCampagnes',
  async ({ page = 1, limit = 10, statut, type, search } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (statut) params.append('statut', statut);
      if (type) params.append('type', type);
      if (search) params.append('search', search);

      const response = await axios.get(`${API_BASE}?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement des campagnes');
    }
  }
);

export const fetchCampagneById = createAsyncThunk(
  'campagnes/fetchCampagneById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement de la campagne');
    }
  }
);

export const createCampagne = createAsyncThunk(
  'campagnes/createCampagne',
  async (campagneData, { rejectWithValue }) => {
    try {
      const response = await axios.post(API_BASE, campagneData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création de la campagne');
    }
  }
);

export const updateCampagne = createAsyncThunk(
  'campagnes/updateCampagne',
  async ({ id, campagneData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE}/${id}`, campagneData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour de la campagne');
    }
  }
);

export const deleteCampagne = createAsyncThunk(
  'campagnes/deleteCampagne',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression de la campagne');
    }
  }
);

export const programmerCampagne = createAsyncThunk(
  'campagnes/programmerCampagne',
  async ({ id, date_programmation }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/${id}/programmer`, { date_programmation });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la programmation de la campagne');
    }
  }
);

export const annulerCampagne = createAsyncThunk(
  'campagnes/annulerCampagne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/${id}/annuler`, {});
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de l\'annulation de la campagne');
    }
  }
);

export const calculerDestinataires = createAsyncThunk(
  'campagnes/calculerDestinataires',
  async (criteria, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/calculer-destinataires`, criteria);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du calcul des destinataires');
    }
  }
);

export const fetchStatistiques = createAsyncThunk(
  'campagnes/fetchStatistiques',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/${id}/statistiques`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement des statistiques');
    }
  }
);

export const duplicateCampagne = createAsyncThunk(
  'campagnes/duplicateCampagne',
  async ({ id, nouveau_titre }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/${id}/dupliquer`, { nouveau_titre });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la duplication de la campagne');
    }
  }
);

// Slice
const campagnesSlice = createSlice({
  name: 'campagnes',
  initialState: {
    items: [],
    currentCampagne: null,
    destinataires: null,
    statistiques: null,
    loading: false,
    error: null,
    total: 0,
    page: 1,
    totalPages: 1
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCampagne: (state) => {
      state.currentCampagne = null;
    },
    clearDestinataires: (state) => {
      state.destinataires = null;
    },
    clearStatistiques: (state) => {
      state.statistiques = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCampagnes
      .addCase(fetchCampagnes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampagnes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(fetchCampagnes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchCampagneById
      .addCase(fetchCampagneById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampagneById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCampagne = action.payload;
      })
      .addCase(fetchCampagneById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // createCampagne
      .addCase(createCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCampagne.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // updateCampagne
      .addCase(updateCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCampagne.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentCampagne && state.currentCampagne.id === action.payload.id) {
          state.currentCampagne = action.payload;
        }
      })
      .addCase(updateCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // deleteCampagne
      .addCase(deleteCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCampagne.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // programmerCampagne
      .addCase(programmerCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(programmerCampagne.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.campagne.id);
        if (index !== -1) {
          state.items[index] = action.payload.campagne;
        }
        if (state.currentCampagne && state.currentCampagne.id === action.payload.campagne.id) {
          state.currentCampagne = action.payload.campagne;
        }
      })
      .addCase(programmerCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // annulerCampagne
      .addCase(annulerCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(annulerCampagne.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.campagne.id);
        if (index !== -1) {
          state.items[index] = action.payload.campagne;
        }
        if (state.currentCampagne && state.currentCampagne.id === action.payload.campagne.id) {
          state.currentCampagne = action.payload.campagne;
        }
      })
      .addCase(annulerCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // calculerDestinataires
      .addCase(calculerDestinataires.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculerDestinataires.fulfilled, (state, action) => {
        state.loading = false;
        state.destinataires = action.payload;
      })
      .addCase(calculerDestinataires.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchStatistiques
      .addCase(fetchStatistiques.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatistiques.fulfilled, (state, action) => {
        state.loading = false;
        state.statistiques = action.payload;
      })
      .addCase(fetchStatistiques.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // duplicateCampagne
      .addCase(duplicateCampagne.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(duplicateCampagne.fulfilled, (state, action) => {
        state.loading = false;
        // Ajouter la campagne dupliquée au début de la liste
        if (action.payload?.campagne) {
          state.items.unshift(action.payload.campagne);
          state.total += 1;
        }
      })
      .addCase(duplicateCampagne.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearCurrentCampagne, clearDestinataires, clearStatistiques } = campagnesSlice.actions;

export default campagnesSlice.reducer;
