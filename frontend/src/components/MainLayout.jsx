import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, IconButton, Divider, Button, Tooltip
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

const expandedWidth = 260; // Slightly wider for Mailchimp feel
const collapsedWidth = 80;

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: <BarChartIcon /> },
    ]
  },
  {
    title: 'Audience',
    items: [
      { label: 'Audience', path: '/contacts', icon: <ContactsIcon /> },
      { label: 'Tags', path: '/tags', icon: <LabelIcon /> },
      { label: 'Segments', path: '/segments', icon: <GroupWorkIcon /> },
      { label: 'Audience Health', path: '/health', icon: <AutoFixHighIcon /> },
    ]
  },
  {
    title: 'Membership',
    items: [
      { label: 'Members', path: '/members', icon: <VerifiedUserIcon /> },
      { label: 'Membership Plans', path: '/membership-plans', icon: <StarIcon /> },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Campaigns', path: '/campagnes', icon: <EmailIcon /> },
      { label: 'Templates', path: '/templates', icon: <ArticleIcon /> },
      { label: 'Automations', path: '/automations', icon: <AutorenewIcon /> },
    ]
  }
];

const adminNav = { label: 'Admin Users', path: '/users', icon: <PeopleIcon /> };

const MainLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleToggleExpand = () => setExpanded((e) => !e);
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const drawerContent = (
    <Box display="flex" flexDirection="column" height="100%" sx={{ bgcolor: '#111827', color: '#e2e8f0', overflowX: 'hidden' }}>
      {/* Logo / Brand */}
      <Box sx={{ 
        px: 2.5, 
        py: 2.5, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        cursor: 'pointer',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        minHeight: 64
      }} onClick={() => navigate('/')}>
        <Box component="img" src="/logo.svg" alt="Pylon Pyx" sx={{ height: 30, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
        {expanded && (
          <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, color: '#fff', fontSize: 16, letterSpacing: '-0.3px' }}>
            Pylon <span style={{ color: '#38bdf8' }}>Pyx</span>
          </Typography>
        )}
      </Box>
      
      {/* Nav Items */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        overflowX: 'hidden', 
        py: 2,
        px: 1.5,
        '&::-webkit-scrollbar': { width: '3px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.12)', borderRadius: '10px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.22)' }
      }}>
        {navSections.map((section) => (
          <Box key={section.title} sx={{ mb: 2 }}>
            {/* Section Label */}
            {expanded && (
              <Typography 
                sx={{ 
                  px: 1.5, 
                  pb: 0.75,
                  pt: 0.25,
                  display: 'block', 
                  color: '#9ca3af',
                  fontWeight: 700, 
                  letterSpacing: '0.08em', 
                  textTransform: 'uppercase',
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {section.title}
              </Typography>
            )}
            {!expanded && <Box sx={{ height: 4 }} />}

            <List sx={{ p: 0 }}>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <ListItem
                    button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    selected={active}
                    sx={{
                      borderRadius: '8px',
                      mb: 0.5,
                      minHeight: 44,
                      px: expanded ? 1.5 : 1,
                      justifyContent: expanded ? 'flex-start' : 'center',
                      color: active ? '#38bdf8 !important' : '#d1d5db !important',
                      bgcolor: active ? 'rgba(56, 189, 248, 0.12) !important' : 'transparent',
                      borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                      transition: 'all 0.18s ease',
                      '&:hover': { 
                        bgcolor: active ? 'rgba(56, 189, 248, 0.16) !important' : 'rgba(255,255,255,0.06) !important',
                        color: '#ffffff !important',
                      },
                      '& .MuiListItemIcon-root': { 
                        color: active ? '#38bdf8' : '#c4c9d4', 
                        minWidth: expanded ? 38 : 'auto',
                        transition: 'color 0.18s ease',
                        '& svg': { fontSize: 20 }
                      },
                    }}
                  >
                    <ListItemIcon>
                      {expanded ? item.icon : (
                        <Tooltip title={item.label} placement="right" arrow>
                          <Box display="inline-flex">{item.icon}</Box>
                        </Tooltip>
                      )}
                    </ListItemIcon>
                    {expanded && (
                      <ListItemText 
                        primary={item.label} 
                        primaryTypographyProps={{ 
                          fontSize: 14, 
                          fontWeight: active ? 600 : 500,
                          fontFamily: 'Inter, sans-serif',
                          letterSpacing: '-0.1px',
                          color: active ? '#38bdf8' : '#e5e7eb',
                        }} 
                      />
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
        
        {/* Admin Section */}
        {user?.role === 'admin' && (
          <Box sx={{ mb: 2 }}>
            {expanded && (
              <Typography sx={{ px: 1.5, pb: 0.75, pt: 0.25, display: 'block', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                Settings
              </Typography>
            )}
            {(() => {
              const active = location.pathname === adminNav.path;
              return (
                <ListItem
                  button
                  component={Link}
                  to={adminNav.path}
                  selected={active}
                  sx={{
                    borderRadius: '8px',
                    mb: 0.5,
                    minHeight: 44,
                    px: expanded ? 1.5 : 1,
                    justifyContent: expanded ? 'flex-start' : 'center',
                    color: active ? '#38bdf8 !important' : '#d1d5db !important',
                    bgcolor: active ? 'rgba(56, 189, 248, 0.12) !important' : 'transparent',
                    borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                    transition: 'all 0.18s ease',
                    '&:hover': { 
                      bgcolor: active ? 'rgba(56, 189, 248, 0.16) !important' : 'rgba(255,255,255,0.06) !important',
                      color: '#ffffff !important',
                    },
                    '& .MuiListItemIcon-root': { 
                      color: active ? '#38bdf8' : '#9ca3af', 
                      minWidth: expanded ? 38 : 'auto',
                      transition: 'color 0.18s ease',
                      '& svg': { fontSize: 20 }
                    },
                  }}
                >
                  <ListItemIcon>
                    {expanded ? adminNav.icon : (
                      <Tooltip title={adminNav.label} placement="right" arrow>
                        <Box display="inline-flex">{adminNav.icon}</Box>
                      </Tooltip>
                    )}
                  </ListItemIcon>
                  {expanded && (
                    <ListItemText 
                      primary={adminNav.label} 
                      primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.1px', color: active ? '#38bdf8' : '#e5e7eb' }} 
                    />
                  )}
                </ListItem>
              );
            })()}
          </Box>
        )}
      </Box>

      <Box p={2.5} sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.15)' }}>
        {expanded ? (
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box 
              sx={{ 
                width: 36, height: 36, 
                borderRadius: '50%', 
                bgcolor: '#38bdf8', 
                color: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                flexShrink: 0
              }}
            >
              {user?.nom ? user.nom.charAt(0).toUpperCase() : 'A'}
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Typography variant="subtitle2" noWrap sx={{ color: '#f8fafc', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{user?.nom || 'Admin'}</Typography>
              <Typography variant="caption" noWrap sx={{ color: '#64748b', fontSize: 11, display: 'block' }}>{user?.email}</Typography>
            </Box>
            <Tooltip title="Sign Out" placement="top" arrow>
              <IconButton size="small" onClick={handleLogout} sx={{ color: '#64748b', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                <ExitToAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
             <Box 
              sx={{ 
                width: 32, height: 32, 
                borderRadius: '50%', 
                bgcolor: '#38bdf8', 
                color: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12
              }}
            >
              {user?.nom ? user.nom.charAt(0).toUpperCase() : 'A'}
            </Box>
            <Tooltip title="Sign Out" placement="right" arrow>
              <IconButton size="small" sx={{ color: '#64748b', '&:hover': { color: '#ef4444' } }} onClick={handleLogout}>
                <ExitToAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        
        <Box display="flex" justifyContent={expanded ? 'flex-end' : 'center'} mt={1.5}>
          <IconButton 
            onClick={handleToggleExpand} 
            size="small"
            sx={{ color: '#64748b', '&:hover': { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            {expanded ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      <Box
        component="nav"
        sx={{ width: { sm: expanded ? expandedWidth : collapsedWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { bgcolor: '#3b3f44', borderRight: 'none' } }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: expandedWidth, border: 'none' }
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          PaperProps={{ sx: { bgcolor: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.05)' } }}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: expanded ? expandedWidth : collapsedWidth,
              overflowX: 'hidden',
              border: 'none',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 4, md: 6 }, // More whitespace
          width: { sm: `calc(100% - ${expanded ? expandedWidth : collapsedWidth}px)` },
          maxWidth: '1600px', // Prevent too wide layouts
          mx: 'auto'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout; 