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
import EmailIcon from '@mui/icons-material/Email';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SpeedIcon from '@mui/icons-material/Speed';
import LayersIcon from '@mui/icons-material/Layers';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import EventIcon from '@mui/icons-material/Event';

const SIDEBAR_EXPANDED = 252;
const SIDEBAR_COLLAPSED = 72;

const OWNER_NAV_SECTIONS = [
  {
    title: 'Plateforme',
    items: [
      { label: 'Tenants', path: '/superadmin', icon: <ApartmentIcon />, exactMatch: true },
      { label: 'Monitoring', path: '/superadmin/monitoring', icon: <SpeedIcon /> },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Plans', path: '/superadmin/plans', icon: <LayersIcon /> },
      { label: 'Licences', path: '/superadmin/licences', icon: <VpnKeyIcon /> },
      { label: 'Billing', path: '/superadmin/billing', icon: <CreditCardIcon /> },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Support', path: '/superadmin/support', icon: <HeadsetMicIcon /> },
    ],
  },
];

const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { label: 'Home', path: '/', icon: <DashboardIcon /> },
    ],
  },
  {
    title: 'Campagnes',
    items: [
      { label: 'Campagnes', path: '/campagnes', icon: <EmailIcon />, matchPaths: ['/campagnes', '/composer'] },
      { label: 'Automatisations', path: '/automations', icon: <AutorenewIcon />, matchPaths: ['/automations', '/birthdays'] },
    ],
  },
  {
    title: 'Audience',
    items: [
      { label: 'Contacts', path: '/contacts', icon: <ContactsIcon /> },
      { label: 'Tags & Segments', path: '/tags', icon: <LabelIcon />, matchPaths: ['/tags', '/segments'] },
      { label: 'Santé de liste', path: '/health', icon: <AutoFixHighIcon /> },
      { label: 'Membres', path: '/members', icon: <VerifiedUserIcon />, matchPaths: ['/members', '/membership-plans'] },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Statistiques', path: '/statistics', icon: <BarChartIcon /> },
    ],
  },
  {
    title: 'Événements',
    items: [
      { label: 'Tournois', path: '/events', icon: <EventIcon /> },
    ],
  },
  {
    title: 'Contenus',
    items: [
      { label: 'Médias', path: '/media', icon: <PermMediaIcon /> },
    ],
  },
];

const ADMIN_NAV_ITEMS = [
  { label: 'Équipe', path: '/users', icon: <PeopleIcon /> },
  { label: 'Paramètres', path: '/settings', icon: <SettingsIcon /> },
];

const PAGE_ACTIONS = {
  '/contacts': { label: 'Nouveau contact', path: '/contacts?create=1' },
  '/automations': { label: 'Nouvelle automation', path: '/automations?create=1' },
  '/members': { label: 'Nouveau membre', path: '/members?create=1' },
  '/membership-plans': { label: 'Nouveau plan', path: '/membership-plans?create=1' },
  '/users': { label: 'Nouvel utilisateur', path: '/users?create=1' },
};

const PAGE_META = {
  '/': { title: 'Home', subtitle: 'Vue d\'ensemble de votre activité' },
  '/contacts': { title: 'Contacts', subtitle: 'Gérez votre audience' },
  '/tags': { title: 'Tags & Segments', subtitle: 'Étiquettes et groupes dynamiques' },
  '/segments': { title: 'Segments', subtitle: 'Groupes dynamiques' },
  '/health': { title: 'Santé de liste', subtitle: 'Qualité et engagement de votre audience' },
  '/members': { title: 'Membres', subtitle: 'Membres & abonnements' },
  '/membership-plans': { title: 'Plans d\'abonnement', subtitle: 'Formules et tarifs' },
  '/campagnes': { title: 'Campagnes', subtitle: 'Envois d\'emails' },
  '/templates': { title: 'Modèles', subtitle: 'Bibliothèque de designs' },
  '/automations': { title: 'Automatisations', subtitle: 'Emails déclenchés automatiquement' },
  '/birthdays': { title: 'Anniversaires', subtitle: 'Emails d\'anniversaire automatiques' },
  '/statistics': { title: 'Statistiques', subtitle: 'Performance de vos campagnes' },
  '/media': { title: 'Médias', subtitle: 'Images et fichiers de vos campagnes' },
  '/users': { title: 'Équipe', subtitle: 'Gestion des accès et des rôles' },
  '/settings': { title: 'Paramètres', subtitle: 'Compte email et configuration' },
  '/composer': { title: 'Éditeur', subtitle: 'Créer un email' },
  '/superadmin': { title: 'Tenants', subtitle: 'Provisioning et gestion des workspaces' },
  '/superadmin/monitoring': { title: 'Monitoring', subtitle: 'Santé de la plateforme en temps réel' },
  '/superadmin/plans': { title: 'Plans', subtitle: 'Plans tarifaires et fonctionnalités' },
  '/superadmin/licences': { title: 'Licences', subtitle: 'Licences et abonnements actifs' },
  '/superadmin/support': { title: 'Support', subtitle: 'Tickets et demandes d\'assistance' },
  '/superadmin/billing': { title: 'Billing', subtitle: 'Facturation et revenus de la plateforme' },
};

const isNavActive = (item, pathname) => {
  const paths = item.matchPaths || [item.path];
  return paths.some((p) =>
    p === '/' ? pathname === '/' :
    item.exactMatch ? pathname === p :
    pathname === p || pathname.startsWith(p + '/')
  );
};

const NavItem = ({ item, expanded }) => {
  const location = useLocation();
  const active = isNavActive(item, location.pathname);

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
  const isOwner = user?.role === 'global_admin';
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

      {/* Quick action — tenant only */}
      {!isOwner && (
        <Box sx={{ px: 1.25, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
          {expanded ? (
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/campagnes?create=1')}
              sx={{
                bgcolor: '#38bdf8',
                color: '#0b1120',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: '8px',
                textTransform: 'none',
                justifyContent: 'flex-start',
                px: 1.75,
                minHeight: 36,
                gap: 0.75,
                '&:hover': { bgcolor: '#7dd3fc' },
                '& .MuiButton-startIcon': { mr: 0 },
              }}
              startIcon={<AddIcon sx={{ fontSize: '18px !important' }} />}
            >
              Créer une campagne
            </Button>
          ) : (
            <Tooltip title="Créer une campagne" placement="right">
              <Box
                onClick={() => navigate('/campagnes?create=1')}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  bgcolor: '#38bdf8',
                  color: '#0b1120',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  mx: 'auto',
                  '&:hover': { bgcolor: '#7dd3fc' },
                }}
              >
                <AddIcon sx={{ fontSize: 20 }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Nav */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.5,
          px: 1.25,
          '&::-webkit-scrollbar': { width: '3px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
        }}
      >
        {isOwner ? (
          /* Owner Platform nav */
          OWNER_NAV_SECTIONS.map((section, sIdx) => (
            <Box key={sIdx} sx={{ mb: 1 }}>
              {expanded && section.title && (
                <Typography sx={{
                  px: 1.5, pb: 0.5, pt: sIdx > 0 ? 1.25 : 0,
                  display: 'block', color: '#38bdf8', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10.5,
                }}>
                  {section.title}
                </Typography>
              )}
              {!expanded && sIdx > 0 && <Divider sx={{ borderColor: 'rgba(56,189,248,0.15)', my: 1 }} />}
              <List sx={{ p: 0 }}>
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} expanded={expanded} />
                ))}
              </List>
            </Box>
          ))
        ) : (
          /* Tenant Platform nav */
          <>
            {NAV_SECTIONS.map((section, sIdx) => (
              <Box key={sIdx} sx={{ mb: 1 }}>
                {expanded && section.title && (
                  <Typography sx={{
                    px: 1.5, pb: 0.5, pt: sIdx > 0 ? 1.25 : 0,
                    display: 'block', color: '#334155', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10.5,
                  }}>
                    {section.title}
                  </Typography>
                )}
                {!expanded && sIdx > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />}
                <List sx={{ p: 0 }}>
                  {section.items.map((item) => (
                    <NavItem key={item.path} item={item} expanded={expanded} />
                  ))}
                </List>
              </Box>
            ))}
            {user?.role === 'admin' && (
              <Box sx={{ mt: 1 }}>
                {expanded && (
                  <Typography sx={{
                    px: 1.5, pb: 0.5, pt: 1,
                    display: 'block', color: '#334155', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10.5,
                  }}>
                    Workspace
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
          </>
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc', '--sidebar-w': expanded ? `${SIDEBAR_EXPANDED}px` : `${SIDEBAR_COLLAPSED}px`, '--topbar-h': '60px' }}>
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
