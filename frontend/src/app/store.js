import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import contactsReducer from '../features/contacts/contactsSlice';
import tagsReducer from '../features/tags/tagsSlice';
import segmentsReducer from '../features/segments/segmentsSlice';
import campaignsReducer from '../features/campaigns/campaignsSlice';
import categoriesReducer from '../features/categories/categoriesSlice';
import distributionsReducer from '../features/distributions/distributionsSlice';
import statisticsReducer from '../features/statistics/statisticsSlice';
import templatesReducer from '../features/templates/templatesSlice';
import usersReducer from '../features/users/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    tags: tagsReducer,
    segments: segmentsReducer,
    campaigns: campaignsReducer,
    categories: categoriesReducer,
    distributions: distributionsReducer,
    statistics: statisticsReducer,
    templates: templatesReducer,
    users: usersReducer,
    // Ajouter d'autres reducers ici (contacts, tags, etc.)
  },
}); 