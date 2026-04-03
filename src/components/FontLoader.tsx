import { useEffect } from 'react';

interface FontLoaderProps {
  font?: string;
}

const PRELOADED_FONTS = ['Inter', 'Montserrat', 'Poppins', 'Roboto', 'Sans-serif', 'Serif'];

/**
 * Dynamically loads a Google Font if it's not already in the main bundle.
 */
export function FontLoader({ font }: FontLoaderProps) {
  useEffect(() => {
    if (!font || PRELOADED_FONTS.includes(font)) return;

    const fontId = `google-font-${font.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(fontId)) return;

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    const formattedFont = font.replace(/\s+/g, '+');
    // Important: display=swap ensures fallback font is visible immediately
    link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@400;700&display=swap`;
    
    document.head.appendChild(link);
  }, [font]);

  return null;
}
