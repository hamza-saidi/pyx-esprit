import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchSegments = createAsyncThunk('segments/fetchAll', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/segments');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement segments');
  }
});

export const addSegment = createAsyncThunk('segments/add', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/segments', data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur ajout segment');
  }
});

export const updateSegment = createAsyncThunk('segments/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/segments/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur modification segment');
  }
});

export const deleteSegment = createAsyncThunk('segments/delete', async (id, thunkAPI) => {
  try {
    await axios.delete(`/segments/${id}`);
    return id;
  } catch (err) {
    const data = err.response?.data;
    return thunkAPI.rejectWithValue(data?.campaigns ? data : (data?.message || 'Erreur suppression segment'));
  }
});
export const detachSegmentCampaigns = createAsyncThunk('segments/detachCampaigns', async ({ id, campaignIds }, thunkAPI) => {
  try {
    const res = await axios.post(`/segments/${id}/detach-campaigns`, { campaignIds });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur détachement campagnes');
  }
});

export const previewSegmentCount = createAsyncThunk('segments/previewCount', async (criteres, thunkAPI) => {
  try {
    const res = await axios.post('/segments/preview-count', { criteres });
    return res.data.count;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur prévisualisation');
  }
});

export const fetchSegmentContacts = createAsyncThunk('segments/fetchContacts', async (id, thunkAPI) => {
  try {
    const res = await axios.get(`/segments/${id}/contacts`);
    return { id, contacts: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement contacts du segment');
  }
});

const segmentsSlice = createSlice({
  name: 'segments',
  initialState: {
    items: [],
    loading: false,
    error: null,
    previewCount: null,
    previewLoading: false,
    contactsPreview: [],
    contactsPreviewForId: null,
    contactsPreviewLoading: false,
  },
  reducers: {
    clearContactsPreview: (state) => {
      state.contactsPreview = [];
      state.contactsPreviewForId = null;
      state.contactsPreviewLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSegments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSegments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSegments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addSegment.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateSegment.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteSegment.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      })
      .addCase(previewSegmentCount.pending, (state) => {
        state.previewLoading = true;
        state.previewCount = null;
      })
      .addCase(previewSegmentCount.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.previewCount = action.payload;
      })
      .addCase(previewSegmentCount.rejected, (state) => {
        state.previewLoading = false;
        state.previewCount = null;
      })
      .addCase(fetchSegmentContacts.pending, (state, action) => {
        state.contactsPreviewLoading = true;
        state.contactsPreviewForId = action.meta.arg;
        state.contactsPreview = [];
      })
      .addCase(fetchSegmentContacts.fulfilled, (state, action) => {
        state.contactsPreviewLoading = false;
        state.contactsPreviewForId = action.payload.id;
        state.contactsPreview = action.payload.contacts || [];
      })
      .addCase(fetchSegmentContacts.rejected, (state) => {
        state.contactsPreviewLoading = false;
        state.contactsPreview = [];
        state.contactsPreviewForId = null;
      });
  },
});

export default segmentsSlice.reducer; 
export const { clearContactsPreview } = segmentsSlice.actions;