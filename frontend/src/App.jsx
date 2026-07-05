import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import { ToastProvider } from './context/ToastContext';

const PageLoader = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    bgcolor="#f8fafc"
    gap={2}
  >
    <Box
      component="img"
      src="/logo.svg"
      alt="Pylon Pyx"
      sx={{ height: 32, opacity: 0.35 }}
    />
    <CircularProgress size={22} sx={{ color: '#2563eb' }} />
  </Box>
);

const Contacts = React.lazy(() => import('./pages/Contacts'));
const TagsAndSegmentsHub = React.lazy(() => import('./pages/TagsAndSegmentsHub'));
const Campagnes = React.lazy(() => import('./pages/Campaigns'));
const Statistics = React.lazy(() => import('./pages/Statistics'));
const Birthdays = React.lazy(() => import('./pages/Birthdays'));
const Templates = React.lazy(() => import('./pages/Templates'));
const EmailComposer = React.lazy(() => import('./pages/EmailComposer'));
const Users = React.lazy(() => import('./pages/Users'));
const AudienceHealth = React.lazy(() => import('./pages/AudienceHealth'));
const PublicRegister = React.lazy(() => import('./pages/PublicRegister'));
const Unsubscribe = React.lazy(() => import('./pages/Unsubscribe'));
const Automations = React.lazy(() => import('./pages/Automations'));
const MembersAndPlansHub = React.lazy(() => import('./pages/MembersAndPlansHub'));
const Settings = React.lazy(() => import('./pages/Settings'));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));

function App() {
  return (
    <Router>
      <CssBaseline />
      <ToastProvider>
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/register" element={<PublicRegister />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="health" element={<AudienceHealth />} />
              <Route path="tags" element={<TagsAndSegmentsHub />} />
              <Route path="segments" element={<TagsAndSegmentsHub />} />
              <Route path="campagnes" element={<Campagnes />} />
              <Route path="automations" element={<Automations />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="birthdays" element={<Birthdays />} />
              <Route path="templates" element={<Templates />} />
              <Route path="membership-plans" element={<MembersAndPlansHub />} />
              <Route path="members" element={<MembersAndPlansHub />} />
              <Route path="composer" element={<EmailComposer />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
              <Route path="superadmin" element={<SuperAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </ToastProvider>
    </Router>
  );
}

export default App;
