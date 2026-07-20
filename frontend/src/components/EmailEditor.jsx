import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge
} from '@mui/material';
import {
  Code as CodeIcon,
  Visibility as PreviewIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as ListIcon,
  FormatListNumbered as NumberedListIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  PhoneIphone as MobileIcon,
  DesktopMac as DesktopIcon,
  PersonAdd as MergeTagIcon,
  AlternateEmail as PersonalizeIcon
} from '@mui/icons-material';
import UnderlineIcon from '@mui/icons-material/FormatUnderlined';
import {
  AddCircleOutline as AddIcon,
  PaletteOutlined as StyleIcon,
  AutoGraphOutlined as OptimizeIcon,
  DragIndicator as DragIcon,
  ContentCopy as DuplicateIcon,
  DeleteOutline as DeleteIcon,
  Settings as SettingsIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const buildGlobalCss = (gs) => `
  :root {
    --primary-color: ${gs.primaryColor};
    --secondary-color: ${gs.secondaryColor};
    --font-family: ${gs.fontFamily};
    --h1-color: ${gs.h1Color};
    --h1-size: ${gs.h1Size};
    --h2-color: ${gs.h2Color};
    --h2-size: ${gs.h2Size};
    --body-color: ${gs.bodyColor};
    --body-size: ${gs.bodySize};
    --link-color: ${gs.linkColor};
    --link-decoration: ${gs.linkDecoration};
    --btn-radius: ${gs.btnRadius};
    --btn-padding: ${gs.btnPadding};
    --btn-color: ${gs.btnColor};
    --img-radius: ${gs.imageRadius};
    --block-spacing: ${gs.blockSpacing};
    --container-width: ${gs.containerWidth};
    --line-height: ${gs.lineHeight};
  }
  body { background-color: ${gs.bodyBg}; font-family: var(--font-family); color: var(--body-color); line-height: var(--line-height); }
  h1 { color: var(--h1-color); font-size: var(--h1-size); font-weight: ${gs.h1Weight}; margin-bottom: 0.5em; margin-top: 0; }
  h2 { color: var(--h2-color); font-size: var(--h2-size); margin-bottom: 0.5em; margin-top: 0; }
  p { margin-bottom: 1em; font-size: var(--body-size); }
  a { color: var(--link-color); text-decoration: var(--link-decoration); }
  img { border-radius: var(--img-radius); max-width: 100%; height: auto; }
  .btn-primary { background-color: var(--primary-color) !important; color: var(--btn-color) !important; border-radius: var(--btn-radius) !important; padding: var(--btn-padding) !important; text-decoration: none; display: inline-block; font-weight: 700; }
  .main-container { max-width: var(--container-width) !important; width: 100% !important; }
  .block-wrapper { padding: var(--block-spacing) 0; }
`;

const EmailEditor = ({
  value = '',
  onChange,
  onSave,
  onSend,
  onTest,
  onTextChange = null,
  loading = false,
  readOnly = false,
  canvasHeight = 'calc(100vh - 140px)',
  templateHtml = null,
  onTemplateLoaded = null,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(3);
  const [sidebarTab, setSidebarTab] = useState('add');
  const [globalDesignOpen, setGlobalDesignOpen] = useState(true);
  const [htmlContent, setHtmlContent] = useState(value);
  const [textContent, setTextContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [auditResults, setAuditResults] = useState([]);
  const [linkDialog, setLinkDialog] = useState({ open: false, url: '', mode: 'link' });
  const [saveBlockDialog, setSaveBlockDialog] = useState({ open: false, nom: '' });
  const quillRef = useRef(null);
  const gjsRef = useRef(null);
  const gjsEditorRef = useRef(null);
  const imageInputRef = useRef(null);
  const linkCallbackRef = useRef(null);
  const lastSyncedRef = useRef('');
  const [gjsReady, setGjsReady] = useState(false);
  const [builderDevice, setBuilderDevice] = useState('Desktop');
  const [selectedPath, setSelectedPath] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [importHtmlDialog, setImportHtmlDialog] = useState({ open: false, html: '' });
  const [canvasEmpty, setCanvasEmpty] = useState(false);
  const [globalStyles, setGlobalStyles] = useState({
    bodyBg: '#FFFFFF',
    canvasBg: '#f0f0f0',
    primaryColor: '#0a84d6',
    secondaryColor: '#3b3f44',
    fontFamily: 'Inter, sans-serif',
    h1Color: '#1a1a2e',
    h1Size: '32px',
    h1Weight: '700',
    h2Color: '#1a1a2e',
    h2Size: '24px',
    bodyColor: '#3b3f44',
    bodySize: '16px',
    linkColor: '#0a84d6',
    linkDecoration: 'none',
    btnRadius: '4px',
    btnPadding: '12px 24px',
    btnColor: '#FFFFFF',
    imageRadius: '0px',
    blockSpacing: '20px',
    containerWidth: '600px',
    lineHeight: '1.6'
  });
  const globalStylesRef = useRef(globalStyles);
  useEffect(() => {
    setHtmlContent(value);
  }, [value]);

  useEffect(() => {
    if (gjsRef.current && !gjsEditorRef.current) {
      const editor = grapesjs.init({
        container: gjsRef.current,
        height: '600px',
        fromElement: false,
        storageManager: false,
        canvas: {
          styles: [],
          scripts: [],
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Mobile', width: '375px', widthMedia: '480px' }
          ]
        },
        blockManager: { appendTo: '#blocks-container' },
        selectorManager: { appendTo: '#selectors-container' },
        traitManager: { appendTo: '#traits-container' },
        assetManager: {
          upload: '/api/templates/media/upload',
          uploadName: 'file',
          params: {},
          multiUpload: false,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
        panels: { defaults: [] },
        styleManager: {
          sectors: [
            {
              name: 'Dimension',
              open: false,
              properties: ['width', 'height', 'padding', 'margin']
            },
            {
              name: 'Typography',
              open: true,
              properties: [
                { property: 'font-family', name: 'Font' },
                { property: 'font-size', name: 'Size' },
                { property: 'font-weight', name: 'Weight' },
                { property: 'color', name: 'Color' },
                { property: 'text-align', name: 'Alignment' },
                { property: 'line-height', name: 'Line Spacing' }
              ]
            },
            {
              name: 'Colors & Borders',
              open: false,
              properties: ['background-color', 'border-radius', 'border']
            }
          ]
        }
      });

      // --- SVG mini-thumbnails keyed by block display name ---
      const _BL = {
        'En-tête':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect width="42" height="34" rx="3" fill="#1a1a2e"/><rect x="4" y="10" width="22" height="3.5" rx="1.5" fill="rgba(255,255,255,.9)"/><rect x="4" y="17" width="14" height="2" rx="1" fill="rgba(255,255,255,.4)"/><rect x="4" y="22" width="10" height="2" rx="1" fill="rgba(255,255,255,.25)"/></svg>`,
        'Texte':      `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="22" height="3" rx="1" fill="#374151"/><rect x="3" y="12" width="36" height="2" rx="1" fill="#9ca3af"/><rect x="3" y="17" width="36" height="2" rx="1" fill="#9ca3af"/><rect x="3" y="22" width="36" height="2" rx="1" fill="#9ca3af"/><rect x="3" y="27" width="20" height="2" rx="1" fill="#9ca3af"/></svg>`,
        'Image':      `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="40" height="32" rx="3" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><path d="M1 24 L12 14 L21 21 L30 13 L41 24 V31 Q41 33 39 33 H3 Q1 33 1 31 Z" fill="#d1d5db"/><circle cx="12" cy="10" r="3.5" fill="#9ca3af"/></svg>`,
        'Bouton':     `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="11" width="26" height="12" rx="4" fill="#1a1a2e"/><rect x="14" y="15.5" width="14" height="2.5" rx="1" fill="white"/></svg>`,
        'Tournoi':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect width="42" height="34" rx="3" fill="#1a1a2e"/><line x1="16" y1="5" x2="16" y2="28" stroke="#FFE01B" stroke-width="1.5"/><path d="M16 5 L29 10 L16 15 Z" fill="#FFE01B"/><rect x="11" y="27" width="10" height="2" rx="1" fill="rgba(255,255,255,.4)"/></svg>`,
        'Tee Time':   `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><circle cx="21" cy="17" r="13" fill="#f0f4f8" stroke="#d1d5db" stroke-width="1.2"/><line x1="21" y1="8" x2="21" y2="17" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="21" y1="17" x2="27" y2="21" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><circle cx="21" cy="17" r="1.5" fill="#374151"/></svg>`,
        'Handicap':   `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="4"  y="20" width="7" height="10" rx="1" fill="#0a84d6"/><rect x="13" y="14" width="7" height="16" rx="1" fill="#0a84d6" opacity=".75"/><rect x="22" y="9"  width="7" height="21" rx="1" fill="#0a84d6" opacity=".5"/><rect x="31" y="4"  width="7" height="26" rx="1" fill="#0a84d6" opacity=".3"/></svg>`,
        'Adhésion':   `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="38" height="24" rx="4" fill="#1a1a2e"/><rect x="2" y="5" width="38" height="12" rx="4" fill="#0a84d6"/><rect x="8" y="21" width="12" height="2" rx="1" fill="rgba(255,255,255,.5)"/><rect x="8" y="25" width="18" height="2" rx="1" fill="rgba(255,255,255,.25)"/></svg>`,
        '2 Colonnes': `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="17" height="26" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><rect x="23" y="4" width="17" height="26" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/></svg>`,
        '3 Colonnes': `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="1"  y="4" width="12" height="26" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><rect x="15" y="4" width="12" height="26" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><rect x="29" y="4" width="12" height="26" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/></svg>`,
        'Séparateur': `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><line x1="4" y1="17" x2="38" y2="17" stroke="#9ca3af" stroke-width="2" stroke-dasharray="5 3"/></svg>`,
        'Citation':   `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="3.5" height="22" rx="1.5" fill="#0a84d6"/><rect x="10" y="9"  width="28" height="2.5" rx="1" fill="#374151" opacity=".6"/><rect x="10" y="15" width="22" height="2.5" rx="1" fill="#374151" opacity=".4"/><rect x="10" y="21" width="25" height="2.5" rx="1" fill="#374151" opacity=".4"/></svg>`,
        'Vidéo':      `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="38" height="26" rx="3" fill="#1a1a2e"/><polygon points="17,11 17,23 29,17" fill="white"/></svg>`,
        'Réseaux':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="17" r="6" fill="#1877f2"/><circle cx="21" cy="17" r="6" fill="#1da1f2"/><circle cx="32" cy="17" r="6" fill="#e1306c"/></svg>`,
        'Pied de page': `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="34" height="1.5" rx="1" fill="#d1d5db"/><rect x="9" y="9"  width="24" height="2" rx="1" fill="#9ca3af"/><rect x="13" y="14" width="16" height="2" rx="1" fill="#c4c9d0"/><rect x="4" y="19" width="34" height="1.5" rx="1" fill="#d1d5db"/><rect x="11" y="24" width="20" height="2" rx="1" fill="#d1d5db"/><rect x="13" y="29" width="16" height="2" rx="1" fill="#e5e7eb"/></svg>`,
        'Produit':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="38" height="18" rx="2" fill="#e5e7eb"/><path d="M2 14 L12 8 L22 13 L30 7 L40 12 V20 Q40 20 38 20 H4 Q2 20 2 20 Z" fill="#d1d5db"/><rect x="9" y="24" width="24" height="7" rx="3" fill="#1a1a2e"/><rect x="14" y="26.5" width="14" height="2" rx="1" fill="white"/></svg>`,
        'Sondage':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="10" r="3.5" stroke="#374151" stroke-width="1.5" fill="none"/><rect x="16" y="9"  width="22" height="2" rx="1" fill="#9ca3af"/><circle cx="8" cy="19" r="3.5" stroke="#374151" stroke-width="1.5" fill="none"/><rect x="16" y="18" width="18" height="2" rx="1" fill="#9ca3af"/><circle cx="8" cy="28" r="3.5" fill="#374151"/><rect x="16" y="27" width="20" height="2" rx="1" fill="#374151"/></svg>`,
        'App':        `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="1" width="16" height="32" rx="4" fill="#1a1a2e"/><rect x="15" y="5" width="12" height="18" rx="1" fill="#0a84d6" opacity=".4"/><circle cx="21" cy="28" r="2" fill="rgba(255,255,255,.5)"/></svg>`,
        'Bannière':   `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect width="42" height="34" rx="3" fill="#0a84d6"/><rect x="6" y="11" width="18" height="3.5" rx="1.5" fill="white"/><rect x="6" y="18" width="12" height="2" rx="1" fill="rgba(255,255,255,.6)"/></svg>`,
        'Espace':     `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><line x1="21" y1="5" x2="21" y2="29" stroke="#d1d5db" stroke-width="1.2" stroke-dasharray="3 2"/><polygon points="15,9 21,4 27,9" fill="#cbd5e1"/><polygon points="15,25 21,30 27,25" fill="#cbd5e1"/></svg>`,
        'Galerie':    `<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="2"  y="5" width="11" height="24" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><rect x="15" y="5" width="12" height="24" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/><rect x="29" y="5" width="11" height="24" rx="2" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1"/></svg>`,
        'Suggestions':`<svg width="42" height="34" viewBox="0 0 42 34" xmlns="http://www.w3.org/2000/svg"><rect x="1"  y="2" width="11" height="30" rx="2" fill="#f0f4f8" stroke="#e2e8f0" stroke-width="1"/><rect x="2" y="3" width="9" height="10" rx="1" fill="#d1d5db"/><rect x="15" y="2" width="12" height="30" rx="2" fill="#f0f4f8" stroke="#e2e8f0" stroke-width="1"/><rect x="16" y="3" width="10" height="10" rx="1" fill="#d1d5db"/><rect x="29" y="2" width="12" height="30" rx="2" fill="#f0f4f8" stroke="#e2e8f0" stroke-width="1"/><rect x="30" y="3" width="10" height="10" rx="1" fill="#d1d5db"/></svg>`,
      };

      // --- Helper: renders SVG thumbnail (keyed by name) + block label ---
      const blockLabel = (icon, name) => {
        const svg = _BL[name] || `<span style="font-size:18px;">${icon}</span>`;
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;">
            <div style="width:44px;height:36px;display:flex;align-items:center;justify-content:center;background:#f0f4f8;border-radius:6px;overflow:hidden;">${svg}</div>
            <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.4px;">${name}</div>
          </div>`;
      };

      const bm = editor.BlockManager;

      // --- Mailchimp Inspired Blocks ---
      bm.getAll().reset(); // Clear default blocks to start fresh with custom categories
      
      const categoryBasic = 'Blocs de base';
      const categoryGolf = '⛳ Golf';
      const categoryLayout = 'Mises en page';
      const categoryMarketing = 'Commerce & Engagement';

      // --- Mailchimp Inspired Robust Blocks (Table-Based) ---

      // 1. Header Block (Fixed for Outlook/Gmail compatibility)
      bm.add('header-golf', {
        label: blockLabel('🖼️', 'En-tête'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper" style="background-color: #1a1a2e;" bgcolor="#1a1a2e">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1a1a2e">
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="background-color: #1a1a2e;">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: center;">
                    <tr>
                      <td style="padding: 40px 20px;">
                        <h1 style="color: #FFFFFF; margin: 0; text-transform: uppercase;">PYLON PYX</h1>
                        <p style="margin: 10px 0 0; font-size: 14px; text-transform: uppercase; color: #FFFFFF; font-weight: bold; letter-spacing: 2px;">Premium Experience</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 2. Text Block
      bm.add('text-section', {
        label: blockLabel('📝', 'Texte'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: left;">
                    <tr>
                      <td style="padding: 0 20px;">
                        <h2>Article Title</h2>
                        <p>Write your content here. This block automatically follows your global typography and spacing settings. You can add more paragraphs, links, and formatting as needed.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 3. Image Block
      bm.add('image-single', {
        label: blockLabel('🖼️', 'Image'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper" style="text-align: center;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td style="padding: 0 20px;">
                        <img src="https://placehold.co/600x350?text=Feature+Image" width="600" style="width: 100%; height: auto; display: block;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 4. Button
      bm.add('cta-button', {
        label: blockLabel('🔘', 'Bouton'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td align="center" style="padding: 10px 20px;">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary">ACTION BUTTON</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // ── Golf blocks (métier) ──────────────────────────────────────────────────
      editor.BlockManager.add('golf-tournament', {
        label: blockLabel('🏆', 'Tournoi'),
        category: categoryGolf,
        content: `
          <div class="block-wrapper" bgcolor="#1a1a2e" style="background-color:#1a1a2e;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1a1a2e">
              <tr>
                <td align="center" bgcolor="#1a1a2e" style="background-color:#1a1a2e;">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin:0 auto;text-align:center;max-width:600px;">
                    <tr>
                      <td style="padding:50px 30px 40px;">
                        <p style="margin:0 0 10px;font-size:11px;letter-spacing:4px;color:#FFE01B;text-transform:uppercase;font-weight:700;">⛳ Invitation Officielle</p>
                        <h1 style="margin:0 0 14px;font-size:34px;font-weight:800;color:#ffffff;line-height:1.2;">Tournoi du Printemps 2025</h1>
                        <table width="280" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;border-top:1px solid rgba(255,255,255,0.2);border-bottom:1px solid rgba(255,255,255,0.2);">
                          <tr>
                            <td align="center" style="padding:16px 0;">
                              <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;">Date &amp; Lieu</p>
                              <p style="margin:0;font-size:16px;color:#ffffff;font-weight:600;">Samedi 15 Mars 2025 · 08h00</p>
                              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Parcours Les Pins Royaux — Trou 1</p>
                            </td>
                          </tr>
                        </table>
                        <a href="#" style="display:inline-block;background:#FFE01B;color:#1a1a2e;padding:15px 36px;font-weight:800;font-size:14px;text-decoration:none;border-radius:4px;letter-spacing:0.5px;">S'inscrire au tournoi</a>
                        <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">Places limitées · Inscription avant le 10 Mars</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      editor.BlockManager.add('golf-tee-time', {
        label: blockLabel('🕐', 'Tee Time'),
        category: categoryGolf,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin:0 auto;max-width:600px;">
                    <tr>
                      <td style="padding:30px 30px 0;">
                        <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1a1a2e;">Confirmation de Tee Time</h2>
                        <p style="margin:0 0 24px;font-size:14px;color:#666;">Votre réservation est confirmée, {{prenom}} !</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 30px 30px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;">
                          <tr>
                            <td width="50%" style="padding:20px;border-right:1px solid #e8ecf0;vertical-align:top;">
                              <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Date</p>
                              <p style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">Dim. 16 Mars 2025</p>
                            </td>
                            <td width="50%" style="padding:20px;vertical-align:top;">
                              <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Heure de départ</p>
                              <p style="margin:0;font-size:18px;font-weight:700;color:#0a84d6;">09:30</p>
                            </td>
                          </tr>
                          <tr>
                            <td width="50%" style="padding:20px;border-top:1px solid #e8ecf0;border-right:1px solid #e8ecf0;vertical-align:top;">
                              <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Parcours</p>
                              <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">Parcours Rouge — 18 trous</p>
                            </td>
                            <td width="50%" style="padding:20px;border-top:1px solid #e8ecf0;vertical-align:top;">
                              <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Joueurs</p>
                              <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a2e;">4 joueurs</p>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                          <tr>
                            <td align="center">
                              <a href="#" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 28px;font-weight:700;font-size:13px;text-decoration:none;border-radius:4px;margin-right:10px;">Voir ma réservation</a>
                              <a href="#" style="display:inline-block;background:#fff;color:#d32f2f;padding:12px 28px;font-weight:700;font-size:13px;text-decoration:none;border-radius:4px;border:1px solid #d32f2f;">Annuler</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      editor.BlockManager.add('golf-handicap', {
        label: blockLabel('📊', 'Handicap'),
        category: categoryGolf,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin:0 auto;max-width:600px;">
                    <tr>
                      <td style="padding:30px;">
                        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a1a2e;">Mise à jour de votre handicap</h2>
                        <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour {{prenom}}, voici votre résumé golf du mois.</p>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="33%" align="center" style="padding:20px 10px;background:#f8f9fa;border-radius:8px;">
                              <p style="margin:0;font-size:36px;font-weight:800;color:#0a84d6;">{{handicap}}</p>
                              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Handicap Index</p>
                            </td>
                            <td width="4%" />
                            <td width="33%" align="center" style="padding:20px 10px;background:#f8f9fa;border-radius:8px;">
                              <p style="margin:0;font-size:36px;font-weight:800;color:#2e7d32;">▲ 1.2</p>
                              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Progression</p>
                            </td>
                            <td width="4%" />
                            <td width="33%" align="center" style="padding:20px 10px;background:#f8f9fa;border-radius:8px;">
                              <p style="margin:0;font-size:36px;font-weight:800;color:#1a1a2e;">8</p>
                              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:700;">Parties jouées</p>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                          <tr><td align="center">
                            <a href="#" style="display:inline-block;background:#0a84d6;color:#fff;padding:12px 28px;font-weight:700;font-size:13px;text-decoration:none;border-radius:4px;">Voir mes statistiques complètes</a>
                          </td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      editor.BlockManager.add('golf-membership', {
        label: blockLabel('🎫', 'Adhésion'),
        category: categoryGolf,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin:0 auto;max-width:600px;">
                    <tr>
                      <td style="padding:0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);">
                          <tr>
                            <td style="padding:28px 30px;">
                              <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;color:#FFE01B;text-transform:uppercase;font-weight:700;">Carte de membre</p>
                              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">{{fullname}}</p>
                              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Membre · Club Pylon Pyx · Depuis 2022</p>
                            </td>
                            <td align="right" style="padding:28px 30px;">
                              <p style="margin:0;font-size:28px;font-weight:800;color:#FFE01B;">HCP {{handicap}}</p>
                            </td>
                          </tr>
                        </table>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#fffbf0;border:1px solid #FFE01B;border-top:none;">
                          <tr>
                            <td style="padding:24px 30px;">
                              <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a1a2e;">⚠️ Votre adhésion expire le 31 décembre 2025</p>
                              <p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.6;">Renouvelez dès maintenant pour continuer à profiter de tous vos avantages membres : accès prioritaire aux réservations, tarifs préférentiels, et participation aux tournois.</p>
                              <a href="#" style="display:inline-block;background:#1a1a2e;color:#FFE01B;padding:13px 32px;font-weight:800;font-size:13px;text-decoration:none;border-radius:4px;">Renouveler mon adhésion</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 5. Two Columns
      bm.add('two-column-layout', {
        label: blockLabel('⬜⬜', '2 Colonnes'),
        category: categoryLayout,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td width="50%" align="left" valign="top" class="gjs-cell" style="padding: 10px 20px;">
                        <img src="https://placehold.co/280x180" width="280" style="width: 100%; height: auto; display: block; margin-bottom: 15px;" />
                        <h3>Column A</h3>
                        <p style="font-size: 14px;">Perfect for side-by-side product features or news highlights.</p>
                      </td>
                      <td width="50%" align="left" valign="top" class="gjs-cell" style="padding: 10px 20px;">
                        <img src="https://placehold.co/280x180" width="280" style="width: 100%; height: auto; display: block; margin-bottom: 15px;" />
                        <h3>Column B</h3>
                        <p style="font-size: 14px;">Responsive columns that stack on mobile for better readability.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 6. Three Columns
      bm.add('three-column-layout', {
        label: blockLabel('▪▪▪', '3 Colonnes'),
        category: categoryLayout,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td width="33.33%" align="center" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x120" width="180" style="width: 100%; height: auto; margin-bottom: 10px;" />
                        <p style="margin: 0; font-size: 12px; font-weight: bold;">Feature 1</p>
                      </td>
                      <td width="33.33%" align="center" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x120" width="180" style="width: 100%; height: auto; margin-bottom: 10px;" />
                        <p style="margin: 0; font-size: 12px; font-weight: bold;">Feature 2</p>
                      </td>
                      <td width="33.33%" align="center" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x120" width="180" style="width: 100%; height: auto; margin-bottom: 10px;" />
                        <p style="margin: 0; font-size: 12px; font-weight: bold;">Feature 3</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 7. Divider
      bm.add('divider-line', {
        label: blockLabel('➖', 'Séparateur'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; border-top: 1px solid #EAEAEA;">
                    <tr><td></td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 8. Quote Block
      bm.add('quote-block', {
        label: blockLabel('💬', 'Citation'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; border-left: 4px solid #0a84d6; background-color: #F8F9FA;">
                    <tr>
                      <td style="padding: 30px; font-family: 'Georgia', serif; font-style: italic; font-size: 18px; line-height: 1.5;">
                        "Insert a powerful quote or testimonial here to build credibility and engage your members."
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 9. Video Block
      bm.add('video-block', {
        label: blockLabel('▶️', 'Vidéo'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; background-color: #000000; text-align: center;">
                    <tr>
                      <td style="padding: 60px 20px; color: #FFFFFF;">
                        <div style="font-size: 48px; margin-bottom: 10px;">▶</div>
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Video Title</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 10. Social Links
      bm.add('social-links', {
        label: blockLabel('🌐', 'Réseaux'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 0 6px;">
                        <a href="#" style="text-decoration:none;" title="Facebook">
                          <table border="0" cellpadding="0" cellspacing="0"><tr><td width="36" height="36" align="center" valign="middle" style="background:#1877F2;border-radius:18px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </td></tr></table>
                        </a>
                      </td>
                      <td style="padding: 0 6px;">
                        <a href="#" style="text-decoration:none;" title="Instagram">
                          <table border="0" cellpadding="0" cellspacing="0"><tr><td width="36" height="36" align="center" valign="middle" style="background:#E1306C;border-radius:18px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          </td></tr></table>
                        </a>
                      </td>
                      <td style="padding: 0 6px;">
                        <a href="#" style="text-decoration:none;" title="X / Twitter">
                          <table border="0" cellpadding="0" cellspacing="0"><tr><td width="36" height="36" align="center" valign="middle" style="background:#000000;border-radius:18px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </td></tr></table>
                        </a>
                      </td>
                      <td style="padding: 0 6px;">
                        <a href="#" style="text-decoration:none;" title="LinkedIn">
                          <table border="0" cellpadding="0" cellspacing="0"><tr><td width="36" height="36" align="center" valign="middle" style="background:#0A66C2;border-radius:18px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          </td></tr></table>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 11. Footer
      bm.add('email-footer', {
        label: blockLabel('📋', 'Pied de page'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper" style="background-color: #F8F9FA;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: center;">
                    <tr>
                      <td style="padding: 40px 20px; font-size: 12px; color: #727272; line-height: 1.5;">
                        <p style="margin: 0 0 10px;">&copy; 2025 Pylon Pyx. All rights reserved.</p>
                        <p style="margin: 0;">
                          <a href="{{unsubscribe_link}}">Unsubscribe</a> | 
                          <a href="{{view_in_browser_link}}">View in Browser</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 12. Product Block
      bm.add('product-block', {
        label: blockLabel('🛍️', 'Produit'),
        category: categoryMarketing,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; border: 1px solid #EAEAEA; overflow: hidden;">
                    <tr>
                      <td align="center">
                        <img src="https://placehold.co/600x400?text=Product+Image" style="width: 100%; height: auto; display: block;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <h3>Product Name</h3>
                        <p style="font-size: 14px;">Detailed description of your amazing product or service.</p>
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary" style="font-size: 13px;">Shop Now</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 13. Survey Block
      bm.add('survey-block', {
        label: blockLabel('📊', 'Sondage'),
        category: categoryMarketing,
        content: `
          <div class="block-wrapper" style="background-color: #F9F9F9;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: center;">
                    <tr>
                      <td style="padding: 40px 20px;">
                        <h2>Step Into the Green</h2>
                        <p style="margin-bottom: 30px;">How would you rate your recent visit?</p>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                  <td style="padding: 10px;"><div style="width: 40px; height: 40px; line-height: 40px; border: 1px solid #0a84d6; color: #0a84d6; font-weight: bold;">1</div></td>
                                  <td style="padding: 10px;"><div style="width: 40px; height: 40px; line-height: 40px; border: 1px solid #0a84d6; color: #0a84d6; font-weight: bold;">2</div></td>
                                  <td style="padding: 10px;"><div style="width: 40px; height: 40px; line-height: 40px; border: 1px solid #0a84d6; color: #0a84d6; font-weight: bold;">3</div></td>
                                  <td style="padding: 10px;"><div style="width: 40px; height: 40px; line-height: 40px; border: 1px solid #0a84d6; color: #0a84d6; font-weight: bold;">4</div></td>
                                  <td style="padding: 10px;"><div style="width: 40px; height: 40px; line-height: 40px; border: 1px solid #0a84d6; color: #0a84d6; font-weight: bold;">5</div></td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 14. Apps Block (Placeholder)
      bm.add('apps-block', {
        label: blockLabel('⚡', 'App'),
        category: categoryMarketing,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; border: 1px dashed #D9D9D9; background-color: #FAFAFA; text-align: center;">
                    <tr>
                      <td style="padding: 20px; color: #727272; font-size: 14px;">
                        <img src="https://placehold.co/24x24?text=+" style="vertical-align: middle; margin-right: 8px;" />
                        Connect an app to show dynamic content.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 15. Hero Overlay
      bm.add('hero-overlay', {
        label: blockLabel('🌟', 'Bannière'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper" style="background-image: url('https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=1200'); background-size: cover; background-position: center; min-height: 300px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="min-height: 300px;">
              <tr>
                <td align="center" valign="middle" style="background-color: rgba(0,0,0,0.5); padding: 50px 20px;">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: center;">
                    <tr>
                      <td>
                        <h1 style="color: #FFFFFF; font-size: 42px; margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">MASTER YOUR GAME</h1>
                        <p style="color: #FFFFFF; font-size: 18px; margin: 20px 0 30px;">Experience premium coaching and world-class facilities at Golf Huub.</p>
                        <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" bgcolor="#0a84d6" style="border-radius: 4px;">
                              <a href="#" style="padding: 15px 30px; color: #FFFFFF; text-decoration: none; font-weight: bold; display: inline-block;">BOOK A SESSION</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 16. Professional Spacer
      bm.add('spacer-block', {
        label: blockLabel('↕️', 'Espace'),
        category: categoryBasic,
        content: `
          <div class="spacer" style="height: 40px; line-height: 40px; font-size: 1px;">&nbsp;</div>
        `
      });

      // 17. 3-Column Image Grid
      bm.add('image-grid-3', {
        label: blockLabel('🖼️🖼️🖼️', 'Galerie'),
        category: categoryLayout,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td width="33.33%" align="center" style="padding: 10px;">
                        <img src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=400" style="max-width: 100%; height: auto; border-radius: 8px;" />
                      </td>
                      <td width="33.33%" align="center" style="padding: 10px;">
                        <img src="https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?auto=format&fit=crop&q=80&w=400" style="max-width: 100%; height: auto; border-radius: 8px;" />
                      </td>
                      <td width="33.33%" align="center" style="padding: 10px;">
                        <img src="https://images.unsplash.com/photo-1623114112815-9988540c1154?auto=format&fit=crop&q=80&w=400" style="max-width: 100%; height: auto; border-radius: 8px;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // 15. Product Recommendations
      bm.add('product-recommendations-block', {
        label: blockLabel('✨', 'Suggestions'),
        category: categoryMarketing,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td width="33.33%" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x180?text=Item+1" width="100%" style="display: block; border-radius: 4px;" />
                        <p style="font-size: 12px; margin: 10px 0 0; text-align: center;">Item 1</p>
                      </td>
                      <td width="33.33%" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x180?text=Item+2" width="100%" style="display: block; border-radius: 4px;" />
                        <p style="font-size: 12px; margin: 10px 0 0; text-align: center;">Item 2</p>
                      </td>
                      <td width="33.33%" valign="top" class="gjs-cell" style="padding: 10px;">
                        <img src="https://placehold.co/180x180?text=Item+3" width="100%" style="display: block; border-radius: 4px;" />
                        <p style="font-size: 12px; margin: 10px 0 0; text-align: center;">Item 3</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `
      });

      // Load existing content — extract CSS first so GrapesJS doesn't lose it
      if (htmlContent && htmlContent.trim().length > 0) {
        try {
          const parsed = new DOMParser().parseFromString(htmlContent, 'text/html');
          const extractedCss = [...parsed.querySelectorAll('style')]
            .map(el => el.textContent).join('\n');
          const bodyHtml = parsed.body ? parsed.body.innerHTML : htmlContent;
          editor.setComponents(bodyHtml);
          if (extractedCss.trim()) editor.setStyle(extractedCss);
        } catch (_) {}
      }

      // Sync changes back to parent — includes global design tokens so emails render correctly
      const syncContent = () => {
        const html = editor.getHtml();
        const css = editor.getCss();
        const combined = `<style>${buildGlobalCss(globalStylesRef.current)}${css}</style>\n${html}`;
        lastSyncedRef.current = combined;
        setHtmlContent(combined);
        onChange?.(combined);
      };

      editor.on('load', () => {
        const doc = editor.Canvas.getDocument();
        if (!doc) return;
        
        // Modern styling (spans instead of font tags)
        try {
          doc.execCommand('styleWithCSS', false, true);
        } catch (e) {}

        const style = document.createElement('style');
        style.innerHTML = `
          /* ── Inline reset (replaces unpkg normalize.css) ── */
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; line-height: 1.5; -webkit-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          a { background-color: transparent; }
          img { border-style: none; max-width: 100%; height: auto; display: block; }
          table { border-collapse: collapse; border-spacing: 0; }
          td, th { padding: 0; }
          h1, h2, h3, h4, h5, h6 { margin-top: 0; }
          p { margin-top: 0; }

          /* ── System-font alias for Inter (no external download) ── */
          @font-face {
            font-family: 'Inter';
            src: local('Inter'), local('-apple-system'), local('BlinkMacSystemFont'), local('Segoe UI'), local('Helvetica Neue');
            font-weight: 100 900;
            font-style: normal;
          }

          @media (max-width: 480px) {
            .gjs-cell {
              width: 100% !important;
              display: block !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            table, .main-table {
              width: 100% !important;
              max-width: 100% !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
            }
          }
          /* --- ROBUST RTE TOOLBAR FIXES --- */
          .gjs-rte-action {
            width: auto !important;
            min-width: 32px;
            padding: 0 4px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            float: none !important;
          }
          .gjs-rte-toolbar {
            display: flex !important;
            flex-wrap: nowrap !important;
            background-color: #3b3f44 !important;
            border-radius: 4px !important;
            padding: 2px !important;
            gap: 2px !important;
          }
          .gjs-rte-custom-select, .rte-color-picker {
            pointer-events: auto !important;
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
            font-size: 11px;
            padding: 2px 4px;
            cursor: pointer;
            outline: none;
            height: 24px;
          }
          /* Ensure clicks on the select only trigger the change, not the button click */
          .gjs-rte-action select, .gjs-rte-action input {
            position: relative;
            z-index: 10;
          }
        `;
        doc.head.appendChild(style);

        // --- Load Recent Media Assets from Backend ---
        const fetchAssets = async () => {
          try {
            const res = await axios.get('/templates/media/recent');
            if (res.data && Array.isArray(res.data)) {
              const assets = res.data.map(f => f.url);
              editor.AssetManager.add(assets);
            }
          } catch (err) {
            // asset load failed silently
          }
        };
        fetchAssets();

        // Always inject global design tokens so .btn-primary / .main-container work
        const globalVarStyle = doc.createElement('style');
        globalVarStyle.id = 'global-vars';
        globalVarStyle.innerHTML = buildGlobalCss(globalStylesRef.current);
        doc.head.appendChild(globalVarStyle);
      });

      // Track whether canvas has content
      const checkEmpty = () => {
        const html = editor.getHtml();
        setCanvasEmpty(!html || html.trim().replace(/<[^>]*>/g, '').trim().length < 5);
      };
      editor.on('component:add', () => { syncContent(); checkEmpty(); });
      editor.on('component:remove', () => { syncContent(); checkEmpty(); });
      editor.on('component:update', syncContent);
      editor.on('block:drag:stop', () => { syncContent(); checkEmpty(); });
      editor.on('style:update', syncContent);
      editor.on('load', checkEmpty);

      // Asset upload: parse our API response { success, url } and register the asset
      editor.on('asset:upload:response', (response) => {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        if (data && data.url) {
          editor.AssetManager.add(data.url);
        }
      });

      // Asset upload: report error via toast
      editor.on('asset:upload:error', () => {
        toast.error("Échec de l'upload. Vérifiez la taille (max 10 Mo) et que le fichier est une image, PDF ou vidéo.");
      });

      // Update Breadcrumbs on selection
      editor.on('component:selected', (model) => {
        setSidebarTab('styles');
        let path = [];
        let curr = model;
        while(curr && curr.get('tagName') !== 'body') {
          path.unshift({ 
            id: curr.cid, 
            label: curr.getName() || curr.get('tagName'),
            model: curr 
          });
          curr = curr.parent();
        }
        setSelectedPath(path);
      });

      // Clear Breadcrumbs on deselect — return to Blocks panel
      editor.on('component:deselected', () => {
        setSelectedPath([]);
        setSidebarTab('add');
      });

      // RTF Customization (Word/Outlook Style) - CLEAN & STABLE VERSION
      const rte = editor.RichTextEditor;
      
      // 1. Remove ALL existing actions to start fresh (prevents duplicates)
      const existingActions = ['bold', 'italic', 'underline', 'strikethrough', 'link', 'fontSize', 'fontName', 'fontFamily', 'foreColor', 'hiliteColor', 'alignLeft', 'alignCenter', 'alignRight', 'orderedList', 'unorderedList', 'mergeTags'];
      existingActions.forEach(name => {
        try { rte.remove(name); } catch(e) {}
      });

      // 2. Add Custom Actions in Order
      
      // Font Size
      rte.add('fontSize', {
        icon: `
          <select class="gjs-rte-custom-select" style="width: 60px;" onchange="this.dispatchEvent(new Event('rte-sync'))">
            <option value="1">Small</option>
            <option value="3" selected>Normal</option>
            <option value="5">Large</option>
            <option value="7">Huge</option>
          </select>`,
        event: 'change',
        result: (rte, action) => {
          const select = action.btn.querySelector('select');
          if (select) rte.exec('fontSize', select.value);
        }
      });

      // Font Family
      rte.add('fontName', {
        icon: `
          <select class="gjs-rte-custom-select" style="width: 70px;" onchange="this.dispatchEvent(new Event('rte-sync'))">
            <option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
            <option value="'Times New Roman', serif">Times NR</option>
            <option value="'Courier New', monospace">Courier</option>
          </select>`,
        event: 'change',
        result: (rte, action) => {
          const select = action.btn.querySelector('select');
          if (select) rte.exec('fontName', select.value);
        }
      });

      // Text Color
      rte.add('foreColor', {
        icon: '<input type="color" class="rte-color-picker" style="width:20px; height:20px; border:none; padding:0; background:none; cursor:pointer;" value="#241C15">',
        event: 'input',
        result: (rte, action) => {
          const input = action.btn.querySelector('input');
          if (input) rte.exec('foreColor', input.value);
        }
      });

      // Basic Styling
      rte.add('bold', {
        icon: '<b style="font-size:13px;font-family:Georgia,serif;">B</b>',
        attributes: { title: 'Gras (Ctrl+B)' },
        result: rte => rte.exec('bold'),
      });

      rte.add('italic', {
        icon: '<i style="font-size:13px;font-family:Georgia,serif;">I</i>',
        attributes: { title: 'Italique (Ctrl+I)' },
        result: rte => rte.exec('italic'),
      });

      rte.add('underline', {
        icon: '<u style="font-size:13px;font-family:Georgia,serif;font-weight:700;">U</u>',
        attributes: { title: 'Souligner (Ctrl+U)' },
        result: rte => rte.exec('underline'),
      });

      rte.add('strikethrough', {
        icon: '<s style="font-size:13px;font-family:Georgia,serif;">S</s>',
        attributes: { title: 'Barrer' },
        result: rte => rte.exec('strikeThrough'),
      });

      // Alignment
      rte.add('alignLeft', {
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3zm0 4h18v2H3z"/></svg>',
        attributes: { title: 'Aligner à gauche' },
        result: rte => rte.exec('justifyLeft'),
      });

      rte.add('alignCenter', {
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3zm3 4h12v2H6zm-3 4h18v2H3zm3 4h12v2H6zm-3 4h18v2H3z"/></svg>',
        attributes: { title: 'Centrer' },
        result: rte => rte.exec('justifyCenter'),
      });

      rte.add('alignRight', {
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9zm-6 4h18v2H3z"/></svg>',
        attributes: { title: 'Aligner à droite' },
        result: rte => rte.exec('justifyRight'),
      });

      rte.add('orderedList', {
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-7v2h14V4H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>',
        attributes: { title: 'Liste numérotée' },
        result: rte => rte.exec('insertOrderedList'),
      });

      rte.add('unorderedList', {
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>',
        attributes: { title: 'Liste à puces' },
        result: rte => rte.exec('insertUnorderedList'),
      });

      // Link
      rte.add('link', {
        icon: '🔗',
        attributes: { title: 'Link' },
        result: (rte) => {
          requestLink('link', (url) => { if (url) rte.exec('createLink', url); });
        },
      });

      // Merge Tags Dropdown in RTE
      rte.add('mergeTags', {
        icon: `<select class="gjs-rte-custom-select" style="width: 90px;" onchange="this.dispatchEvent(new Event('rte-sync'))">
          <option value="">Merge Tag</option>
          <option value="{{prenom}}">Prénom</option>
          <option value="{{nom}}">Nom</option>
          <option value="{{fullname}}">Full Name</option>
          <option value="{{email}}">Email</option>
          <option value="{{ville}}">Ville</option>
          <option value="{{nationalite}}">Nationalité</option>
          <option value="{{sexe}}">Sexe</option>
          <option value="{{handicap}}">Handicap</option>
          <option value="{{type_client}}">Type Client</option>
          <option value="{{unsubscribe_link}}">Unsubscribe</option>
        </select>`,
        event: 'change',
        result: (rte, action) => {
          const select = action.btn.querySelector('select');
          if (select && select.value) {
            rte.insertHTML(select.value);
            select.value = ""; // Reset for next use
          }
        }
      });

      // Countdown timer block
      editor.BlockManager.add('countdown-timer', {
        label: 'Compte à rebours',
        category: 'Interactif',
        content: `<div style="text-align:center;padding:24px 16px;font-family:Arial,sans-serif;">
  <p style="margin:0 0 12px 0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:2px;">L'offre se termine dans</p>
  <table width="auto" cellpadding="0" cellspacing="0" style="display:inline-table;border-collapse:separate;border-spacing:10px 0;">
    <tr>
      <td style="background:#1a1a2e;color:#ffffff;border-radius:8px;padding:14px 18px;text-align:center;min-width:56px;">
        <div style="font-size:34px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;">02</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-top:5px;">Jours</div>
      </td>
      <td style="font-size:26px;font-weight:800;color:#1a1a2e;vertical-align:middle;padding-bottom:8px;">:</td>
      <td style="background:#1a1a2e;color:#ffffff;border-radius:8px;padding:14px 18px;text-align:center;min-width:56px;">
        <div style="font-size:34px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;">18</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-top:5px;">Heures</div>
      </td>
      <td style="font-size:26px;font-weight:800;color:#1a1a2e;vertical-align:middle;padding-bottom:8px;">:</td>
      <td style="background:#1a1a2e;color:#ffffff;border-radius:8px;padding:14px 18px;text-align:center;min-width:56px;">
        <div style="font-size:34px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;">45</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-top:5px;">Minutes</div>
      </td>
      <td style="font-size:26px;font-weight:800;color:#1a1a2e;vertical-align:middle;padding-bottom:8px;">:</td>
      <td style="background:#1a1a2e;color:#ffffff;border-radius:8px;padding:14px 18px;text-align:center;min-width:56px;">
        <div style="font-size:34px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;">00</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-top:5px;">Secondes</div>
      </td>
    </tr>
  </table>
</div>`,
      });

      gjsEditorRef.current = editor;
      setGjsReady(true);
      fetchSavedBlocks(editor);
    }
    return () => {
      if (gjsEditorRef.current) {
        try { gjsEditorRef.current.destroy(); } catch (_) {}
        gjsEditorRef.current = null;
      }
    };
  }, []); // Only on mount

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && fullscreen) setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Sync content TO GrapesJS when prop value changes — skip if value originated from GrapesJS itself
  useEffect(() => {
    if (!gjsEditorRef.current || !gjsReady) return;
    if (value === lastSyncedRef.current) return;
    if (!value || value.length === 0) return;
    try {
      gjsEditorRef.current.setComponents(value);
    } catch (_) {}
  }, [value, gjsReady]);

  // Sync HTML → plain text when the user switches to the text tab
  useEffect(() => {
    if (activeTab !== 1) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    setTextContent(text);
    onTextChange?.(text);
  }, [activeTab]); // eslint-disable-line

  // Sync content TO GrapesJS when switching to Builder tab
  useEffect(() => {
    if (activeTab === 3 && gjsEditorRef.current) {
      const editor = gjsEditorRef.current;
      const gjsContent = editor.getHtml();
      if (htmlContent && gjsContent !== htmlContent && htmlContent.length > 0) {
        try {
          editor.setComponents(htmlContent);
        } catch (e) {
          // sync failed silently
        }
      }
    }
  }, [activeTab]);


  // React to Global Style changes
  useEffect(() => {
    globalStylesRef.current = globalStyles;
    if (gjsEditorRef.current && gjsReady) {
      const editor = gjsEditorRef.current;
      const canvas = editor.Canvas;
      if (!canvas) return;
      const doc = canvas.getDocument();
      if (!doc) return;

      const body = editor.getWrapper();
      if (body) {
        body.addStyle({
          'background-color': globalStyles.bodyBg,
          'font-family': globalStyles.fontFamily,
          'color': globalStyles.bodyColor,
          'line-height': globalStyles.lineHeight
        });
      }

      const styleEl = doc.getElementById('global-vars') || doc.createElement('style');
      styleEl.id = 'global-vars';
      styleEl.innerHTML = buildGlobalCss(globalStyles);
      if (!doc.getElementById('global-vars')) doc.head.appendChild(styleEl);
    }
  }, [globalStyles, gjsReady]);

  const handleHtmlChange = (newContent) => {
    setHtmlContent(newContent);
    onChange?.(newContent);
  };

  const handleTextChange = (newContent) => {
    setTextContent(newContent);
    onTextChange?.(newContent);
    // Convertir le texte en HTML basique
    const htmlContent = newContent
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('');
    setHtmlContent(htmlContent);
    onChange?.(htmlContent);
  };


  const insertTag = (tag) => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      switch (tag) {
        case 'bold':
          quill.format('bold', true);
          break;
        case 'italic':
          quill.format('italic', true);
          break;
        case 'underline':
          quill.format('underline', true);
          break;
        case 'link': {
          requestLink('link', (url) => { if (url) quill.format('link', url); });
          break;
        }
        case 'image': {
          const idx = range.index;
          requestLink('image', (url) => { if (url) quill.insertEmbed(idx, 'image', url, 'user'); });
          break;
        }
        case 'table': {
          const html = `
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Colonne 1</th>
      <th>Colonne 2</th>
      <th>Colonne 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Donnée 1</td>
      <td>Donnée 2</td>
      <td>Donnée 3</td>
    </tr>
  </tbody>
</table>`;
          quill.clipboard.dangerouslyPasteHTML(range.index, html);
          break;
        }
        case 'list':
          quill.format('list', 'bullet');
          break;
        case 'numbered-list':
          quill.format('list', 'ordered');
          break;
        default:
          break;
      }
      return;
    }
    // Fallback textarea editing (rarely used now)
    const textarea = document.getElementById('html-editor');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = htmlContent.substring(start, end);
      let replacement = selectedText;
      if (tag === 'bold') replacement = `<strong>${selectedText}</strong>`;
      if (tag === 'italic') replacement = `<em>${selectedText}</em>`;
      if (tag === 'underline') replacement = `<u>${selectedText}</u>`;
      if (tag === 'list') replacement = `<ul>\n  <li>${selectedText || 'Élément de liste'}</li>\n</ul>`;
      if (tag === 'numbered-list') replacement = `<ol>\n  <li>${selectedText || 'Élément de liste'}</li>\n</ol>`;
      const newContent = htmlContent.substring(0, start) + replacement + htmlContent.substring(end);
      handleHtmlChange(newContent);
    }
  };

  const insertVariable = (variable) => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      quill.insertText(range.index, variable, 'user');
      quill.setSelection(range.index + variable.length, 0);
      return;
    }
    const textarea = document.getElementById('html-editor');
    if (textarea) {
      const start = textarea.selectionStart;
      const newContent = htmlContent.substring(0, start) + variable + htmlContent.substring(start);
      handleHtmlChange(newContent);
    }
  };

  const toolbarButtons = [
    { icon: <BoldIcon />, tooltip: 'Gras', action: () => insertTag('bold') },
    { icon: <ItalicIcon />, tooltip: 'Italique', action: () => insertTag('italic') },
    { icon: <UnderlineIcon />, tooltip: 'Souligné', action: () => insertTag('underline') },
    { icon: <LinkIcon />, tooltip: 'Lien', action: () => insertTag('link') },
    { icon: <ImageIcon />, tooltip: 'Image (uploader)', action: () => { imageInputRef.current?.click(); } },
    { icon: <TableIcon />, tooltip: 'Tableau', action: () => insertTag('table') },
    { icon: <ListIcon />, tooltip: 'Liste à puces', action: () => insertTag('list') },
    { icon: <NumberedListIcon />, tooltip: 'Liste numérotée', action: () => insertTag('numbered-list') }
  ];

  const variables = [
    { label: 'Prénom',             value: '{{prenom}}',             desc: 'Prénom du destinataire — ex : Marie' },
    { label: 'Nom',                value: '{{nom}}',                desc: 'Nom de famille — ex : Dupont' },
    { label: 'Nom complet',        value: '{{fullname}}',           desc: 'Prénom + nom — ex : Marie Dupont' },
    { label: 'Adresse email',      value: '{{email}}',              desc: 'Adresse email du destinataire' },
    { label: 'Ville',              value: '{{ville}}',              desc: 'Ville de résidence — ex : Paris' },
    { label: 'Nationalité',        value: '{{nationalite}}',        desc: 'Nationalité du membre' },
    { label: 'Sexe',               value: '{{sexe}}',               desc: 'Genre du membre (M / F)' },
    { label: 'Handicap',           value: '{{handicap}}',           desc: 'Index de handicap golf — ex : 12.4' },
    { label: 'Type de membre',     value: '{{type_client}}',        desc: 'Catégorie d\'abonnement — ex : Premium' },
    { label: 'Désabonnement',      value: '{{unsubscribe_link}}',   desc: 'URL obligatoire de désabonnement (légal)' },
    { label: 'Pixel de suivi',     value: '{{tracking_pixel}}',     desc: 'Pixel invisible pour mesurer les ouvertures' },
    { label: 'Voir en ligne',      value: '{{view_in_browser_link}}', desc: 'Lien "Voir dans le navigateur"' },
  ];

  // Helper to get freshest content (uses Builder content if active)
  const getCurrentContent = () => {
    try {
      if (activeTab === 3 && gjsEditorRef.current) {
        const editor = gjsEditorRef.current;
        const html = editor.getHtml();
        const css = editor.getCss();
        return `${html}\n<style>${css}</style>`;
        }
    } catch (_) {}
    return htmlContent;
  };

  const addPrebuilt = (type) => {
    if (!gjsEditorRef.current) return;
    const editor = gjsEditorRef.current;
    switch(type) {
      case 'marketing-1-2':
        editor.addComponents(`
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto;">
                    <tr>
                      <td width="33.33%" align="left" valign="top" class="gjs-cell" style="padding: 20px;">
                        <img src="https://placehold.co/180x180" style="width: 100%; height: auto; display: block;" />
                      </td>
                      <td width="66.66%" align="left" valign="top" class="gjs-cell" style="padding: 20px;">
                        <h2>Highlight Section</h2>
                        <p>Perfect for detailed feature highlights or news updates. This prebuilt section automatically adapts to your global design settings.</p>
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary">Learn More</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      case 'text-image':
        editor.addComponents(`
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; text-align: center;">
                    <tr>
                      <td style="padding: 20px;">
                        <h1>Premium Experience</h1>
                        <img src="https://placehold.co/600x250?text=Campaign+Visual" style="width: 100%; height: auto; display: block; margin: 20px 0;" />
                        <p>Deliver your message with high-impact visuals and optimized typography. This layout is designed for maximum conversion.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      case 'event-banner':
        editor.addComponents(`
          <div class="block-wrapper" style="background-color: #1a1a2e;" bgcolor="#1a1a2e">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1a1a2e">
              <tr>
                <td align="center" style="background-color: #1a1a2e;" bgcolor="#1a1a2e">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; border: 1px solid #0a84d6;">
                    <tr>
                      <td align="center" style="padding: 30px;">
                        <h2 style="color: #0a84d6; text-transform: uppercase;">Upcoming Event</h2>
                        <div style="margin: 20px 0; color: #FFFFFF;">
                          <p style="font-size: 24px; font-weight: bold; margin: 0;">Sunday Masters Classic</p>
                          <p style="font-size: 16px; margin: 10px 0 0;">March 28, 2025 • 8:00 AM</p>
                        </div>
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary">REGISTER NOW</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      case 'theme-welcome': {
        const hasContent = editor.getHtml().replace(/<[^>]*>/g, '').trim().length > 0;
        // eslint-disable-next-line no-alert
        if (hasContent && !window.confirm('Ce thème remplacera tout le contenu actuel. Continuer ?')) return;
        editor.setComponents(`
          <div class="block-wrapper" style="background-color: #F8F9FB;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <img src="https://placehold.co/150x50?text=LOGO" style="max-height: 50px; margin-bottom: 30px;" />
                  <table border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" class="main-container" style="margin: 0 auto; border-radius: 8px; border: 1px solid #EAEAEA; overflow: hidden;">
                    <tr>
                      <td align="center" style="padding: 40px;">
                        <h1>Welcome to the Club!</h1>
                        <p style="color: #727272; margin-bottom: 30px;">We're thrilled to have you with us. Explore your new benefits and get ready for an amazing season on the green.</p>
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary" style="font-size: 15px;">GET STARTED</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <p style="margin-top: 30px; font-size: 12px; color: #AAAAAA;">
                    &copy; 2025 Golf Huub | <a href="{{unsubscribe_link}}" style="color: #AAAAAA;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      }
      case 'theme-sale': {
        const hasContent2 = editor.getHtml().replace(/<[^>]*>/g, '').trim().length > 0;
        // eslint-disable-next-line no-alert
        if (hasContent2 && !window.confirm('Ce thème remplacera tout le contenu actuel. Continuer ?')) return;
        editor.setComponents(`
          <div class="block-wrapper" style="background-color: #1a1a2e;" bgcolor="#1a1a2e">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1a1a2e">
              <tr>
                <td align="center" style="padding: 60px 0; background-color: #1a1a2e;" bgcolor="#1a1a2e">
                  <table border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" class="main-container" style="margin: 0 auto; border: 4px solid #0a84d6;">
                    <tr>
                      <td align="center" style="padding: 40px;">
                        <h1 style="color: #0a84d6; text-transform: uppercase; font-style: italic;">FLASH SALE</h1>
                        <div style="height: 2px; width: 60px; background-color: #0a84d6; margin: 20px 0;"></div>
                        <h2>UP TO 50% OFF</h2>
                        <p style="margin-bottom: 30px;">This weekend only! Get exclusive discounts on all membership tiers and pro-shop equipment.</p>
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="#" class="btn-primary" style="padding: 15px 40px; font-size: 16px;">SHOP NOW</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      }
      case 'theme-event': {
        const hasContent3 = editor.getHtml().replace(/<[^>]*>/g, '').trim().length > 0;
        // eslint-disable-next-line no-alert
        if (hasContent3 && !window.confirm('Ce thème remplacera tout le contenu actuel. Continuer ?')) return;
        editor.setComponents(`
          <div class="block-wrapper" style="background-color: #f4f6f8;" bgcolor="#f4f6f8">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f6f8">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table border="0" cellspacing="0" cellpadding="0" class="main-container" style="margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <tr>
                      <td>
                        <img src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=1200" style="width: 100%; height: auto; display: block;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px; text-align: center;">
                        <div style="text-transform: uppercase; color: #0a84d6; font-weight: bold; letter-spacing: 2px; margin-bottom: 15px;">Invitation Exclusive</div>
                        <h1 style="margin: 0 0 20px;">The President's Cup 2025</h1>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">Join us for the most prestigious event of the year. Experience a day of competitive play followed by a gala dinner at the clubhouse.</p>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; background-color: #f9f9f9; border-radius: 8px;">
                          <tr>
                            <td width="50%" style="padding: 20px; border-right: 1px solid #eee;">
                              <div style="font-size: 12px; color: #999; text-transform: uppercase;">Date</div>
                              <div style="font-weight: bold; font-size: 16px;">May 15, 2025</div>
                            </td>
                            <td width="50%" style="padding: 20px;">
                              <div style="font-size: 12px; color: #999; text-transform: uppercase;">Location</div>
                              <div style="font-weight: bold; font-size: 16px;">Main Course</div>
                            </td>
                          </tr>
                        </table>

                        <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" bgcolor="#0a84d6" style="border-radius: 4px;">
                              <a href="#" style="padding: 18px 40px; color: #FFFFFF; text-decoration: none; font-weight: bold; display: inline-block;">CONFIRM ATTENDANCE</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <p style="margin-top: 30px; font-size: 12px; color: #AAAAAA; text-align: center;">
                    &copy; 2025 Golf Huub | <a href="{{unsubscribe_link}}" style="color: #AAAAAA;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `);
        break;
      }
      default: break;
    }
  };

  const selectGlobal = () => {
    if (!gjsEditorRef.current) return;
    const editor = gjsEditorRef.current;
    
    // Select the Body/Wrapper to show global styles
    const wrapper = editor.getWrapper();
    editor.select(wrapper);
    
    // Switch to styles tab
    setSidebarTab('styles');
    
    // Open the sectors we want to show
    const sm = editor.StyleManager;
    sm.getSectors().forEach(sector => {
      if (['Dimension', 'Typography', 'Decorations'].includes(sector.get('name'))) {
        sector.set('open', true);
      }
    });
  };

  // Load external template into GrapesJS when templateHtml prop changes
  useEffect(() => {
    if (!templateHtml || !gjsEditorRef.current || !gjsReady) return;
    try {
      const parsed = new DOMParser().parseFromString(templateHtml, 'text/html');
      const css = [...parsed.querySelectorAll('style')].map(el => el.textContent).join('\n');
      const body = parsed.body ? parsed.body.innerHTML : templateHtml;
      gjsEditorRef.current.setComponents(body);
      if (css.trim()) gjsEditorRef.current.setStyle(css);
      // Re-inject global-vars after setStyle reset
      const canvasDoc = gjsEditorRef.current.Canvas.getDocument();
      if (canvasDoc) {
        let gv = canvasDoc.getElementById('global-vars');
        if (!gv) { gv = canvasDoc.createElement('style'); gv.id = 'global-vars'; canvasDoc.head.appendChild(gv); }
        gv.innerHTML = buildGlobalCss(globalStylesRef.current);
      }
    } catch (_) {}
    setHtmlContent(templateHtml);
    if (onChange) onChange(templateHtml);
    if (onTemplateLoaded) onTemplateLoaded();
  }, [templateHtml, gjsReady]); // eslint-disable-line

  const requestLink = (mode, callback) => {
    linkCallbackRef.current = callback;
    setLinkDialog({ open: true, url: 'https://', mode });
  };

  const fetchSavedBlocks = async (editor) => {
    try {
      const res = await axios.get('/templates/blocks');
      const blocks = Array.isArray(res.data) ? res.data : [];
      const bm = editor.BlockManager;
      blocks.forEach(b => {
        if (!bm.get(`saved-${b.id}`)) {
          bm.add(`saved-${b.id}`, {
            label: b.nom,
            category: 'Mes blocs',
            content: b.html,
            attributes: { class: 'fa fa-cube' },
          });
        }
      });
    } catch { /* silencieux */ }
  };

  const saveSelectedBlock = async (nom) => {
    const editor = gjsEditorRef.current;
    if (!editor) return;
    const selected = editor.getSelected();
    if (!selected) return;
    const html = editor.getHtml({ component: selected });
    try {
      const res = await axios.post('/templates/blocks', { nom, html });
      const b = res.data;
      editor.BlockManager.add(`saved-${b.id}`, {
        label: b.nom,
        category: 'Mes blocs',
        content: b.html,
        attributes: { class: 'fa fa-cube' },
      });
      toast.success(`Bloc "${nom}" sauvegardé`);
    } catch { toast.error('Erreur sauvegarde du bloc'); }
  };

  const runAudit = async () => {
    if (!gjsEditorRef.current) return;
    const editor = gjsEditorRef.current;
    const html = editor.getHtml();
    const results = [];

    // Filter out informational success messages from count, but keep for UI pride.
    const isError = (r) => r.type === 'error' || r.type === 'warning';

    // 1. Check for unsubscribe link
    if (!html.includes('{{unsubscribe_link}}')) {
      results.push({
        type: 'error',
        message: 'Missing Unsubscribe Link',
        detail: 'Legal requirement: All marketing emails must include a way for recipients to opt-out.'
      });
    }

    // 2. Check for placeholder links
    const placeholderLinks = (html.match(/href="#"/g) || []).length;
    if (placeholderLinks > 0) {
      results.push({
        type: 'warning',
        message: `${placeholderLinks} Placeholder Link(s)`,
        detail: 'Some links still point to "#". Make sure to update them with real URLs.'
      });
    }

    // 3. Check for placeholder images
    if (html.includes('placehold.co')) {
      results.push({
        type: 'warning',
        message: 'Placeholder Images Detected',
        detail: 'You are still using placeholder images. Replace them for a professional look.'
      });
    }

    // 5. Content length check
    const textOnly = html.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length < 50) {
      results.push({
        type: 'warning',
        message: 'Content is very short',
        detail: 'Short emails might be flagged as spam or provide little value to users.'
      });
    }

    // 6. Check for base64 images (CRITICAL for deliverability)
    if (html.includes('data:image/')) {
      results.push({
        type: 'error',
        message: 'Inlined (Base64) Images Detected',
        detail: 'One or more images are embedded directly as large text data (10MB+). Most email providers (Outlook, Gmail) will block or clip these emails. Please use the "Upload" feature or the Image button to insert them properly as links.'
      });
    }

    // 7. Text-to-Image Ratio (Gmail Spam Check)
    const textLength = html.replace(/<[^>]*>/g, '').trim().length;
    const imageCount = (html.match(/<img/g) || []).length;
    if (imageCount > 0 && textLength < 150) {
      results.push({
        type: 'warning',
        message: 'Spam Risk: High Image-to-Text Ratio',
        detail: 'Marketing emails with images but very little text (under 150 chars) are higher risk for Gmail spam filters. Try adding a few more sentences of descriptive text.'
      });
    }

    // 8. Accessibility: images without alt attribute
    const imgTagsNoAlt = (html.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi) || []).length;
    if (imgTagsNoAlt > 0) {
      results.push({
        type: 'warning',
        message: `Accessibilité : ${imgTagsNoAlt} image(s) sans attribut alt`,
        detail: 'Les lecteurs d\'écran ne peuvent pas décrire les images sans attribut alt. Ajoutez alt="" (décoratif) ou une description pour chaque image.'
      });
    }

    // 9. Accessibility: links with no text content
    const emptyLinks = (html.match(/<a[^>]*>\s*<\/a>/gi) || []).length;
    if (emptyLinks > 0) {
      results.push({
        type: 'warning',
        message: `Accessibilité : ${emptyLinks} lien(s) sans texte`,
        detail: 'Les liens vides ne sont pas cliquables par les utilisateurs de lecteurs d\'écran. Ajoutez un texte descriptif ou supprimez ces balises.'
      });
    }

    // 10. Detect inline style color contrast issues (white text on white/light bg)
    const whiteOnWhite = /<[^>]+style="[^"]*color\s*:\s*(white|#fff|#ffffff)[^"]*background[^"]*:\s*(white|#fff|#ffffff)[^"]*"[^>]*>/i.test(html)
      || /<[^>]+style="[^"]*background[^"]*:\s*(white|#fff|#ffffff)[^"]*color\s*:\s*(white|#fff|#ffffff)[^"]*"[^>]*>/i.test(html);
    if (whiteOnWhite) {
      results.push({
        type: 'error',
        message: 'Contraste insuffisant détecté',
        detail: 'Texte blanc sur fond blanc détecté. Ce contenu sera invisible pour certains destinataires et peut déclencher les filtres anti-spam.'
      });
    }

    // 11. Link checker — validate real URLs (max 20)
    const hrefMatches = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)];
    const realUrls = [...new Set(hrefMatches.map(m => m[1]).filter(u => !u.includes('{{') && !u.includes('unsubscribe') && !u.includes('tracking')))].slice(0, 20);
    if (realUrls.length > 0) {
      try {
        const res = await axios.post('/campagnes/check-links', { urls: realUrls });
        const broken = (res.data?.results || []).filter(r => !r.ok);
        if (broken.length > 0) {
          results.push({
            type: 'error',
            message: `${broken.length} lien(s) inaccessible(s)`,
            detail: `URLs en erreur : ${broken.slice(0, 3).map(r => r.url.slice(0, 50) + (r.url.length > 50 ? '…' : '')).join(', ')}`
          });
        }
      } catch { /* réseau indisponible — skip silencieux */ }
    }

    if (results.length === 0) {
      results.push({
        type: 'success',
        message: 'Looking Great!',
        detail: 'No major issues found. Your email is optimized for delivery.'
      });
    }

    setAuditResults(results);
  };

  return (
    <Box sx={{ border: '1px solid #D9D9D9', bgcolor: '#FFFFFF' }}>
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post('/templates/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const url = res.data?.url;
            if (url && gjsEditorRef.current) {
              const editor = gjsEditorRef.current;
              editor.addComponents(`
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 10px;">
                      <img src="${url}" style="max-width:100%; height:auto; display: block;" />
                    </td>
                  </tr>
                </table>
              `);
            }
          } catch (err) {
            toast.error("Échec de l'upload image.");
          } finally {
            e.target.value = '';
          }
        }}
      />

      {/* Builder Toolbar — Mailchimp-style */}
      <Box sx={{ 
        px: 2, py: 0, 
        borderBottom: '1px solid #e0e0e0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        bgcolor: '#1a1a2e',
        minHeight: 66
      }}>
        {/* Left: Mode Tabs */}
        <Box display="flex" gap={0}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            sx={{
              minHeight: 66,
              '& .MuiTab-root': {
                minHeight: 66,
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                '&.Mui-selected': { color: '#fff' }
              },
              '& .MuiTabs-indicator': { backgroundColor: '#0a84d6', height: 3 }
            }}
          >
            <Tab label="Designer" value={3} />
            <Tab label="HTML Code" value={0} />
            <Tab label="Plain Text" value={1} />
          </Tabs>
        </Box>
        
        {/* Right: Controls — 3 grouped sections with labels */}
        <Box display="flex" gap={0.5} alignItems="center">

          {/* ── Groupe : Historique ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
            <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1.5, px: 0.5, py: 0.25, gap: 0 }}>
              <Tooltip title="Undo (Ctrl+Z)">
                <IconButton
                  onClick={() => gjsEditorRef.current?.UndoManager.undo()}
                  size="small"
                  sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <UndoIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Redo">
                <IconButton
                  onClick={() => gjsEditorRef.current?.UndoManager.redo()}
                  size="small"
                  sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <RedoIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Historique</Typography>
          </Box>

          <Box sx={{ width: 1, height: 20, bgcolor: 'rgba(255,255,255,0.15)', mx: 0.75 }} />

          {/* ── Groupe : Vue ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
            <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 0.5, gap: 0.5 }}>
              <Tooltip title="Vue Desktop">
                <IconButton
                  size="small"
                  onClick={() => { setBuilderDevice('Desktop'); gjsEditorRef.current?.setDevice('Desktop'); }}
                  sx={{
                    borderRadius: 1.5, px: 1.5, py: 0.5,
                    color: builderDevice === 'Desktop' ? '#1a1a2e' : 'rgba(255,255,255,0.6)',
                    bgcolor: builderDevice === 'Desktop' ? '#fff' : 'transparent',
                    '&:hover': { bgcolor: builderDevice === 'Desktop' ? '#fff' : 'rgba(255,255,255,0.15)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <DesktopIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vue Mobile">
                <IconButton
                  size="small"
                  onClick={() => { setBuilderDevice('Mobile'); gjsEditorRef.current?.setDevice('Mobile'); }}
                  sx={{
                    borderRadius: 1.5, px: 1.5, py: 0.5,
                    color: builderDevice === 'Mobile' ? '#1a1a2e' : 'rgba(255,255,255,0.6)',
                    bgcolor: builderDevice === 'Mobile' ? '#fff' : 'transparent',
                    '&:hover': { bgcolor: builderDevice === 'Mobile' ? '#fff' : 'rgba(255,255,255,0.15)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <MobileIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Vue</Typography>
          </Box>

          <Box sx={{ width: 1, height: 20, bgcolor: 'rgba(255,255,255,0.15)', mx: 0.75 }} />

          {/* ── Groupe : Outils ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
            <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1.5, px: 0.5, py: 0.25, gap: 0 }}>
              <Tooltip title="Importer du HTML">
                <IconButton
                  size="small"
                  onClick={() => setImportHtmlDialog({ open: true, html: htmlContent })}
                  sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <CodeIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}>
                <IconButton
                  size="small"
                  onClick={() => setFullscreen(f => !f)}
                  sx={{ color: fullscreen ? '#FFE01B' : 'rgba(255,255,255,0.7)', '&:hover': { color: '#FFE01B', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    {fullscreen
                      ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                      : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>}
                  </svg>
                </IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1 }}>Outils</Typography>
          </Box>

        </Box>
      </Box>

      {/* Tab Contents */}
      <Box sx={{ display: activeTab === 3 ? 'flex' : 'none', flexDirection: 'column', ...(fullscreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1400, bgcolor: '#fff' } : {}) }}>
        {fullscreen && (
          <Box sx={{ px: 2, py: 0.5, bgcolor: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 1, minHeight: 44, borderBottom: '1px solid #333' }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, flex: 1 }}>Designer — Plein écran</Typography>
            <Tooltip title="Quitter le plein écran (Échap)">
              <IconButton size="small" onClick={() => setFullscreen(false)} sx={{ color: '#FFE01B', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box display="flex" sx={{ height: fullscreen ? 'calc(100vh - 44px)' : canvasHeight, borderTop: '1px solid #D9D9D9', width: '100%', flex: 1 }}>
          {/* Vertical Icon Bar — labeled tabs */}
          <Box
            sx={{
              width: '72px',
              borderRight: '1px solid #D9D9D9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 1,
              pb: 2,
              bgcolor: '#FAFAFA',
              gap: 0
            }}
          >
            {[
              { id: 'add', icon: <AddIcon sx={{ fontSize: 22 }} />, label: 'Blocs' },
              { id: 'templates', icon: <LayersIcon sx={{ fontSize: 22 }} />, label: 'Modèles' },
              { id: 'styles', icon: <StyleIcon sx={{ fontSize: 22 }} />, label: 'Design' },
              {
                id: 'optimize',
                icon: (
                  <Badge
                    badgeContent={auditResults.filter(r => r.type === 'error' || r.type === 'warning').length || null}
                    color="error"
                    sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: 15, minWidth: 15 } }}
                  >
                    <OptimizeIcon sx={{ fontSize: 22 }} />
                  </Badge>
                ),
                label: 'Audit'
              }
            ].map((item) => (
              <Box
                key={item.id}
                onClick={() => setSidebarTab(item.id)}
                sx={{
                  width: '100%',
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.4,
                  cursor: 'pointer',
                  color: sidebarTab === item.id ? '#241C15' : '#888',
                  borderLeft: sidebarTab === item.id ? '3px solid #FFE01B' : '3px solid transparent',
                  bgcolor: sidebarTab === item.id ? '#FFFBE6' : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: '#FFFBE6', color: '#241C15' }
                }}
              >
                {item.icon}
                <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Sidebar Content Panel */}
          <Box
            sx={{
              width: '300px',
              borderRight: '1px solid #D9D9D9',
              overflowY: 'auto',
              bgcolor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* ADD TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'add' ? 'block' : 'none' }}>
              <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #eee', background: 'linear-gradient(135deg,#f8f9fa 0%,#fff 100%)' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: 15, color: '#1a1a2e' }}>Blocs de contenu</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Glissez un bloc sur la zone de l'email →</Typography>
              </Box>
              {/* Quick-access to templates — visible immediately, no scroll needed */}
              <Box
                onClick={() => setSidebarTab('templates')}
                sx={{
                  mx: 2, mt: 1.5, mb: 0.5, px: 1.5, py: 1,
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                  bgcolor: '#f8fafc',
                  '&:hover': { borderColor: '#0a84d6', bgcolor: '#f0f8ff' },
                  transition: 'all 0.15s',
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <LayersIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    Partir d'un modèle prêt à l'emploi
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>→</Typography>
              </Box>
              <Box
                id="blocks-container"
                sx={{
                  p: 1.5,
                  '& .gjs-blocks-c': {
                    display: 'grid !important',
                    gridTemplateColumns: 'repeat(3, 1fr) !important',
                    gap: '7px !important',
                    padding: '8px 10px 10px !important',
                    boxSizing: 'border-box !important',
                  },
                  '& .gjs-block': {
                    width: '100% !important',
                    minHeight: '82px !important',
                    padding: '8px 4px !important',
                    marginBottom: '0 !important',
                    borderRadius: '8px !important',
                    border: '1.5px solid #EAEAEA !important',
                    backgroundColor: '#FAFAFA !important',
                    display: 'flex !important',
                    flexDirection: 'column !important',
                    alignItems: 'center !important',
                    justifyContent: 'center !important',
                    cursor: 'grab !important',
                    transition: 'all 0.15s ease !important',
                    float: 'none !important',
                    boxSizing: 'border-box !important',
                    '&:hover': {
                      borderColor: '#0a84d6 !important',
                      boxShadow: '0 4px 16px rgba(10,132,214,0.15) !important',
                      backgroundColor: '#f0f8ff !important',
                      transform: 'translateY(-1px)',
                    }
                  },
                  '& .gjs-block-label': {
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#333',
                    textAlign: 'center',
                    marginTop: '4px',
                    lineHeight: '1.2',
                  },
                  '& .gjs-block-category .gjs-title': {
                    fontSize: '10px !important',
                    letterSpacing: '1.5px !important',
                    padding: '8px 12px !important',
                  }
                }}
              />
              <Divider sx={{ my: 1.5, mx: 2 }} />
              <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button size="small" startIcon={<LayersIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setSidebarTab('templates')}
                  sx={{ fontSize: 11, textTransform: 'none', color: '#0a84d6', '&:hover': { bgcolor: '#f0f8ff' } }}>
                  Voir tous les modèles (6)
                </Button>
              </Box>
            </Box>

            {/* TEMPLATES TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'templates' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #eee', background: 'linear-gradient(135deg,#f8f9fa 0%,#fff 100%)' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: 15, color: '#1a1a2e' }}>Modèles prêts à l'emploi</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Cliquez pour charger un modèle complet</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { key: 'theme-welcome', label: 'Welcome Theme', badge: 'FULL', badgeColor: '#22c55e', desc: 'Email de bienvenue avec en-tête, corps et pied de page', preview: [
                    { w: '100%', h: 10, bg: '#F8F9FB' },
                    { w: '100%', h: 70, bg: '#FFFFFF', border: '1px solid #eee' }
                  ]},
                  { key: 'theme-sale', label: 'Flash Sale Theme', badge: 'FULL', badgeColor: '#ef4444', desc: 'Promotion avec urgence et bouton d\'appel à l\'action', preview: [
                    { w: '100%', h: 10, bg: '#0a84d6' },
                    { w: '100%', h: 70, bg: '#1a1a2e', border: '2px solid #000' }
                  ]},
                  { key: 'theme-event', label: 'Event Promotion', badge: 'FULL', badgeColor: '#f59e0b', desc: 'Invitation à un événement ou tournoi golf', preview: [
                    { w: '100%', h: 40, bg: '#f4f6f8' },
                    { w: '100%', h: 40, bg: '#FFFFFF', border: '1px solid #eee' }
                  ]},
                  { key: 'marketing-1-2', label: 'Marketing Card (1:2)', badge: null, desc: 'Bloc image + texte côte à côte', preview: [
                    { w: '35%', h: 80, bg: '#e8f4fe', radius: 4 },
                    { w: '60%', h: 80, bg: '#f4f6f8', radius: 4 }
                  ]},
                  { key: 'text-image', label: 'Full Width Hero', badge: null, desc: 'Bannière pleine largeur avec titre et CTA', preview: [
                    { w: '100%', h: 80, bg: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', radius: 4 }
                  ]},
                  { key: 'event-banner', label: 'Event Banner', badge: null, desc: 'Bannière d\'événement avec date et lieu', preview: [
                    { w: '100%', h: 80, bg: 'linear-gradient(135deg, #0a84d6 0%, #005fa3 100%)', radius: 4 }
                  ]}
                ].map(({ key, label, badge, badgeColor, desc, preview }) => (
                  <Box
                    key={key}
                    onClick={() => addPrebuilt(key)}
                    sx={{
                      border: '1.5px solid #e0e6eb', borderRadius: 2, p: 1.5, cursor: 'pointer',
                      '&:hover': { borderColor: '#0a84d6', boxShadow: '0 2px 10px rgba(10,132,214,0.12)', bgcolor: '#f8fbff' },
                      transition: 'all 0.18s',
                      position: 'relative'
                    }}
                  >
                    {badge && (
                      <Chip label={badge} size="small" sx={{
                        position: 'absolute', top: 8, right: 8, fontSize: '8px', height: 16,
                        bgcolor: badgeColor, color: '#fff', fontWeight: 900
                      }} />
                    )}
                    <Box sx={{ display: 'flex', gap: 0.8, mb: 1, height: 44, borderRadius: 1, overflow: 'hidden' }}>
                      {preview.map((col, i) => (
                        <Box key={i} sx={{ width: col.w, height: '100%', background: col.bg, borderRadius: col.radius || 0, border: col.border || 'none' }} />
                      ))}
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#1a1a2e', lineHeight: 1.3 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.3, lineHeight: 1.4 }}>{desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* STYLES TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'styles' ? 'block' : 'none' }}>
              <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button size="small" onClick={() => setSidebarTab('add')} sx={{ minWidth: 0, p: 0.5, color: '#888', fontSize: 11, textTransform: 'none', '&:hover': { color: '#0a84d6' } }}>
                  ← Blocs
                </Button>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.2 }}>Design Global</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Couleurs, typographie, espacements</Typography>
                </Box>
              </Box>
              
              <Box sx={{ p: 0, '& .MuiAccordion-root': { boxShadow: 'none', borderBottom: '1px solid #eee', '&:before': { display: 'none' } } }}>
                {/* 1. LAYOUT & BACKGROUND */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Layout & Colors
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1 }}>
                   <Grid container spacing={2}>
                     <Grid item xs={12}>
                       <Box display="flex" justifyContent="space-between" alignItems="center">
                         <Typography variant="body2">Body Background</Typography>
                         <input type="color" value={globalStyles.bodyBg} onChange={(e) => setGlobalStyles({...globalStyles, bodyBg: e.target.value})} style={{ border: 'none', width: 28, height: 28, cursor: 'pointer', borderRadius: 4 }} />
                       </Box>
                     </Grid>
                     <Grid item xs={12}>
                       <Box display="flex" justifyContent="space-between" alignItems="center">
                         <Typography variant="body2">Primary Brand</Typography>
                         <input type="color" value={globalStyles.primaryColor} onChange={(e) => setGlobalStyles({...globalStyles, primaryColor: e.target.value})} style={{ border: 'none', width: 28, height: 28, cursor: 'pointer', borderRadius: 4 }} />
                       </Box>
                     </Grid>
                     <Grid item xs={12}>
                       <Typography variant="caption" gutterBottom display="block">Max Content Width (px)</Typography>
                       <TextField size="small" fullWidth type="number" value={globalStyles.containerWidth.replace('px', '')} onChange={(e) => setGlobalStyles({...globalStyles, containerWidth: `${e.target.value}px`})} />
                     </Grid>
                   </Grid>
                </Box>

                {/* 2. TYPOGRAPHY */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #eee' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Typography & Links
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1 }}>
                   <Grid container spacing={2}>
                     <Grid item xs={12}>
                       <Typography variant="caption" gutterBottom display="block">Base Font Family</Typography>
                       <Select fullWidth size="small" value={globalStyles.fontFamily} onChange={(e) => setGlobalStyles({...globalStyles, fontFamily: e.target.value})}>
                         <MenuItem value="Inter, sans-serif">Inter (Moderne)</MenuItem>
                         <MenuItem value="Georgia, serif">Georgia (Classique)</MenuItem>
                         <MenuItem value="Arial, sans-serif">Arial (Standard)</MenuItem>
                         <MenuItem value="'Trebuchet MS', sans-serif">Trebuchet MS</MenuItem>
                         <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
                         <MenuItem value="Verdana, sans-serif">Verdana</MenuItem>
                         <MenuItem value="'Courier New', monospace">Courier New (Mono)</MenuItem>
                       </Select>
                     </Grid>
                     <Grid item xs={6}>
                       <Typography variant="caption" gutterBottom display="block">H1 Size</Typography>
                       <TextField size="small" fullWidth value={globalStyles.h1Size} onChange={(e) => setGlobalStyles({...globalStyles, h1Size: e.target.value})} />
                     </Grid>
                     <Grid item xs={6}>
                       <Typography variant="caption" gutterBottom display="block">H1 Color</Typography>
                       <input type="color" value={globalStyles.h1Color} onChange={(e) => setGlobalStyles({...globalStyles, h1Color: e.target.value})} style={{ border: 'none', width: '100%', height: 32, cursor: 'pointer', borderRadius: 4 }} />
                     </Grid>
                     <Grid item xs={6}>
                        <Typography variant="caption" gutterBottom display="block">Link Color</Typography>
                        <input type="color" value={globalStyles.linkColor} onChange={(e) => setGlobalStyles({...globalStyles, linkColor: e.target.value})} style={{ border: 'none', width: '100%', height: 32, cursor: 'pointer', borderRadius: 4 }} />
                     </Grid>
                     <Grid item xs={6}>
                        <Typography variant="caption" gutterBottom display="block">Link Style</Typography>
                        <Select fullWidth size="small" value={globalStyles.linkDecoration} onChange={(e) => setGlobalStyles({...globalStyles, linkDecoration: e.target.value})}>
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="underline">Underline</MenuItem>
                        </Select>
                     </Grid>
                   </Grid>
                </Box>

                {/* 3. ELEMENTS & SPACING */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #eee' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Elements & Spacing
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 1 }}>
                   <Grid container spacing={2}>
                     <Grid item xs={6}>
                       <Typography variant="caption" gutterBottom display="block">Button Radius</Typography>
                       <TextField size="small" fullWidth value={globalStyles.btnRadius} onChange={(e) => setGlobalStyles({...globalStyles, btnRadius: e.target.value})} />
                     </Grid>
                     <Grid item xs={6}>
                       <Typography variant="caption" gutterBottom display="block">Image Radius</Typography>
                       <TextField size="small" fullWidth value={globalStyles.imageRadius} onChange={(e) => setGlobalStyles({...globalStyles, imageRadius: e.target.value})} />
                     </Grid>
                     <Grid item xs={12}>
                       <Typography variant="caption" gutterBottom display="block">Vertical Block Spacing</Typography>
                       <TextField size="small" fullWidth value={globalStyles.blockSpacing} onChange={(e) => setGlobalStyles({...globalStyles, blockSpacing: e.target.value})} />
                     </Grid>
                   </Grid>
                </Box>

                <Box sx={{ p: 2 }}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<LayersIcon />}
                    onClick={selectGlobal}
                    sx={{ mb: 1, textTransform: 'none', py: 1, fontSize: '13px', borderColor: '#D9D9D9', color: '#241C15' }}
                  >
                    Direct Style Selection
                  </Button>
                </Box>

                <Divider />
                <Box sx={{ p: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>Selection Properties</Typography>
                  <div id="selectors-container" />
                  <div id="styles-container" />
                  <div id="traits-container" />
                </Box>
              </Box>
            </Box>

            {/* OPTIMIZE TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'optimize' ? 'block' : 'none', p: 0 }}>
              <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button size="small" onClick={() => setSidebarTab('add')} sx={{ minWidth: 0, p: 0.5, color: '#888', fontSize: 11, textTransform: 'none', '&:hover': { color: '#0a84d6' } }}>
                  ← Blocs
                </Button>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.2 }}>Audit email</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Vérification avant envoi</Typography>
                </Box>
              </Box>
              
              <Box sx={{ p: 2 }}>
                {auditResults.length === 0 ? (
                  <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
                    <OptimizeIcon sx={{ fontSize: 48, color: '#D9D9D9', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Vérifiez les bonnes pratiques avant d'envoyer votre email.
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={runAudit}
                      sx={{ mt: 3, bgcolor: '#241C15', color: '#FFE01B', '&:hover': { bgcolor: '#000' }, textTransform: 'none', fontWeight: 700 }}
                    >
                      Lancer l'audit
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {auditResults.map((res, idx) => (
                      <Alert 
                        key={idx} 
                        severity={res.type} 
                        variant="outlined"
                        sx={{ 
                          borderRadius: 0, 
                          borderLeft: `4px solid ${res.type === 'error' ? '#d32f2f' : res.type === 'warning' ? '#ed6c02' : '#2e7d32'}` 
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>{res.message}</Typography>
                        <Typography variant="caption">{res.detail}</Typography>
                      </Alert>
                    ))}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={runAudit}
                      sx={{ mt: 1, borderColor: '#241C15', color: '#241C15', textTransform: 'none', fontWeight: 700 }}
                    >
                      Relancer l'audit
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Main Canvas Area */}
          <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: '#F0F0F0', overflow: 'hidden', p: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Breadcrumbs (Mailchimp Style) */}
            {selectedPath.length > 0 && (
              <Box sx={{ 
                bgcolor: '#FFFFFF', 
                borderBottom: '1px solid #D9D9D9', 
                px: 2, py: 0.8, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                minHeight: 36
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 700, fontSize: '10px' }}>SELECTING:</Typography>
                {selectedPath.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => gjsEditorRef.current?.select(item.model)}
                      sx={{
                        minWidth: 'auto',
                        px: 1, py: 0,
                        fontSize: '11px',
                        textTransform: 'none',
                        color: idx === selectedPath.length - 1 ? '#0a84d6' : '#727272',
                        fontWeight: idx === selectedPath.length - 1 ? 700 : 400,
                        '&:hover': { bgcolor: '#f0f5ff' }
                      }}
                    >
                      {item.label}
                    </Button>
                    {idx < selectedPath.length - 1 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>&rsaquo;</Typography>}
                  </React.Fragment>
                ))}
                <Box sx={{ marginLeft: 'auto' }}>
                  <Tooltip title="Sauvegarder ce bloc pour le réutiliser dans d'autres campagnes">
                    <Button
                      size="small"
                      startIcon={<DuplicateIcon sx={{ fontSize: '13px !important' }} />}
                      onClick={() => setSaveBlockDialog({ open: true, nom: selectedPath[selectedPath.length - 1]?.label || 'Bloc personnalisé' })}
                      sx={{ fontSize: '11px', textTransform: 'none', color: '#0a84d6', '&:hover': { bgcolor: '#f0f5ff' } }}
                    >
                      Sauvegarder le bloc
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            )}

            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', overflowY: 'auto', p: builderDevice === 'Mobile' ? 4 : 0, bgcolor: '#F0F0F0', position: 'relative' }}>
              {/* Empty canvas guide — shown only when no content */}
              {canvasEmpty && gjsReady && (
                <Box sx={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(248,249,250,0.97)', zIndex: 10, gap: 2, pointerEvents: 'none'
                }}>
                  <Box sx={{ fontSize: 44, lineHeight: 1 }}>✉️</Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>
                    Votre email est vide
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#777', textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
                    Glissez un bloc depuis le panneau <strong>Blocs</strong> sur la gauche pour commencer.
                  </Typography>
                  <Box sx={{
                    mt: 1, px: 2.5, py: 1.5, bgcolor: '#fff', border: '2px dashed #c5d0db', borderRadius: 2,
                    display: 'flex', alignItems: 'center', gap: 1.5, pointerEvents: 'auto'
                  }}>
                    <Typography sx={{ fontSize: 12, color: '#555' }}>
                      Ou choisissez un modèle prêt à l'emploi ↙
                    </Typography>
                  </Box>
                </Box>
              )}
              <Box
                ref={gjsRef}
                sx={{
                  width: builderDevice === 'Mobile' ? '375px' : '100%',
                  maxWidth: 'none',
                  height: builderDevice === 'Mobile' ? '667px' : '100%',
                  boxShadow: builderDevice === 'Mobile' ? '0 0 40px rgba(0,0,0,0.15)' : 'none',
                  borderRadius: builderDevice === 'Mobile' ? '20px' : 0,
                  border: builderDevice === 'Mobile' ? '8px solid #241C15' : 'none',
                  bgcolor: '#FFFFFF',
                  transition: 'all 0.3s ease-in-out',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: activeTab === 0 ? 'block' : 'none', p: 2 }}>
        <TextField
          multiline
          rows={20}
          fullWidth
          value={htmlContent}
          onChange={(e) => handleHtmlChange(e.target.value)}
          sx={{ fontFamily: 'monospace' }}
        />
      </Box>

      <Box sx={{ display: activeTab === 1 ? 'block' : 'none', p: 2 }}>
        <TextField
          multiline
          rows={20}
          fullWidth
          value={textContent}
          onChange={(e) => handleTextChange(e.target.value)}
        />
      </Box>

      {/* Merge Tags Bar */}
      <Box sx={{
        px: 2, py: 0.9,
        bgcolor: '#f8f9ff',
        borderTop: '1px solid #e5e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap'
      }}>
        <Box display="flex" alignItems="center" gap={0.6} sx={{ minWidth: 'fit-content', mr: 0.5 }}>
          <PersonalizeIcon sx={{ fontSize: 14, color: '#0a84d6' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', color: '#64748b', letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Insérer une variable :
          </Typography>
        </Box>
        {variables.map(v => {
          const handleInsert = () => {
            if (activeTab === 3 && gjsEditorRef.current) {
              const editor = gjsEditorRef.current;
              if (editor.RichTextEditor && editor.RichTextEditor.el) {
                editor.RichTextEditor.insertHTML(v.value);
              } else {
                editor.addComponents(`<span>${v.value}</span>`);
              }
            } else if (activeTab === 0 || activeTab === 1) {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const before = textarea.value.substring(0, start);
                const after = textarea.value.substring(end);
                textarea.value = before + v.value + after;
                textarea.selectionStart = textarea.selectionEnd = start + v.value.length;
                textarea.focus();
                if (activeTab === 0) handleHtmlChange(textarea.value);
                else handleTextChange(textarea.value);
              }
            }
          };
          return (
            <Tooltip
              key={v.value}
              title={
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{v.label}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', mt: 0.3 }}>{v.desc}</Typography>
                  <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: '#93c5fd', mt: 0.5, bgcolor: 'rgba(0,0,0,0.2)', px: 0.8, py: 0.2, borderRadius: 0.5, display: 'inline-block' }}>
                    {v.value}
                  </Typography>
                </Box>
              }
              arrow
              placement="top"
            >
              <Chip
                label={v.label}
                size="small"
                onClick={handleInsert}
                sx={{
                  fontSize: '11px',
                  height: 22,
                  cursor: 'pointer',
                  bgcolor: '#fff',
                  border: '1px solid #d0d7de',
                  color: '#0a84d6',
                  fontWeight: 600,
                  '& .MuiChip-label': { px: 1 },
                  '&:hover': { bgcolor: '#e8f4fe', borderColor: '#0a84d6' },
                  transition: 'all 0.15s'
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      <style>{`
        /* ===== GrapesJS — Premium Email Builder Theme ===== */

        /* Canvas fills its container perfectly */
        .gjs-cv-canvas {
          width: 100% !important;
          height: 100% !important;
          top: 0 !important;
          background-color: #E8ECF0 !important;
        }
        .gjs-frame-wrapper {
          background: #E8ECF0 !important;
        }
        .gjs-editor-cont { position: relative; }

        /* Floating component toolbar */
        .gjs-toolbar {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border-radius: 6px !important;
          border: none !important;
          padding: 3px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25) !important;
        }
        .gjs-toolbar-item {
          padding: 7px 9px !important;
          color: rgba(255,255,255,0.75) !important;
          transition: all 0.15s ease !important;
          border-radius: 4px !important;
        }
        .gjs-toolbar-item:hover {
          color: #fff !important;
          background: rgba(10, 132, 214, 0.3) !important;
        }

        /* Selection + hover highlight */
        .gjs-comp-selected {
          outline: 2px solid #0a84d6 !important;
          outline-offset: -1px !important;
        }
        .gjs-comp-hovered {
          outline: 1px dashed rgba(10, 132, 214, 0.4) !important;
        }

        /* Block cards */
        .gjs-block {
          color: #444 !important;
          border-radius: 8px !important;
          transition: all 0.18s ease !important;
          box-shadow: none !important;
        }
        .gjs-block:hover {
          box-shadow: 0 4px 14px rgba(10, 132, 214, 0.15) !important;
          border-color: #0a84d6 !important;
          transform: translateY(-2px);
        }

        /* Category headers — légers, non-intrusifs */
        .gjs-block-category {
          background: transparent !important;
          border-top: 1px solid #e8ecf0 !important;
          border-bottom: none !important;
        }
        .gjs-block-category:first-child {
          border-top: none !important;
        }
        .gjs-block-category .gjs-title {
          color: #64748b !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 1.4px !important;
          padding: 10px 14px 6px !important;
        }
        .gjs-block-category .gjs-caret {
          color: #94a3b8 !important;
        }
        .gjs-blocks-c,
        .gjs-block-category .gjs-blocks-c {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 7px !important;
          padding: 8px 10px 10px !important;
          background: transparent !important;
          box-sizing: border-box !important;
        }
        .gjs-block {
          width: 100% !important;
          float: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }

        /* Style panel heading */
        .gjs-sm-sector-title {
          background: #f5f7fa !important;
          color: #333 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          border-bottom: 1px solid #e8ecf0 !important;
        }

        /* RTE toolbar */
        .gjs-rte-toolbar {
          background: #1a1a2e !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
        }
        .gjs-rte-action {
          color: rgba(255,255,255,0.8) !important;
          border-right: 1px solid rgba(255,255,255,0.1) !important;
        }
        .gjs-rte-action:hover {
          background: rgba(10,132,214,0.3) !important;
          color: #fff !important;
        }
      `}</style>

      {/* Save Block dialog */}
      <Dialog open={saveBlockDialog.open} onClose={() => setSaveBlockDialog(s => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>Sauvegarder ce bloc</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth size="small" label="Nom du bloc"
            value={saveBlockDialog.nom}
            onChange={e => setSaveBlockDialog(s => ({ ...s, nom: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && saveBlockDialog.nom.trim()) { saveSelectedBlock(saveBlockDialog.nom.trim()); setSaveBlockDialog(s => ({ ...s, open: false })); } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setSaveBlockDialog(s => ({ ...s, open: false }))} sx={{ color: '#6b7280' }}>Annuler</Button>
          <Button variant="contained" size="small"
            onClick={() => { saveSelectedBlock(saveBlockDialog.nom.trim()); setSaveBlockDialog(s => ({ ...s, open: false })); }}
            disabled={!saveBlockDialog.nom.trim()}
            sx={{ bgcolor: '#0a84d6', '&:hover': { bgcolor: '#0065a9' } }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link / Image URL dialog — replaces window.prompt() */}
      <Dialog
        open={linkDialog.open}
        onClose={() => setLinkDialog(s => ({ ...s, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>
          {linkDialog.mode === 'image' ? 'Insérer une image' : 'Insérer un lien'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="URL"
            value={linkDialog.url}
            onChange={e => setLinkDialog(s => ({ ...s, url: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                linkCallbackRef.current?.(linkDialog.url);
                setLinkDialog(s => ({ ...s, open: false }));
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            onClick={() => setLinkDialog(s => ({ ...s, open: false }))}
            sx={{ color: '#6b7280' }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              linkCallbackRef.current?.(linkDialog.url);
              setLinkDialog(s => ({ ...s, open: false }));
            }}
            sx={{ bgcolor: '#0a84d6', '&:hover': { bgcolor: '#0065a9' } }}
          >
            {linkDialog.mode === 'image' ? 'Insérer' : 'Appliquer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import HTML dialog */}
      <Dialog
        open={importHtmlDialog.open}
        onClose={() => setImportHtmlDialog(s => ({ ...s, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>Importer du HTML</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Collez votre code HTML ici. Le contenu actuel sera remplacé.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={14}
            fullWidth
            size="small"
            label="HTML"
            value={importHtmlDialog.html}
            onChange={e => setImportHtmlDialog(s => ({ ...s, html: e.target.value }))}
            sx={{ mt: 0.5, fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setImportHtmlDialog(s => ({ ...s, open: false }))} sx={{ color: '#6b7280' }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!importHtmlDialog.html.trim()}
            onClick={() => {
              const rawHtml = importHtmlDialog.html.trim();
              setHtmlContent(rawHtml);
              onChange?.(rawHtml);
              if (gjsEditorRef.current) {
                try {
                  // Extract CSS from <style> tags so GrapesJS canvas renders them
                  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
                  const templateCss = [...parsed.querySelectorAll('style')]
                    .map(el => el.textContent).join('\n');
                  const bodyHtml = parsed.body ? parsed.body.innerHTML : rawHtml;

                  gjsEditorRef.current.setComponents(bodyHtml);
                  if (templateCss.trim()) gjsEditorRef.current.setStyle(templateCss);

                  // Re-inject global-vars into canvas head (setStyle clears it)
                  const canvasDoc = gjsEditorRef.current.Canvas.getDocument();
                  if (canvasDoc) {
                    let gv = canvasDoc.getElementById('global-vars');
                    if (!gv) { gv = canvasDoc.createElement('style'); gv.id = 'global-vars'; canvasDoc.head.appendChild(gv); }
                    gv.innerHTML = buildGlobalCss(globalStylesRef.current);
                    // Inject template CSS as separate element so it sits alongside global vars
                    if (templateCss.trim()) {
                      let tc = canvasDoc.getElementById('imported-css');
                      if (!tc) { tc = canvasDoc.createElement('style'); tc.id = 'imported-css'; canvasDoc.head.appendChild(tc); }
                      tc.innerHTML = templateCss;
                    }
                  }
                } catch (_) {}
              }
              setImportHtmlDialog(s => ({ ...s, open: false }));
            }}
            sx={{ bgcolor: '#0a84d6', '&:hover': { bgcolor: '#0065a9' } }}
          >
            Importer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailEditor;