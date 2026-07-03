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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

const EmailEditor = ({ 
  value = '', 
  onChange, 
  onSave, 
  onSend, 
  onTest,
  loading = false,
  readOnly = false 
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(3);
  const [sidebarTab, setSidebarTab] = useState('add');
  const [globalDesignOpen, setGlobalDesignOpen] = useState(true);
  const [htmlContent, setHtmlContent] = useState(value);
  const [textContent, setTextContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [auditResults, setAuditResults] = useState([]);
  const [history, setHistory] = useState([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const quillRef = useRef(null);
  const gjsRef = useRef(null);
  const gjsEditorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [gjsReady, setGjsReady] = useState(false);
  const [builderDevice, setBuilderDevice] = useState('Desktop');
  const [selectedPath, setSelectedPath] = useState([]);
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
  // Removed text-to-html feature
  const isComplexHtml = React.useMemo(() => /\<(table|html|head|body|tr|td|style)[\s>]/i.test(htmlContent || ''), [htmlContent]);

  useEffect(() => {
    setHtmlContent(value);
    setHistory([value]);
    setHistoryIndex(0);
  }, [value]);

  useEffect(() => {
    // Convertir HTML vers texte pour l'onglet texte
    if (activeTab === 1) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      setTextContent(tempDiv.textContent || tempDiv.innerText || '');
    }
    if (gjsRef.current && !gjsEditorRef.current) {
      const editor = grapesjs.init({
        container: gjsRef.current,
        height: '600px',
        fromElement: false,
        storageManager: false,
        canvas: {
          styles: [
            'https://unpkg.com/normalize.css@8.0.1/normalize.css',
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Georgia&display=swap'
          ],
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
          // Anti-Spam: Prevent users from uploading huge images that cause deliverability issues
          onBeforeUpload: (files) => {
            const limit = 10 * 1024 * 1024; // 10MB (raised from 1MB to match backend)
            for (let i = 0; i < files.length; i++) {
              if (files[i].size > limit) {
                toast.warning(`Fichier trop lourd (${Math.round(files[i].size/1024/1024 * 10)/10}MB). Utilisez des images < 10MB.`);
                return false;
              }
            }
            return true;
          },
          // Custom response handling to match our API { success: true, url: '...' }
          onResponse: (response) => {
            const data = typeof response === 'string' ? JSON.parse(response) : response;
            // Return either an array of URLs or an object with data property
            return [data.url];
          },
          // Error handling
          onError: (err) => {
            console.error('Asset upload error:', err);
            toast.error("Échec de l'upload. Vérifiez la taille et le format du fichier.");
          }
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

      // --- Helper to create block contents with visual thumbnail + label ---
      const blockLabel = (icon, name) => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;">
          <div style="width:44px;height:36px;display:flex;align-items:center;justify-content:center;background:#f4f6f8;border-radius:6px;font-size:20px;">${icon}</div>
          <div style="font-size:11px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.4px;">${name}</div>
        </div>`;

      const bm = editor.BlockManager;

      // --- Mailchimp Inspired Blocks ---
      bm.getAll().reset(); // Clear default blocks to start fresh with custom categories
      
      const categoryBasic = 'Basic Blocks';
      const categoryLayout = 'Layouts';
      const categoryMarketing = 'Commerce & Engagement';

      // --- Mailchimp Inspired Robust Blocks (Table-Based) ---

      // 1. Header Block (Fixed for Outlook/Gmail compatibility)
      bm.add('header-golf', {
        label: blockLabel('🖼️', 'Header'),
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
        label: blockLabel('📝', 'Text'),
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
        label: blockLabel('🔘', 'Button'),
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

      // 5. Two Columns
      bm.add('two-column-layout', {
        label: blockLabel('⬜⬜', '2 Columns'),
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
        label: blockLabel('▪▪▪', '3 Columns'),
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
        label: blockLabel('➖', 'Divider'),
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
        label: blockLabel('💬', 'Quote'),
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
        label: blockLabel('▶️', 'Video'),
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
        label: blockLabel('🌐', 'Social'),
        category: categoryBasic,
        content: `
          <div class="block-wrapper">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 10px;"><a href="#"><img src="https://cdn-images.mailchimp.com/icons/social-block/color-facebook-48.png" width="32"></a></td>
                      <td style="padding: 10px;"><a href="#"><img src="https://cdn-images.mailchimp.com/icons/social-block/color-instagram-48.png" width="32"></a></td>
                      <td style="padding: 10px;"><a href="#"><img src="https://cdn-images.mailchimp.com/icons/social-block/color-twitter-48.png" width="32"></a></td>
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
        label: blockLabel('📋', 'Footer'),
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
        label: blockLabel('🛍️', 'Product'),
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
        label: blockLabel('📊', 'Survey'),
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
        label: blockLabel('⚡', 'Apps'),
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
        label: blockLabel('🌟', 'Hero'),
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
        label: blockLabel('↕️', 'Spacer'),
        category: categoryBasic,
        content: `
          <div class="spacer" style="height: 40px; line-height: 40px; font-size: 1px;">&nbsp;</div>
        `
      });

      // 17. 3-Column Image Grid
      bm.add('image-grid-3', {
        label: blockLabel('🖼️🖼️🖼️', 'Gallery'),
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
        label: blockLabel('✨', 'Recommend'),
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

      // Load existing content
      if (htmlContent && htmlContent.trim().length > 0) {
        try {
          editor.setComponents(htmlContent);
        } catch (_) {}
      }

      // Sync changes back to parent
      const syncContent = () => {
        const html = editor.getHtml();
        const css = editor.getCss();
        const combined = `<style>${css}</style>\n${html}`;
        setHtmlContent(combined);
        onChange?.(combined);
      };

      editor.on('load', () => {
        const doc = editor.Canvas.getDocument();
        if (!doc) {
          console.warn('[EDITOR] Canvas document not ready during load event');
          return;
        }
        
        // Modern styling (spans instead of font tags)
        try {
          doc.execCommand('styleWithCSS', false, true);
        } catch (e) {}

        const style = document.createElement('style');
        style.innerHTML = `
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
            console.error('Failed to load recent assets:', err);
          }
        };
        fetchAssets();
      });

      editor.on('component:update', syncContent);
      editor.on('block:drag:stop', syncContent);
      editor.on('style:update', syncContent);

      // Force refresh of Asset Manager when an upload completes
      editor.on('asset:upload:response', (response) => {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        if (data && data.url) {
          console.log('[EDITOR] Asset upload successful, adding to manager:', data.url);
          editor.AssetManager.add(data.url);
        }
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

      // Clear Breadcrumbs on deselect
      editor.on('component:deselected', () => {
        setSelectedPath([]);
      });

      // RTF Customization (Word/Outlook Style) - CLEAN & STABLE VERSION
      const rte = editor.RichTextEditor;
      
      // 1. Remove ALL existing actions to start fresh (prevents duplicates)
      const existingActions = ['bold', 'italic', 'underline', 'strikethrough', 'link', 'fontSize', 'fontName', 'fontFamily', 'foreColor', 'alignLeft', 'alignCenter', 'alignRight'];
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
        icon: '<b>B</b>',
        attributes: { title: 'Bold' },
        result: rte => rte.exec('bold'),
      });

      rte.add('italic', {
        icon: '<i>I</i>',
        attributes: { title: 'Italic' },
        result: rte => rte.exec('italic'),
      });

      // Alignment
      rte.add('alignLeft', {
        icon: 'L',
        attributes: { title: 'Align Left' },
        result: rte => rte.exec('justifyLeft'),
      });

      rte.add('alignCenter', {
        icon: 'C',
        attributes: { title: 'Align Center' },
        result: rte => rte.exec('justifyCenter'),
      });

      rte.add('alignRight', {
        icon: 'R',
        attributes: { title: 'Align Right' },
        result: rte => rte.exec('justifyRight'),
      });

      // Link
      rte.add('link', {
        icon: '🔗',
        attributes: { title: 'Link' },
        result: (rte) => {
          const url = window.prompt('URL', 'https://');
          if (url) rte.exec('createLink', url);
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

      gjsEditorRef.current = editor;
      setGjsReady(true);
    }
  }, []); // Only on mount

  // Sync content TO GrapesJS when prop value changes (Crucial for restoration)
  useEffect(() => {
    if (gjsEditorRef.current && gjsReady) {
      const editor = gjsEditorRef.current;
      const gjsContent = editor.getHtml();
      
      // We check if the content is meaningfully different to avoid cursor reset loops
      // but ensure that restoration HTML is loaded
      if (value && gjsContent !== value && value.length > 0) {
        try {
          editor.setComponents(value);
          console.log('[EDITOR] Content sync from prop successful');
        } catch (e) {
          console.error('[EDITOR] Failed to sync content to GrapesJS', e);
        }
      }
    }
  }, [value, gjsReady]);

  // Sync content TO GrapesJS when switching to Builder tab
  useEffect(() => {
    if (activeTab === 3 && gjsEditorRef.current) {
      const editor = gjsEditorRef.current;
      const gjsContent = editor.getHtml();
      if (htmlContent && gjsContent !== htmlContent && htmlContent.length > 0) {
        try {
          editor.setComponents(htmlContent);
        } catch (e) {
          console.error('Failed to sync content to GrapesJS', e);
        }
      }
    }
  }, [activeTab]);


  // React to Global Style changes
  useEffect(() => {
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
      
      // Inject CSS variables for dynamic content and global tag styles
      const styleEl = doc.getElementById('global-vars') || doc.createElement('style');
      styleEl.id = 'global-vars';
      styleEl.innerHTML = `
        :root {
          --primary-color: ${globalStyles.primaryColor};
          --secondary-color: ${globalStyles.secondaryColor};
          --font-family: ${globalStyles.fontFamily};
          --h1-color: ${globalStyles.h1Color};
          --h1-size: ${globalStyles.h1Size};
          --h2-color: ${globalStyles.h2Color};
          --h2-size: ${globalStyles.h2Size};
          --body-color: ${globalStyles.bodyColor};
          --body-size: ${globalStyles.bodySize};
          --link-color: ${globalStyles.linkColor};
          --link-decoration: ${globalStyles.linkDecoration};
          --btn-radius: ${globalStyles.btnRadius};
          --btn-padding: ${globalStyles.btnPadding};
          --btn-color: ${globalStyles.btnColor};
          --img-radius: ${globalStyles.imageRadius};
          --block-spacing: ${globalStyles.blockSpacing};
          --container-width: ${globalStyles.containerWidth};
          --line-height: ${globalStyles.lineHeight};
        }
        body { 
          background-color: ${globalStyles.bodyBg}; 
          font-family: var(--font-family);
          color: var(--body-color);
          line-height: var(--line-height);
        }
        h1 { color: var(--h1-color); font-size: var(--h1-size); font-weight: ${globalStyles.h1Weight}; margin-bottom: 0.5em; margin-top: 0; }
        h2 { color: var(--h2-color); font-size: var(--h2-size); margin-bottom: 0.5em; margin-top: 0; }
        p { margin-bottom: 1em; font-size: var(--body-size); }
        a { color: var(--link-color); text-decoration: var(--link-decoration); }
        img { border-radius: var(--img-radius); max-width: 100%; height: auto; }
        .btn-primary { 
          background-color: var(--primary-color) !important; 
          color: var(--btn-color) !important;
          border-radius: var(--btn-radius) !important;
          padding: var(--btn-padding) !important;
          text-decoration: none;
          display: inline-block;
          font-weight: 700;
        }
        .main-container {
          max-width: var(--container-width) !important;
          width: 100% !important;
        }
        .block-wrapper {
          padding: var(--block-spacing) 0;
        }
      `;
      if (!doc.getElementById('global-vars')) doc.head.appendChild(styleEl);
    }
  }, [globalStyles, gjsReady]);

  const handleHtmlChange = (newContent) => {
    setHtmlContent(newContent);
    onChange?.(newContent);
    
    // Ajouter à l'historique
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Real-time Optimization Audit (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      runAudit();
    }, 1500);
    return () => clearTimeout(timer);
  }, [htmlContent, gjsReady]);

  const handleTextChange = (newContent) => {
    setTextContent(newContent);
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
          const url = window.prompt('URL du lien', 'https://');
          if (url) {
            quill.format('link', url);
          }
          break;
        }
        case 'image': {
          const url = window.prompt('URL de l\'image', 'https://');
          if (url) {
            quill.insertEmbed(range.index, 'image', url, 'user');
          }
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
    { label: 'Prénom', value: '{{prenom}}' },
    { label: 'Nom', value: '{{nom}}' },
    { label: 'Full Name', value: '{{fullname}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Ville', value: '{{ville}}' },
    { label: 'Nationalité', value: '{{nationalite}}' },
    { label: 'Sexe', value: '{{sexe}}' },
    { label: 'Handicap', value: '{{handicap}}' },
    { label: 'Type Client', value: '{{type_client}}' },
    { label: 'Désabonnement', value: '{{unsubscribe_link}}' },
    { label: 'Tracking Pixel', value: '{{tracking_pixel}}' },
    { label: 'Voir Navigateur', value: '{{view_in_browser_link}}' },
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
      case 'theme-welcome':
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
      case 'theme-sale':
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
      case 'theme-event':
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

  const runAudit = () => {
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
            console.error('Upload image failed', err);
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
        minHeight: 52
      }}>
        {/* Left: Mode Tabs */}
        <Box display="flex" gap={0}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)} 
            sx={{
              minHeight: 52,
              '& .MuiTab-root': {
                minHeight: 52,
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
        
        {/* Right: Controls */}
        <Box display="flex" gap={1} alignItems="center">
          {/* Undo/Redo */}
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

          <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(255,255,255,0.2)', mx: 0.5 }} />

          {/* Device Toggle */}
          <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 0.5, gap: 0.5 }}>
            <Tooltip title="Desktop view">
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
            <Tooltip title="Mobile view">
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
        </Box>
      </Box>

      {/* Tab Contents */}
      <Box sx={{ display: activeTab === 3 ? 'flex' : 'none' }}>
        <Box display="flex" sx={{ height: 'calc(100vh - 140px)', borderTop: '1px solid #D9D9D9', width: '100%' }}>
          {/* Vertical Icon Bar (Mailchimp Style) */}
          <Box 
            sx={{ 
              width: '60px', 
              borderRight: '1px solid #D9D9D9', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              py: 2, 
              bgcolor: '#FFFFFF',
              gap: 1
            }}
          >
            {[
              { id: 'add', icon: <AddIcon />, label: 'Add' },
              { id: 'styles', icon: <StyleIcon />, label: 'Styles' },
              { 
                id: 'optimize', 
                icon: (
                  <Badge 
                    badgeContent={auditResults.filter(r => r.type === 'error' || r.type === 'warning').length} 
                    color="error"
                    sx={{ '& .MuiBadge-badge': { fontSize: '10px', height: 16, minWidth: 16 } }}
                  >
                    <OptimizeIcon />
                  </Badge>
                ), 
                label: 'Optimize' 
              }
            ].map((item) => (
              <Tooltip key={item.id} title={item.label} placement="right">
                <IconButton 
                  onClick={() => setSidebarTab(item.id)}
                  sx={{ 
                    borderRadius: 0, 
                    width: '100%', 
                    py: 1.5,
                    color: sidebarTab === item.id ? '#241C15' : '#727272',
                    borderLeft: sidebarTab === item.id ? '4px solid #FFE01B' : '4px solid transparent',
                    bgcolor: sidebarTab === item.id ? '#FFFBE6' : 'transparent',
                    '&:hover': { bgcolor: '#FFFBE6' }
                  }}
                >
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>

          {/* Sidebar Content Panel */}
          <Box 
            sx={{ 
              width: '320px', 
              borderRight: '1px solid #D9D9D9', 
              overflowY: 'auto',
              bgcolor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* ADD TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'add' ? 'block' : 'none' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                <Typography variant="subtitle1" fontWeight={700}>Content</Typography>
                <Typography variant="caption" color="text.secondary">Drag these blocks onto your canvas</Typography>
              </Box>
              <Box 
                id="blocks-container" 
                sx={{ 
                  p: 2,
                  '& .gjs-block': {
                    width: 'calc(50% - 5px) !important',
                    minHeight: '80px !important',
                    padding: '12px !important',
                    marginBottom: '10px !important',
                    borderRadius: '4px !important',
                    border: '1px solid #EAEAEA !important',
                    backgroundColor: '#FFFFFF !important',
                    display: 'inline-flex !important',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    float: 'left',
                    '&:nth-of-type(odd)': { marginRight: '10px' },
                    '&:hover': {
                      borderColor: '#241C15',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      color: '#241C15',
                      bgcolor: '#FFFBE6 !important'
                    }
                  },
                  '& .gjs-block-label': {
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#241C15',
                    marginTop: '8px',
                    textAlign: 'center'
                  }
                }} 
              />
              <Divider sx={{ my: 2, mx: 2 }} />
              <Box sx={{ px: 2, pb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Prebuilt Layouts</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>Click to add a ready-made section</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { key: 'theme-welcome', label: 'Welcome Theme', full: true, preview: [
                      { w: '100%', h: 10, bg: '#F8F9FB' },
                      { w: '100%', h: 70, bg: '#FFFFFF', border: '1px solid #eee' }
                    ]},
                    { key: 'theme-sale', label: 'Flash Sale Theme', full: true, preview: [
                      { w: '100%', h: 10, bg: '#0a84d6' },
                      { w: '100%', h: 70, bg: '#1a1a2e', border: '2px solid #000' }
                    ]},
                    { key: 'theme-event', label: 'Event Promotion', full: true, preview: [
                      { w: '100%', h: 40, bg: '#f4f6f8' },
                      { w: '100%', h: 40, bg: '#FFFFFF', border: '1px solid #eee' }
                    ]},
                    { key: 'marketing-1-2', label: 'Marketing Card (1:2)', preview: [
                      { w: '35%', h: 80, bg: '#e8f4fe', radius: 4 },
                      { w: '60%', h: 80, bg: '#f4f6f8', radius: 4 }
                    ]},
                    { key: 'text-image', label: 'Full Width Hero', preview: [
                      { w: '100%', h: 80, bg: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', radius: 4 }
                    ]},
                    { key: 'event-banner', label: 'Event Banner', preview: [
                      { w: '100%', h: 80, bg: 'linear-gradient(135deg, #0a84d6 0%, #005fa3 100%)', radius: 4 }
                    ]}
                  ].map(({ key, label, preview, full }) => (
                    <Box
                      key={key}
                      onClick={() => addPrebuilt(key)}
                      sx={{
                        border: '1px solid #e0e6eb', borderRadius: 2, p: 1.5, cursor: 'pointer',
                        '&:hover': { borderColor: '#0a84d6', boxShadow: '0 2px 10px rgba(10,132,214,0.12)', bgcolor: '#f8fbff' },
                        transition: 'all 0.18s',
                        position: 'relative'
                      }}
                    >
                      {full && <Chip label="FULL" size="small" sx={{ position: 'absolute', top: 8, right: 8, fontSize: '8px', height: 16, bgcolor: '#FFE01B', fontWeight: 900 }} />}
                      <Box sx={{ display: 'flex', gap: 0.8, mb: 1, height: 40, borderRadius: 1, overflow: 'hidden' }}>
                        {preview.map((col, i) => (
                          <Box key={i} sx={{ width: col.w, height: '100%', background: col.bg, borderRadius: col.radius || 0, border: col.border || 'none' }} />
                        ))}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', color: '#333' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* STYLES TAB CONTENT */}
            <Box sx={{ display: sidebarTab === 'styles' ? 'block' : 'none' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                <Typography variant="subtitle1" fontWeight={700}>Design System</Typography>
                <Typography variant="caption" color="text.secondary">Global standards for your email</Typography>
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
                         <MenuItem value="Inter, sans-serif">Inter (Modern)</MenuItem>
                         <MenuItem value="Georgia, serif">Georgia (Classic)</MenuItem>
                         <MenuItem value="Arial, sans-serif">Arial (Standard)</MenuItem>
                         <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
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
              <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                <Typography variant="subtitle1" fontWeight={700}>Optimize</Typography>
                <Typography variant="caption" color="text.secondary">Content & delivery audit</Typography>
              </Box>
              
              <Box sx={{ p: 2 }}>
                {auditResults.length === 0 ? (
                  <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
                    <OptimizeIcon sx={{ fontSize: 48, color: '#D9D9D9', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Run a quick check to ensure your email follows best practices.
                    </Typography>
                    <Button 
                      variant="contained" 
                      fullWidth
                      onClick={runAudit}
                      sx={{ mt: 3, bgcolor: '#241C15', color: '#FFE01B', '&:hover': { bgcolor: '#000' } }}
                    >
                      Run Audit
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
                      sx={{ mt: 1, borderColor: '#241C15', color: '#241C15' }}
                    >
                      Re-run Audit
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
              </Box>
            )}

            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', overflowY: 'auto', p: builderDevice === 'Mobile' ? 4 : 0, bgcolor: '#F0F0F0' }}>
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
        px: 2.5, py: 1.2, 
        bgcolor: '#f8f9ff', 
        borderTop: '1px solid #e5e8f0',
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        flexWrap: 'wrap'
      }}>
        <Box display="flex" alignItems="center" gap={0.8} sx={{ color: '#555', minWidth: 'fit-content' }}>
          <PersonalizeIcon sx={{ fontSize: 16, color: '#0a84d6' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#444', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Insert Merge Tag:
          </Typography>
        </Box>
        {variables.map(v => (
          <Chip
            key={v.value}
            label={v.label}
            size="small"
            onClick={() => {
              if (activeTab === 3 && gjsEditorRef.current) {
                const editor = gjsEditorRef.current;
                // If the Rich Text Editor is active, insert HTML inline
                if (editor.RichTextEditor && editor.RichTextEditor.el) {
                  editor.RichTextEditor.insertHTML(v.value);
                } else {
                  // Fallback: add as a new component if no text is being edited
                  editor.addComponents(`<span>${v.value}</span>`);
                }
              } else if ((activeTab === 0 || activeTab === 1)) {
                // Support for HTML/Text tabs
                const textarea = document.querySelector('textarea');
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const after = text.substring(end, text.length);
                  textarea.value = before + v.value + after;
                  textarea.selectionStart = textarea.selectionEnd = start + v.value.length;
                  textarea.focus();
                  if (activeTab === 0) handleHtmlChange(textarea.value);
                  else handleTextChange(textarea.value);
                }
              }
            }}
            sx={{ 
              fontSize: '11px',
              height: 24,
              cursor: 'pointer',
              bgcolor: '#fff',
              border: '1px solid #d0d7de',
              color: '#0a84d6',
              fontFamily: 'monospace',
              fontWeight: 600,
              '&:hover': { bgcolor: '#e8f4fe', borderColor: '#0a84d6' },
              transition: 'all 0.15s'
            }}
          />
        ))}
      </Box>

      <style>{`
        /* ===== GrapesJS — Premium Email Builder Theme ===== */

        /* Canvas fills its container perfectly */
        .gjs-cv-canvas {
          width: 100% !important;
          height: 100% !important;
          top: 0 !important;
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

        /* Category headers */
        .gjs-block-category {
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%) !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .gjs-block-category .gjs-title {
          color: #fff !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 1.2px !important;
          padding: 10px 14px !important;
        }
        .gjs-block-category .gjs-caret {
          color: #0a84d6 !important;
        }
        .gjs-block-category .gjs-blocks-c {
          padding: 10px !important;
          background: #fff !important;
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
    </Box>
  );
};

export default EmailEditor; 