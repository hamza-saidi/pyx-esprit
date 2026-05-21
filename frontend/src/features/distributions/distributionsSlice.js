import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchDistributions = createAsyncThunk('distributions/fetchAll', async (_, thunkAPI) => {
  try {
    const res = await axios.get('/distributions');
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement distributions');
  }
});

const distributionsSlice = createSlice({
  name: 'distributions',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDistributions.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDistributions.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchDistributions.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export default distributionsSlice.reducer;




































