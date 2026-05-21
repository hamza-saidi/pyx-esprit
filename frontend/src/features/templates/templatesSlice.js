import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchTemplates = createAsyncThunk('templates/fetchAll', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/templates');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement modèles');
  }
});

export const suggestTemplate = createAsyncThunk('templates/suggest', async (params, thunkAPI) => {
  try {
    const res = await axios.post('/templates/suggest', params || {});
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur suggestion modèle');
  }
});

export const addTemplate = createAsyncThunk('templates/add', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/templates', data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur ajout modèle');
  }
});

export const updateTemplate = createAsyncThunk('templates/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/templates/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur modification modèle');
  }
});

export const deleteTemplate = createAsyncThunk('templates/delete', async (id, thunkAPI) => {
  try {
    await axios.delete(`/templates/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur suppression modèle');
  }
});

const templatesSlice = createSlice({
  name: 'templates',
  initialState: {
    items: [],
    loading: false,
    error: null,
    suggestion: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTemplate.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      })
      .addCase(suggestTemplate.pending, (state) => {
        state.suggestion = null;
      })
      .addCase(suggestTemplate.fulfilled, (state, action) => {
        state.suggestion = action.payload;
      });
  },
});

export default templatesSlice.reducer; 