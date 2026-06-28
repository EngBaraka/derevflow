'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const ALLOWED_ORIGINS = [
  /^https:\/\/developers\.deriv\.com$/,
  /^https:\/\/staging-developers\.deriv\.com$/,
  /^https:\/\/.*\.deriv-api-v2\.pages\.dev$/,
  /^http:\/\/localhost:\d+$/,
];

/** Convert a #rrggbb hex string to a space-separated RGB triplet. */
function hexToRgbVars(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

/**
 * Shared hook for template preview routes.
 * Posts PREVIEW_READY to the parent frame on mount, then listens for
 * PREVIEW_BRANDING messages and applies primaryColor, fontFamily,
 * logoDataUrl, and theme.
 * Origin is validated against ALLOWED_ORIGINS before any state is applied.
 *
 * fontFamily is returned as React state so preview pages can apply it via
 * a next/font className on a wrapper element — no direct DOM mutation.
 */
export function usePreviewBranding() {
  const [logoSrc, setLogoSrc] = useState<string | undefined>();
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [appName, setAppName] = useState<string | undefined>();
  const { setTheme } = useTheme();

  useEffect(() => {
    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.some((r) => r.test(event.origin))) return;
      if (event.data?.type !== 'PREVIEW_BRANDING') return;

      const { primaryColor, fontFamily, logoDataUrl, theme, appName } =
        event.data as {
          primaryColor?: unknown;
          fontFamily?: unknown;
          logoDataUrl?: unknown;
          theme?: unknown;
          appName?: unknown;
        };

      if (primaryColor && typeof primaryColor === 'string') {
        const rgb = hexToRgbVars(primaryColor);
        if (rgb) document.documentElement.style.setProperty('--primary', rgb);
      }

      if (fontFamily && typeof fontFamily === 'string') {
        setFontFamily(fontFamily);
      }

      if (typeof logoDataUrl === 'string') {
        if (/^data:image\/(png|jpe?g|webp);base64,/.test(logoDataUrl)) {
          setLogoSrc(logoDataUrl);
        }
      } else if (logoDataUrl === null) {
        // Explicitly cleared — remove the logo from the preview
        setLogoSrc(undefined);
      }

      if (theme === 'dark' || theme === 'light') {
        setTheme(theme);
      }

      if (appName && typeof appName === 'string') {
        setAppName(appName);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setTheme]);

  return { logoSrc, fontFamily, appName };
}
