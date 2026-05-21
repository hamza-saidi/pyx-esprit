import React from 'react';

export default function EmailRenderer({ doc }) {
  const styles = doc?.styles || {};
  const fontFamily = styles.fontFamily || 'Arial, sans-serif';
  const textColor = styles.color || '#333333';
  const buttonColor = styles.buttonColor || '#1976d2';

  const maxWidth = styles.maxWidth || 600;
  const pageBg = styles.pageBg || '#ffffff';
  const css = `body{margin:0;padding:0;background:${pageBg}} .container{max-width:${maxWidth}px;margin:0 auto;padding:0 16px;font-family:${fontFamily};color:${textColor}} .btn{background:${buttonColor};color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block}`;

  const renderBlock = (b) => {
    if (!b) return '';
    switch (b.type) {
      case 'title':
        return `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${b.text || ''}</h1>`;
      case 'text':
        return `<div style="margin:0 0 16px">${b.html || ''}</div>`;
      case 'image':
        return `<div style="margin:0 0 16px"><img src="${b.url || ''}" alt="" style="max-width:100%;border:0"/></div>`;
      case 'button': {
        const url = (() => {
          const base = b.url || '#';
          const u = new URL(base, 'https://dummy.local');
          const params = new URLSearchParams(u.search);
          if (b.utm_source) params.set('utm_source', b.utm_source);
          if (b.utm_medium) params.set('utm_medium', b.utm_medium);
          if (b.utm_campaign) params.set('utm_campaign', b.utm_campaign);
          const qs = params.toString();
          const href = (base.startsWith('http://') || base.startsWith('https://')) ? base.split('?')[0] : base;
          return qs ? `${href}?${qs}` : href;
        })();
        return `<div style="margin:16px 0"><a class=\"btn\" href=\"${url}\">${b.label || 'Bouton'}</a></div>`;
      }
      case 'divider':
        return `<hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0"/>`;
      case 'spacer':
        return `<div style="height:${b.height || 16}px"></div>`;
      case 'social': {
        const items = [
          b.facebook ? `<a href="${b.facebook}" style="margin-right:8px;text-decoration:none;">Facebook</a>` : '',
          b.instagram ? `<a href="${b.instagram}" style="margin-right:8px;text-decoration:none;">Instagram</a>` : '',
          b.linkedin ? `<a href="${b.linkedin}" style="text-decoration:none;">LinkedIn</a>` : '',
        ].filter(Boolean).join('');
        return items ? `<div style="margin:12px 0">${items}</div>` : '';
      }
      case 'table': {
        const csv = (b.csv || '').trim();
        if (!csv) return '';
        const rows = csv.split(/\r?\n/).map(l => l.split(',').map(c => c.trim()));
        const thead = rows.length ? `<tr>${rows[0].map(c => `<th style=\"text-align:left;padding:6px 8px;border-bottom:1px solid #eee\">${c}</th>`).join('')}</tr>` : '';
        const tbody = rows.slice(1).map(r => `<tr>${r.map(c => `<td style=\"padding:6px 8px;border-bottom:1px solid #f5f5f5\">${c}</td>`).join('')}</tr>`).join('');
        return `<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border-collapse:collapse;margin:8px 0\"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
      }
      case 'video': {
        const url = b.url || '';
        if (!url) return '';
        // Fallback: link preview box
        return `<div style=\"margin:12px 0;padding:12px;border:1px solid #eee;border-radius:6px\"><a href=\"${url}\" style=\"text-decoration:none;color:${buttonColor}\">Voir la vidéo</a></div>`;
      }
      case 'columns2': {
        const left = Array.isArray(b.left) ? b.left.map(renderBlock).join('') : '';
        const right = Array.isArray(b.right) ? b.right.map(renderBlock).join('') : '';
        return `<table width="100%" cellspacing="0" cellpadding="0"><tr>
          <td valign="top" width="50%" style="padding-right:8px">${left}</td>
          <td valign="top" width="50%" style="padding-left:8px">${right}</td>
        </tr></table>`;
      }
      default:
        return '';
    }
  };

  const header = doc?.header?.show
    ? `<div style="padding:16px 0;text-align:center">${doc.header.logoUrl ? `<img src="${doc.header.logoUrl}" style="max-height:48px"/>` : ''}${doc.header.title ? `<div style="margin-top:8px;font-weight:700">${doc.header.title}</div>` : ''}</div>`
    : '';
  const footer = doc?.footer?.show
    ? `<div style="padding:24px 0;color:#777;font-size:12px;text-align:center">${doc.footer.text || ''}</div>`
    : '';
  const body = (doc?.blocks || []).map(renderBlock).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${css}</style></head><body><div class="container">${header}${body}${footer}</div></body></html>`;
  return <iframe title="email-preview" style={{ width: '100%', height: 520, border: 0, background: '#fff' }} srcDoc={html} />;
}


