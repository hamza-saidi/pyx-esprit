import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchEvents = createAsyncThunk('events/fetchAll', async (params = {}, thunkAPI) => {
  try {
    const res = await axios.get('/contacts/events', { params });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement événements');
  }
});

export const fetchEvent = createAsyncThunk('events/fetchOne', async (id, thunkAPI) => {
  try {
    const res = await axios.get(`/contacts/events/${id}`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur chargement de l'événement");
  }
});

export const createEvent = createAsyncThunk('events/create', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/contacts/events', data);
    return res.data.event;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur création de l'événement");
  }
});

export const updateEvent = createAsyncThunk('events/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/contacts/events/${id}`, data);
    return res.data.event;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur modification de l'événement");
  }
});

export const deleteEvent = createAsyncThunk('events/delete', async (id, thunkAPI) => {
  try {
    await axios.delete(`/contacts/events/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur suppression de l'événement");
  }
});

export const cancelEvent = createAsyncThunk('events/cancel', async ({ id, raison_annulation }, thunkAPI) => {
  try {
    const res = await axios.post(`/contacts/events/${id}/annuler`, { raison_annulation });
    return res.data.event;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur annulation de l'événement");
  }
});

export const inviteContacts = createAsyncThunk('events/invite', async ({ id, contact_ids, message_personnalise }, thunkAPI) => {
  try {
    const res = await axios.post(`/contacts/events/${id}/invite`, { contact_ids, message_personnalise });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Erreur invitation des contacts");
  }
});

export const updateRsvp = createAsyncThunk('events/updateRsvp', async ({ rsvpId, statut, commentaire }, thunkAPI) => {
  try {
    const res = await axios.patch(`/contacts/events/rsvp/${rsvpId}`, { statut, commentaire });
    return res.data.rsvp;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur mise à jour du RSVP');
  }
});

export const fetchEventStats = createAsyncThunk('events/fetchStats', async (id, thunkAPI) => {
  try {
    const res = await axios.get(`/contacts/events/${id}/statistiques`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement des statistiques');
  }
});

const eventsSlice = createSlice({
  name: 'events',
  initialState: {
    items: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    totalPages: 1,
    statsGlobales: {},
    current: null,
    currentLoading: false,
    currentError: null,
    eventStats: null,
    eventStatsLoading: false,
  },
  reducers: {
    clearCurrentEvent: (state) => {
      state.current = null;
      state.eventStats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.totalPages = action.payload.totalPages || 1;
        state.statsGlobales = action.payload.statsGlobales || {};
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEvent.pending, (state) => {
        state.currentLoading = true;
        state.currentError = null;
      })
      .addCase(fetchEvent.fulfilled, (state, action) => {
        state.currentLoading = false;
        state.current = action.payload;
      })
      .addCase(fetchEvent.rejected, (state, action) => {
        state.currentLoading = false;
        state.currentError = action.payload;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const idx = state.items.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.current?.id === action.payload.id) {
          state.current = { ...state.current, ...action.payload };
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e.id !== action.payload);
      })
      .addCase(cancelEvent.fulfilled, (state, action) => {
        const idx = state.items.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.current?.id === action.payload.id) {
          state.current = { ...state.current, ...action.payload };
        }
      })
      .addCase(inviteContacts.fulfilled, (state) => {
        // Detail page re-fetches the event afterward to get the fresh RSVP list.
      })
      .addCase(updateRsvp.fulfilled, (state, action) => {
        if (state.current?.rsvps) {
          const idx = state.current.rsvps.findIndex((r) => r.id === action.payload.id);
          if (idx !== -1) state.current.rsvps[idx] = action.payload;
        }
      })
      .addCase(fetchEventStats.pending, (state) => {
        state.eventStatsLoading = true;
      })
      .addCase(fetchEventStats.fulfilled, (state, action) => {
        state.eventStatsLoading = false;
        state.eventStats = action.payload;
      })
      .addCase(fetchEventStats.rejected, (state) => {
        state.eventStatsLoading = false;
        state.eventStats = null;
      });
  },
});

export default eventsSlice.reducer;
export const { clearCurrentEvent } = eventsSlice.actions;
