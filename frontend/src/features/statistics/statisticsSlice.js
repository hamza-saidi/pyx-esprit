import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchStatistics = createAsyncThunk('statistics/fetch', async ({ campaignId, page = 1, limit = 20, search = '', status = 'all' }, thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/stats/campaign/${campaignId}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`);
    return res.data;
  } catch (err) {

    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement statistiques');
  }
});


export const fetchDashboard = createAsyncThunk('statistics/dashboard', async (periode = '30j', thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/stats/dashboard?periode=${periode}`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement dashboard');
  }
});

export const fetchComparison = createAsyncThunk('statistics/comparison', async ({ periode1 = '30j', periode2 = '60j' }, thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/stats/comparaison?periode1=${periode1}&periode2=${periode2}`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement comparaison');
  }
});

export const fetchSegmentStats = createAsyncThunk('statistics/segment', async (segmentId, thunkAPI) => {
  try {
    const res = await axios.get(`/campagnes/stats/segment/${segmentId}`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement statistiques segment');
  }
});

const statisticsSlice = createSlice({
  name: 'statistics',
  initialState: {
    data: null,
    dashboard: null,
    comparison: null,
    segmentStats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearData: (state) => {
      state.data = null;
      state.dashboard = null;
      state.comparison = null;
      state.segmentStats = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Statistics
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Dashboard
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Comparison
      .addCase(fetchComparison.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComparison.fulfilled, (state, action) => {
        state.loading = false;
        state.comparison = action.payload;
      })
      .addCase(fetchComparison.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Segment Stats
      .addCase(fetchSegmentStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSegmentStats.fulfilled, (state, action) => {
        state.loading = false;
        state.segmentStats = action.payload;
      })
      .addCase(fetchSegmentStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearData } = statisticsSlice.actions;
export default statisticsSlice.reducer; 