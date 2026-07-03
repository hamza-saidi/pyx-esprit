import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemIcon, ListItemText,
  Typography, IconButton, Divider, Button, Tooltip,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ContactsIcon from '@mui/icons-material/Contacts';
import LabelIcon from '@mui/icons-material/Label';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import EmailIcon from '@mui/icons-material/Email';
import BarChartIcon from '@mui/icons-material/BarChart';
import CakeIcon from '@mui/icons-material/Cake';
import ArticleIcon from '@mui/icons-material/Article';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const SIDEBAR_EXPANDED = 252;
const SIDEBAR_COLLAPSED = 72;

const NAV_SECTIONS = [
  {
    title: 'Vue d\'ensemble',
    items: [
      { label: 'Tableau de bord', path: '/', icon: <DashboardIcon /> },
    ],
  },
  {
    title: 'Audience',
    items: [
      { label: 'Contacts', path: '/contacts', icon: <ContactsIcon /> },
      { label: 'Étiquettes', path: '/tags', icon: <LabelIcon /> },
      { label: 'Segments', path: '/segments', icon: <GroupWorkIcon /> },
      { label: 'Santé', path: '/health', icon: <AutoFixHighIcon /> },
    ],
  },
  {
    title: 'Membres',
    items: [
      { label: 'Membres', path: '/members', icon: <VerifiedUserIcon /> },
      { label: 'Plans', path: '/membership-plans', icon: <StarIcon /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Campagnes', path: '/campagnes', icon: <EmailIcon /> },
      { label: 'Modèles', path: '/templates', icon: <ArticleIcon /> },
      { label: 'Automatisations', path: '/automations', icon: <AutorenewIcon /> },
    ],
  },
  {
    title: 'Analytique',
    items: [
      { label: 'Statistiques', path: '/statistics', icon: <BarChartIcon /> },
    ],
  },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Utilisateurs', path: '/users', icon: <PeopleIcon /> },
  { label: 'Paramètres', path: '/settings', icon: <SettingsIcon /> },
];

const SUPERADMIN_NAV_ITEMS = [
  { label: 'Console Pylon', path: '/superadmin', icon: <AdminPanelSettingsIcon /> },
];

const PAGE_ACTIONS = {
  '/contacts': { label: 'Nouveau contact', path: '/contacts?create=1' },
  '/tags': { label: 'Nouvelle étiquette', path: '/tags?create=1' },
  '/segments': { label: 'Nouveau segment', path: '/segments?create=1' },
  '/campagnes': { label: 'Nouvelle campagne', path: '/composer' },
  '/templates': { label: 'Nouveau modèle', path: '/templates?create=1' },
  '/automations': { label: 'Nouvelle automation', path: '/automations?create=1' },
  '/members': { label: 'Nouveau membre', path: '/members?create=1' },
  '/membership-plans': { label: 'Nouveau plan', path: '/membership-plans?create=1' },
  '/users': { label: 'Nouvel utilisateur', path: '/users?create=1' },
};

const PAGE_META = {
  '/': { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' },
  '/contacts': { title: 'Contacts', subtitle: 'Gérez votre audience' },
  '/tags': { title: 'Étiquettes', subtitle: 'Catégorisez vos contacts' },
  '/segments': { title: 'Segments', subtitle: 'Groupes dynamiques' },
  '/health': { title: 'Santé de l\'audience', subtitle: 'Qualité de votre liste' },
  '/members': { title: 'Membres', subtitle: 'Licenciés du club' },
  '/membership-plans': { title: 'Plans d\'abonnement', subtitle: 'Formules et tarifs' },
  '/campagnes': { title: 'Campagnes', subtitle: 'Envois d\'emails en masse' },
  '/templates': { title: 'Modèles', subtitle: 'Bibliothèque de designs' },
  '/automations': { title: 'Automatisations', subtitle: 'Emails déclenchés automatiquement' },
  '/birthdays': { title: 'Anniversaires', subtitle: 'Emails d\'anniversaire automatiques' },
  '/statistics': { title: 'Statistiques', subtitle: 'Performance de vos campagnes' },
  '/users': { title: 'Utilisateurs', subtitle: 'Gestion des accès' },
  '/settings': { title: 'Paramètres', subtitle: 'Compte email et configuration' },
  '/composer': { title: 'Éditeur', subtitle: 'Créer un email' },
  '/superadmin': { title: 'Console Pylon', subtitle: 'Administration globale de la plateforme SaaS' },
};

const NavItem = ({ item, expanded }) => {
  const location = useLocation();
  const active = location.pathname === item.path;

  return (
    <ListItem
      button
      component={Link}
      to={item.path}
      selected={active}
      sx={{
        borderRadius: '8px',
        mb: 0.5,
        minHeight: 42,
        px: expanded ? 1.5 : 1,
        justifyContent: expanded ? 'flex-start' : 'center',
        color: active ? '#38bdf8 !important' : '#94a3b8 !important',
        bgcolor: active ? 'rgba(56,189,248,0.10) !important' : 'transparent',
        borderLeft: active ? '2px solid #38bdf8' : '2px solid transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.06) !important',
          color: '#e2e8f0 !important',
        },
        '& .MuiListItemIcon-root': {
          color: active ? '#38bdf8' : '#475569',
          minWidth: expanded ? 36 : 'auto',
          transition: 'color 0.15s ease',
          '& svg': { fontSize: 19 },
        },
      }}
    >
      <ListItemIcon>
        {expanded ? (
          item.icon
        ) : (
          <Tooltip title={item.label} placement="right">
            <Box display="inline-flex">{item.icon}</Box>
          </Tooltip>
        )}
      </ListItemIcon>
      {expanded && (
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: 13.5,
            fontWeight: active ? 600 : 500,
            letterSpacing: '-0.1px',
            color: active ? '#e2e8f0' : '#94a3b8',
          }}
        />
      )}
    </ListItem>
  );
};

const MainLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);

  const pageMeta = PAGE_META[location.pathname] || { title: 'Pylon Pyx', subtitle: '' };
  const pageAction = PAGE_ACTIONS[location.pathname] || null;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const sidebarContent = (
    <Box display="flex" flexDirection="column" height="100%" sx={{ bgcolor: '#0b1120', overflowX: 'hidden' }}>
      {/* Logo */}
      <Box
        onClick={() => navigate('/')}
        sx={{
          px: 2.5,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          justifyContent: expanded ? 'flex-start' : 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: 60,
          flexShrink: 0,
        }}
      >
        <Box
          component="img"
          src="/logo.svg"
          alt="Pylon Pyx"
          sx={{ height: 26, filter: 'brightness(0) invert(1)', flexShrink: 0 }}
        />
        {expanded && (
          <Typography
            sx={{
              fontWeight: 800,
              color: '#f8fafc',
              fontSize: 15,
              letterSpacing: '-0.3px',
              lineHeight: 1,
            }}
          >
            Pylon{' '}
            <Box component="span" sx={{ color: '#38bdf8' }}>
              Pyx
            </Box>
          </Typography>
        )}
      </Box>

      {/* Nav */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 2,
          px: 1.25,
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
        }}
      >
        {NAV_SECTIONS.map((section, sIdx) => (
          <Box key={section.title} sx={{ mb: 1.5 }}>
            {expanded ? (
              <Typography
                sx={{
                  px: 1.5,
                  pb: 0.5,
                  pt: sIdx > 0 ? 1 : 0,
                  display: 'block',
                  color: '#334155',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                {section.title}
              </Typography>
            ) : (
              sIdx > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />
            )}
            <List sx={{ p: 0 }}>
              {section.items.map((item) => (
                <NavItem key={item.path} item={item} expanded={expanded} />
              ))}
            </List>
          </Box>
        ))}

        {/* Admin section */}
        {(user?.role === 'admin' || user?.role === 'global_admin') && (
          <Box sx={{ mt: 1 }}>
            {expanded && (
              <Typography
                sx={{
                  px: 1.5,
                  pb: 0.5,
                  pt: 1,
                  display: 'block',
                  color: '#334155',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                Admin
              </Typography>
            )}
            {!expanded && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />}
            <List sx={{ p: 0 }}>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavItem key={item.path} item={item} expanded={expanded} />
              ))}
            </List>
          </Box>
        )}

        {/* Console Pylon — global_admin uniquement */}
        {user?.role === 'global_admin' && (
          <Box sx={{ mt: 1 }}>
            {expanded && (
              <Typography
                sx={{
                  px: 1.5,
                  pb: 0.5,
                  pt: 1,
                  display: 'block',
                  color: '#38bdf8',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                Pylon SaaS
              </Typography>
            )}
            {!expanded && <Divider sx={{ borderColor: 'rgba(56,189,248,0.2)', my: 1 }} />}
            <List sx={{ p: 0 }}>
              {SUPERADMIN_NAV_ITEMS.map((item) => (
                <NavItem key={item.path} item={item} expanded={expanded} />
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* User footer */}
      <Box
        sx={{
          flexShrink: 0,
          p: 1.5,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          bgcolor: 'rgba(0,0,0,0.2)',
        }}
      >
        {expanded ? (
          <Box display="flex" alignItems="center" gap={1.25}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#38bdf8',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {user?.nom ? user.nom.charAt(0).toUpperCase() : 'A'}
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Typography
                noWrap
                sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}
              >
                {user?.nom || 'Admin'}
              </Typography>
              <Typography noWrap sx={{ color: '#475569', fontSize: 11, display: 'block' }}>
                {user?.email}
              </Typography>
            </Box>
            <Tooltip title="Déconnexion" placement="top">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  color: '#475569',
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' },
                }}
              >
                <ExitToAppIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
            <Tooltip title={user?.nom || 'Admin'} placement="right">
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  bgcolor: '#38bdf8',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'default',
                }}
              >
                {user?.nom ? user.nom.charAt(0).toUpperCase() : 'A'}
              </Box>
            </Tooltip>
            <Tooltip title="Déconnexion" placement="right">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{ color: '#475569', '&:hover': { color: '#ef4444' } }}
              >
                <ExitToAppIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box display="flex" justifyContent={expanded ? 'flex-end' : 'center'} mt={1}>
          <IconButton
            size="small"
            onClick={() => setExpanded((e) => !e)}
            sx={{ color: '#334155', '&:hover': { color: '#94a3b8', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            {expanded ? <ChevronLeftIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED },
          flexShrink: { sm: 0 },
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: SIDEBAR_EXPANDED, border: 'none' },
          }}
        >
          {sidebarContent}
        </Drawer>
        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
              border: 'none',
              overflowX: 'hidden',
              transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>

      {/* Main area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* TopBar */}
        <Box
          sx={{
            height: 60,
            px: { xs: 3, sm: 4 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              noWrap
              sx={{ lineHeight: 1.25, color: '#0f172a' }}
            >
              {pageMeta.title}
            </Typography>
            {pageMeta.subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {pageMeta.subtitle}
              </Typography>
            )}
          </Box>
          {pageAction && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => navigate(pageAction.path)}
              sx={{ flexShrink: 0 }}
            >
              {pageAction.label}
            </Button>
          )}
        </Box>

        {/* Scrollable content */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: { xs: 3, sm: 4 },
            bgcolor: '#f8fafc',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
