import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchTags = createAsyncThunk('tags/fetchAll', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/tags');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement tags');
  }
});

export const addTag = createAsyncThunk('tags/add', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/tags', data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur ajout tag');
  }
});

export const updateTag = createAsyncThunk('tags/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/tags/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur modification tag');
  }
});

export const deleteTag = createAsyncThunk('tags/delete', async (id, thunkAPI) => {
  try {
    await axios.delete(`/tags/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur suppression tag');
  }
});

export const fetchTagsWithCounts = createAsyncThunk('tags/fetchWithCounts', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/tags/cloud/metrics');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement métriques tags');
  }
});

export const mergeTags = createAsyncThunk('tags/merge', async ({ sourceIds, targetId }, thunkAPI) => {
  try {
    const res = await axios.post('/tags/merge', { sourceIds, targetId });
    // Refresh all data after merge
    thunkAPI.dispatch(fetchTags());
    thunkAPI.dispatch(fetchTagsWithCounts());
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur fusion tags');
  }
});

const tagsSlice = createSlice({
  name: 'tags',
  initialState: {
    items: [],
    loading: false,
    error: null,
    tagsWithCounts: [],
    countsLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTag.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      })
      .addCase(fetchTagsWithCounts.pending, (state) => {
        state.countsLoading = true;
      })
      .addCase(fetchTagsWithCounts.fulfilled, (state, action) => {
        state.countsLoading = false;
        state.tagsWithCounts = action.payload;
      })
      .addCase(fetchTagsWithCounts.rejected, (state) => {
        state.countsLoading = false;
      });
  },
});

export default tagsSlice.reducer; 