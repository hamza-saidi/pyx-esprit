const path = require('path');
const fs = require('fs');

const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
fs.writeFileSync(path.join(uploadsDir, 'test.jpg'), 'fake content');

const baseUrl = 'https://crm2.citrusgolfclub.com';
const html =
  '<style>p{color:red;}</style><div><img src="https://crm2.citrusgolfclub.com/api/templates/media/test.jpg" width="100%" /></div>';

function _processImagesAndInlining(html) {
  const attachments = [];
  try {
    const regex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let next = html;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const fullTag = match[0];
      const url = match[1] || '';

      let safeName = null;
      if (baseUrl && url.startsWith(baseUrl)) {
        const pathPart = url.substring(baseUrl.length);
        const mediaMatch = pathPart.match(
          /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
        );
        if (mediaMatch) safeName = mediaMatch[2];
      } else if (url.startsWith('/api/')) {
        const mediaMatch = url.match(
          /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
        );
        if (mediaMatch) safeName = mediaMatch[2];
      }

      console.log('Processing Tag:', fullTag);
      console.log('URL:', url);
      console.log('SafeName:', safeName);

      if (!safeName) continue;

      const filePath = path.join(uploadsDir, safeName);
      console.log('FilePath:', filePath);
      if (!fs.existsSync(filePath)) {
        console.log('File does NOT exist!');
        continue;
      }

      const contentId = `img-${safeName.replace(/[^a-zA-Z0-9]/g, '')}`;
      attachments.push({
        filename: safeName,
        path: filePath,
        cid: contentId,
      });

      // Update tag: replace src with cid and ensure Outlook-compatible width
      let updatedTag = fullTag.replace(/src=["']([^"']+)["']/i, `src="cid:${contentId}"`);

      // Outlook Fix: word renderer ignores max-width and percentage widths on images
      // We inject a fixed width if possible
      if (!updatedTag.includes(' width=')) {
        const styleWidthMatch = updatedTag.match(/width:\s*(\d+)(px|%)/i);
        if (styleWidthMatch) {
          const val = styleWidthMatch[1];
          // if percent, we'll use 600 as base (standard container)
          const numericWidth =
            styleWidthMatch[2] === '%' ? Math.round(600 * (parseInt(val) / 100)) : val;
          updatedTag = updatedTag.replace('<img', `<img width="${numericWidth}"`);
        }
      }

      // Ensure display block for alignment
      if (!updatedTag.includes('display:')) {
        if (updatedTag.includes('style="')) {
          updatedTag = updatedTag.replace('style="', 'style="display:block;');
        } else {
          updatedTag = updatedTag.replace('<img', '<img style="display:block;"');
        }
      }

      next = next.replace(fullTag, updatedTag);
    }
    return { html: next, attachments };
  } catch (error) {
    console.error('Error processing:', error);
    return { html, attachments: [] };
  }
}

const result = _processImagesAndInlining(html);
console.log('Result HTML:', result.html);
console.log('Attachments:', result.attachments);
