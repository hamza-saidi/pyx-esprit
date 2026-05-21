import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

export const fetchContacts = createAsyncThunk('contacts/fetchAll', async (params = {}, thunkAPI) => {
  try {
    const res = await axios.get(`/contacts`, { params });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement contacts');
  }
});

export const addContact = createAsyncThunk('contacts/add', async (data, thunkAPI) => {
  try {
    const res = await axios.post('/contacts', data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur ajout contact');
  }
});

export const updateContact = createAsyncThunk('contacts/update', async ({ id, data }, thunkAPI) => {
  try {
    const res = await axios.put(`/contacts/${id}`, data);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur modification contact');
  }
});

export const deleteContact = createAsyncThunk('contacts/delete', async ({ id, force = false }, thunkAPI) => {
  try {
    await axios.delete(`/contacts/${id}`, { params: { force: force ? 1 : 0 } });
    return id;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || 'Erreur suppression contact';
    return thunkAPI.rejectWithValue(status === 409 ? msg : msg);
  }
});

export const disableContact = createAsyncThunk('contacts/disable', async (id, thunkAPI) => {
  try {
    const res = await axios.patch(`/contacts/${id}/disable`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur désactivation contact');
  }
});

export const enableContact = createAsyncThunk('contacts/enable', async (id, thunkAPI) => {
  try {
    const res = await axios.put(`/contacts/${id}`, { actif: true });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur activation contact');
  }
});

export const addTagToContact = createAsyncThunk('contacts/addTag', async ({ contactId, tagId, tagName }, thunkAPI) => {
  try {
    await axios.post(`/contacts/${contactId}/tags`, { tagId });
    return { contactId, tagId, tagName };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur ajout tag');
  }
});

export const removeTagFromContact = createAsyncThunk('contacts/removeTag', async ({ contactId, tagId }, thunkAPI) => {
  try {
    await axios.delete(`/contacts/${contactId}/tags`, { data: { tagId } });
    return { contactId, tagId };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur suppression tag');
  }
});


const contactsSlice = createSlice({
  name: 'contacts',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    limit: 25,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        // Correction : si la réponse est paginée, on prend action.payload.data, sinon action.payload
        state.items = Array.isArray(action.payload) ? action.payload : (action.payload.data || []);
        if (!Array.isArray(action.payload)) {
          state.total = action.payload.total ?? state.total;
          state.page = action.payload.page ?? state.page;
          state.limit = action.payload.limit ?? state.limit;
        }
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addContact.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        const deletedIdRaw = action.payload;
        const deletedIdNum = Number(deletedIdRaw);
        state.items = state.items.filter((c) => {
          const idNum = Number(c.id);
          return !(c.id === deletedIdRaw || (!Number.isNaN(deletedIdNum) && idNum === deletedIdNum));
        });
        // Optionally adjust total count when we manage it locally
        if (state.total > 0) state.total = state.total - 1;
      })
      .addCase(disableContact.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(enableContact.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(addTagToContact.fulfilled, (state, action) => {
        // Mise à jour immédiate de l'état local
        const contact = state.items.find(c => c.id === action.payload.contactId);
        if (contact && contact.tags) {
          // Ajouter le tag avec le bon nom
          const tagToAdd = { id: action.payload.tagId, nom: action.payload.tagName };
          contact.tags.push(tagToAdd);
        }
      })
      .addCase(removeTagFromContact.fulfilled, (state, action) => {
        // Mise à jour immédiate de l'état local
        const contact = state.items.find(c => c.id === action.payload.contactId);
        if (contact && contact.tags) {
          contact.tags = contact.tags.filter(t => t.id !== action.payload.tagId);
        }
      })
  },
});

export default contactsSlice.reducer; 