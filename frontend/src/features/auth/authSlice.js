import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const login = createAsyncThunk('auth/login', async (payload, thunkAPI) => {
  try {
    const res = await axios.post('/auth/login', payload);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 202 && err.response?.data?.mfa_required) {
      // Some setups may throw; handle both success 202 and error-throw 202
      return thunkAPI.fulfillWithValue(err.response.data);
    }
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur de connexion');
  }
});

export const verifyMfa = createAsyncThunk('auth/verifyMfa', async ({ pending_token, code }, thunkAPI) => {
  try {
    const res = await axios.post('/auth/verify-mfa', { pending_token, code });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur vérification MFA');
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
  try {
    await axios.post('/auth/logout');
    return true;
  } catch (err) {
    return true;
  }
});

function loadPersistedAuth() {
  try {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token: token || null, user: user || null };
  } catch {
    return { token: null, user: null };
  }
}

const persisted = loadPersistedAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: persisted.token, user: persisted.user, loading: false, error: null, mfa: { required: false, pendingToken: null, method: null } },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.mfa_required) {
          state.mfa.required = true;
          state.mfa.pendingToken = action.payload.pending_token;
          state.mfa.method = action.payload.mfa_method || 'email';
          return;
        }
        state.token = action.payload?.token || null;
        state.user = action.payload?.user || null;
        try {
          if (state.token) localStorage.setItem('token', state.token);
          if (state.user) localStorage.setItem('user', JSON.stringify(state.user));
        } catch {}
      })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(verifyMfa.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyMfa.fulfilled, (state, action) => {
        state.loading = false;
        state.mfa.required = false;
        state.mfa.pendingToken = null;
        state.mfa.method = null;
        state.token = action.payload?.token || null;
        state.user = action.payload?.user || null;
        try {
          if (state.token) localStorage.setItem('token', state.token);
          if (state.user) localStorage.setItem('user', JSON.stringify(state.user));
        } catch {}
      })
      .addCase(verifyMfa.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.mfa = { required: false, pendingToken: null, method: null };
        state.error = null;
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
      });
  },
});

export default authSlice.reducer; 