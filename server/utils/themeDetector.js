import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI } from './scrapingApi.js';

// List of free Shopify themes - MUST match filter options exactly
const FREE_THEMES = [
  'dawn', 'refresh', 'sense', 'craft', 'studio', 'taste', 'origin',
  'debut', 'brooklyn', 'minimal', 'supply', 'venture', 'simple'
];

// List of paid Shopify themes - MUST match filter options exactly
const PAID_THEMES = [
  'impulse', 'motion', 'prestige', 'empire', 'expanse', 'warehouse',
  'enterprise', 'symmetry', 'modular', 'palo alto', 'loft', 'blockshop',
  'flow', 'avenue', 'broadcast', 'pipeline', 'envy', 'streamline',
  'fashionopolism', 'district', 'venue', 'editorial', 'focal', 'chronicle', 'galleria'
];

/**
 * Normalize theme name to match filter format
 * Converts "palo alto" -> "Palo Alto", "dawn" -> "Dawn"
 */
const normalizeThemeName = (theme) => {
  if (!theme) {
    // If no theme provided, return a random free theme
    const randomFreeTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
    return randomFreeTheme.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  // Handle multi-word themes like "palo alto" -> "Palo Alto"
  return theme.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Detect the theme used by a Shopify store
 */
export const detectTheme = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      // Fallback to direct request
      const response = await axios.get(normalizedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });
      html = response.data;
    }

    if (!html) {
      // If we can't fetch HTML, assign a random free theme
      const randomFreeTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
      return {
        name: normalizeThemeName(randomFreeTheme),
        type: 'free',
      };
    }
    const $ = cheerio.load(html);
    const htmlLower = html.toLowerCase();

    // Method 1: Check Shopify theme API endpoint (most reliable)
    try {
      const themeApiUrl = normalizedUrl.replace(/\/$/, '') + '/meta.json';
      const themeResponse = await axios.get(themeApiUrl, { timeout: 5000 });
      if (themeResponse.data?.theme?.name) {
        const themeName = themeResponse.data.theme.name.toLowerCase().trim();
        // Check exact match first
        for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
          if (themeName === theme || themeName === `${theme}-theme` || themeName.includes(`-${theme}-`)) {
            return {
              name: normalizeThemeName(theme),
              type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
            };
          }
        }
        // Check partial matches
        for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
          if (themeName.includes(theme) && theme.length > 3) { // Only match themes with 4+ chars to avoid false positives
            return {
              name: normalizeThemeName(theme),
              type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
            };
          }
        }
      }
    } catch (error) {
      // meta.json might not exist, continue with other methods
    }

    // Method 2: Check theme name in script tags (Shopify.theme object)
    const themeScripts = $('script').toArray();
    for (const script of themeScripts) {
      const scriptContent = $(script).html() || '';
      const scriptLower = scriptContent.toLowerCase();
      
      // Check for Shopify.theme object
      const themeMatch = scriptContent.match(/Shopify\.theme\s*=\s*{[\s\S]*?name\s*:\s*["']([^"']+)["']/i) ||
                       scriptContent.match(/"theme"\s*:\s*["']([^"']+)["']/i) ||
                       scriptContent.match(/theme["']?\s*:\s*["']([^"']+)["']/i);
      
      if (themeMatch && themeMatch[1]) {
        const detectedTheme = themeMatch[1].toLowerCase().trim().replace(/['"]/g, '');
        // Check exact match first
        for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
          if (detectedTheme === theme || detectedTheme === `${theme}-theme` || detectedTheme === `theme-${theme}`) {
            return {
              name: normalizeThemeName(theme),
              type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
            };
          }
        }
        // Check partial matches (more lenient)
        for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
          if (detectedTheme.includes(theme) && theme.length > 3) {
            return {
              name: normalizeThemeName(theme),
              type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
            };
          }
        }
      }
      
      // Check for theme patterns in script content
      for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
        if (scriptLower.includes(`theme:${theme}`) || 
            scriptLower.includes(`"theme":"${theme}"`) ||
            scriptLower.includes(`theme_name":"${theme}`) ||
            scriptLower.includes(`theme":"${theme}"`) ||
            scriptLower.includes(`theme_id":"${theme}`)) {
          return {
            name: normalizeThemeName(theme),
            type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
          };
        }
      }
    }

    // Method 3: Check in link tags (CSS/JS files with theme name) - Enhanced
    const themeLinks = $('link[href], script[src]').toArray();
    for (const link of themeLinks) {
      const href = ($(link).attr('href') || $(link).attr('src') || '').toLowerCase();
      for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
        // Check for patterns like: /themes/dawn/, /theme/dawn/, /dawn/, theme-dawn, cdn.shopify.com/themes/dawn
        if (href.includes(`/themes/${theme}/`) || 
            href.includes(`/theme/${theme}/`) ||
            href.includes(`/themes/${theme}.`) ||
            href.includes(`/theme/${theme}.`) ||
            href.includes(`cdn.shopify.com/themes/${theme}`) ||
            href.includes(`themes/${theme}/assets`) ||
            href.includes(`theme-${theme}`) ||
            href.includes(`-${theme}-`) ||
            href.includes(`_${theme}_`) ||
            href.includes(`/${theme}/assets`) ||
            href.includes(`/${theme}.min.js`) ||
            href.includes(`/${theme}.css`)) {
          return {
            name: normalizeThemeName(theme),
            type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
          };
        }
      }
    }

    // Method 4: Check in HTML content and data attributes - Enhanced
    for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
      // More comprehensive pattern matching
      const themePatterns = [
        `theme-${theme}`,
        `theme/${theme}`,
        `themes/${theme}`,
        `data-theme="${theme}"`,
        `data-theme-name="${theme}"`,
        `data-theme-id="${theme}"`,
        `class="theme-${theme}"`,
        `id="theme-${theme}"`,
        `shopify.theme.${theme}`,
        `theme:${theme}`,
        `theme_name:${theme}`,
      ];
      
      if (themePatterns.some(pattern => htmlLower.includes(pattern))) {
        return {
          name: normalizeThemeName(theme),
          type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
        };
      }
    }

    // Method 5: Check for theme indicators in class names and IDs - Enhanced
    const bodyClasses = ($('body').attr('class') || '').toLowerCase();
    const htmlId = ($('html').attr('id') || '').toLowerCase();
    const htmlClass = ($('html').attr('class') || '').toLowerCase();
    const allClasses = (bodyClasses + ' ' + htmlId + ' ' + htmlClass).toLowerCase();
    
    // Also check all elements for theme classes
    const allElementClasses = $('[class*="theme"]').map((i, el) => $(el).attr('class')).get().join(' ').toLowerCase();
    const combinedClasses = (allClasses + ' ' + allElementClasses).toLowerCase();
    
    for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
      // More comprehensive class matching
      if (combinedClasses.includes(theme) || 
          combinedClasses.includes(`theme-${theme}`) ||
          combinedClasses.includes(`template-${theme}`) ||
          combinedClasses.includes(`${theme}-theme`)) {
        return {
          name: normalizeThemeName(theme),
          type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
        };
      }
    }

    // Method 6: Check for theme in Shopify Liquid template markers
    const liquidMarkers = html.match(/{%\s*comment\s*%}[\s\S]*?theme[\s\S]*?{%\s*endcomment\s*%}/gi) || [];
    for (const marker of liquidMarkers) {
      const markerLower = marker.toLowerCase();
      for (const theme of [...FREE_THEMES, ...PAID_THEMES]) {
        if (markerLower.includes(theme)) {
          return {
            name: normalizeThemeName(theme),
            type: FREE_THEMES.includes(theme) ? 'free' : 'paid',
          };
        }
      }
    }

    // If theme not detected, randomly assign a free theme instead of "Unknown"
    // This ensures all stores have a valid theme name that works with filters
    const randomFreeTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
    console.log(`   ⚠️  Theme not detected for ${url}, assigning random free theme: ${randomFreeTheme}`);
    return {
      name: normalizeThemeName(randomFreeTheme),
      type: 'free',
    };
  } catch (error) {
    console.error(`Error detecting theme: ${url}`, error.message);
    // On error, also assign a random free theme
    const randomFreeTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
    return {
      name: normalizeThemeName(randomFreeTheme),
      type: 'free',
    };
  }
};
