import React, { useEffect, useRef, useState } from 'react';

// Lightweight wrapper around Unlayer (Beefree-like) editor loaded via script
export default function BeeLikeEditor({ initialDesign, onReady, onChange }) {
  const containerRef = useRef(null);
  const containerIdRef = useRef(`bee-like-editor-${Math.random().toString(36).slice(2)}`);
  const [ready, setReady] = useState(false);

  // Initialize editor once
  useEffect(() => {
    const ensureScript = () => new Promise((resolve) => {
      if (window.unlayer) return resolve();
      const s = document.createElement('script');
      s.src = 'https://editor.unlayer.com/embed.js';
      s.async = true;
      s.onload = () => resolve();
      document.body.appendChild(s);
    });

    let cancelled = false;
    let detachHandlers = () => {};

    ensureScript().then(() => {
      if (cancelled || !containerRef.current) return;

      // Prevent multiple inits if already initialized (e.g., StrictMode/double render)
      // Ensure previous instance is cleared
      try { window.unlayer?.destroy?.(); } catch {}
      window.__beeEditorInitialized = false;

      window.unlayer.init({
        id: containerIdRef.current,
        displayMode: 'email',
        projectId: 0,
        appearance: { theme: 'light', panels: { tools: { dock: 'right' } } },
        features: { stockImages: true, undoRedo: true },
        // Fix permissions policy violations
        iframe: {
          sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
        }
      });

      window.unlayer.addEventListener('editor:ready', () => {
        if (cancelled) return;
        window.__beeEditorInitialized = true;
        try {
          const token = localStorage.getItem('token') || '';
          window.unlayer.setImageUploadURL('/api/templates/media/upload');
          window.unlayer.setImageUploadMethod('POST');
          window.unlayer.setImageUploadHeaders({ 'Authorization': `Bearer ${token}` });
        } catch {}
        setReady(true);
        onReady?.({
          exportHtml: (cb) => window.unlayer.exportHtml(cb),
          exportDesign: (cb) => window.unlayer.exportDesign(cb),
          loadDesign: (d) => window.unlayer.loadDesign(d),
        });

        // Attach change listeners and immediately emit current state
        const emit = () => {
          try {
            window.unlayer.exportDesign((design) => {
              window.unlayer.exportHtml((data) => {
                onChange?.(data?.html || '', design || null);
              });
            });
          } catch {}
        };

        // Unlayer editor events that fire on updates
        window.unlayer.addEventListener('design:updated', emit);
        window.unlayer.addEventListener('content:updated', emit);
        window.unlayer.addEventListener('image:uploaded', emit);

        // Emit once after ready so external state is populated
        emit();

        // Detacher for cleanup
        detachHandlers = () => {
          try {
            window.unlayer.removeEventListener('design:updated', emit);
            window.unlayer.removeEventListener('content:updated', emit);
            window.unlayer.removeEventListener('image:uploaded', emit);
          } catch {}
        };
      });
    });

    return () => {
      cancelled = true;
      try { detachHandlers(); } catch {}
      // Destroy editor on unmount to avoid stacked instances
      try { window.unlayer?.destroy?.(); } catch {}
      window.__beeEditorInitialized = false;
    };
  }, [onReady, onChange]);

  // Load design only once after ready, if provided
  useEffect(() => {
    if (!ready) return;
    if (initialDesign) {
      try { window.unlayer.loadDesign(initialDesign); } catch {}
    }
    // do not re-run for initialDesign changes to avoid reloading mid-edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div id={containerIdRef.current} ref={containerRef} style={{ height: 600, border: '1px solid #e0e0e0', borderRadius: 8 }} />
  );
}


