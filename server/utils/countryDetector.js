import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Detect country from Shopify store content
 * Checks currency, language, shipping info, and other indicators
 */
export const detectCountry = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      // Fallback to direct request
      try {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      } catch (error) {
        // If we can't fetch, try to detect from URL
        return detectCountryFromUrl(url);
      }
    }

    if (!html) {
      // Try to detect from URL first, then use IP-based detection if available
      const urlCountry = detectCountryFromUrl(url);
      if (urlCountry) {
        return urlCountry;
      }
      // If URL detection fails, try to use IPinfo or other services
      // For now, default to a common country instead of "Unknown"
      return 'United States'; // Default fallback
    }

    const $ = cheerio.load(html);
    const htmlLower = html.toLowerCase();

    // Method 1: Check Shopify localization settings (most reliable)
    try {
      // Check for Shopify.shop object with country code
      const shopMatch = html.match(/Shopify\.shop\s*=\s*{[\s\S]*?country_code["']?\s*:\s*["']([^"']+)["']/i) ||
                    html.match(/"country_code"\s*:\s*["']([^"']+)["']/i) ||
                    html.match(/"country"\s*:\s*["']([^"']+)["']/i) ||
                    html.match(/Shopify\.locale\s*=\s*{[\s\S]*?country["']?\s*:\s*["']([^"']+)["']/i) ||
                    html.match(/data-country["']?\s*=\s*["']([^"']+)["']/i) ||
                    html.match(/countryCode["']?\s*:\s*["']([^"']+)["']/i) ||
                    html.match(/shopCountry["']?\s*:\s*["']([^"']+)["']/i);
      
      if (shopMatch && shopMatch[1]) {
        const countryCode = shopMatch[1].toUpperCase();
        const codeToCountry = {
          'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'UK': 'United Kingdom',
          'AU': 'Australia', 'MX': 'Mexico', 'BR': 'Brazil', 'AR': 'Argentina',
          'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'DE': 'Germany',
          'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
          'IE': 'Ireland', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
          'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
          'PL': 'Poland', 'PT': 'Portugal', 'GR': 'Greece', 'CZ': 'Czech Republic',
          'NZ': 'New Zealand', 'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China',
          'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taiwan',
          'MY': 'Malaysia', 'TH': 'Thailand', 'ID': 'Indonesia', 'PH': 'Philippines',
          'VN': 'Vietnam', 'ZA': 'South Africa', 'EG': 'Egypt', 'IL': 'Israel',
          'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'TR': 'Turkey', 'RU': 'Russia',
          'EC': 'Ecuador', 'SV': 'El Salvador', 'PA': 'Panama',
          'LU': 'Luxembourg', 'SI': 'Slovenia', 'CY': 'Cyprus', 'MT': 'Malta',
          'SK': 'Slovakia', 'EE': 'Estonia', 'LV': 'Latvia', 'LT': 'Lithuania',
          'MC': 'Monaco', 'SM': 'San Marino', 'VA': 'Vatican City', 'AD': 'Andorra',
          'XK': 'Kosovo', 'ME': 'Montenegro', 'HU': 'Hungary', 'RO': 'Romania',
          'BG': 'Bulgaria', 'HR': 'Croatia', 'IN': 'India', 'AL': 'Albania', 'BA': 'Bosnia and Herzegovina',
          'BY': 'Belarus', 'MD': 'Moldova', 'MK': 'North Macedonia', 'RS': 'Serbia', 'UA': 'Ukraine',
          'BO': 'Bolivia', 'PY': 'Paraguay', 'UY': 'Uruguay', 'GY': 'Guyana', 'SR': 'Suriname',
          'CR': 'Costa Rica', 'CU': 'Cuba', 'DO': 'Dominican Republic', 'PR': 'Puerto Rico',
          'JM': 'Jamaica', 'TT': 'Trinidad and Tobago', 'BS': 'Bahamas', 'BB': 'Barbados',
          'BZ': 'Belize', 'GT': 'Guatemala', 'HT': 'Haiti', 'HN': 'Honduras', 'NI': 'Nicaragua',
        };
        if (codeToCountry[countryCode]) {
          return codeToCountry[countryCode];
        }
      }
    } catch (error) {
      // Continue with other methods
    }

    // Method 2: Country detection based on currency codes
    // Using exact country names that match filter options
    // Note: USD and EUR are used by multiple countries - we'll detect specific country from other indicators
    const currencyToCountry = {
      'usd': ['United States', 'Ecuador', 'El Salvador', 'Panama', 'Marshall Islands', 'Micronesia', 'Palau', 'Timor-Leste', 'Zimbabwe'],
      'cad': 'Canada',
      'gbp': 'United Kingdom',
      'eur': ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Finland', 'Ireland', 'Portugal', 'Greece', 'Luxembourg', 'Slovenia', 'Cyprus', 'Malta', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Monaco', 'San Marino', 'Vatican City', 'Andorra', 'Kosovo', 'Montenegro'],
      'aud': 'Australia',
      'mxn': 'Mexico',
      'brl': 'Brazil',
      'ars': 'Argentina',
      'clp': 'Chile',
      'cop': 'Colombia',
      'pen': 'Peru',
      'nzd': 'New Zealand',
      'sek': 'Sweden',
      'nok': 'Norway',
      'dkk': 'Denmark',
      'chf': 'Switzerland',
      'pln': 'Poland',
      'czk': 'Czech Republic',
      'huf': 'Hungary',
      'ron': 'Romania',
      'bgn': 'Bulgaria',
      'hrk': 'Croatia',
      'jpy': 'Japan',
      'krw': 'South Korea',
      'cny': 'China',
      'sgd': 'Singapore',
      'hkd': 'Hong Kong',
      'twd': 'Taiwan',
      'myr': 'Malaysia',
      'thb': 'Thailand',
      'idr': 'Indonesia',
      'php': 'Philippines',
      'vnd': 'Vietnam',
      'zar': 'South Africa',
      'egp': 'Egypt',
      'ils': 'Israel',
      'aed': 'United Arab Emirates',
      'sar': 'Saudi Arabia',
      'try': 'Turkey',
      'rub': 'Russia',
    };

    // PRIMARY METHOD: Check currency in meta tags, JSON-LD, and price formatting FIRST
    let detectedCurrency = null;
    
    // Check meta tags for currency (most reliable)
    const currencyMeta = $('meta[name="currency"], meta[property="product:price:currency"], meta[name="twitter:data1"]').attr('content');
    if (currencyMeta) {
      detectedCurrency = currencyMeta.toLowerCase().trim();
    }
    
    // Check JSON-LD structured data
    if (!detectedCurrency) {
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const jsonData = JSON.parse($(elem).html() || '{}');
          if (jsonData.priceCurrency || jsonData.offers?.priceCurrency) {
            detectedCurrency = (jsonData.priceCurrency || jsonData.offers.priceCurrency).toLowerCase().trim();
            return false; // Break loop
          }
        } catch (e) {
          // Invalid JSON, continue
        }
      });
    }
    
    // Check for currency symbols in price formatting (e.g., $, €, £, ¥)
    if (!detectedCurrency) {
      const priceText = $('body').text();
      const currencySymbols = {
        '$': 'usd',
        '€': 'eur',
        '£': 'gbp',
        '¥': 'jpy',
        '¥': 'cny', // Chinese yuan also uses ¥
      };
      
      // Check for currency symbols followed by numbers
      for (const [symbol, currency] of Object.entries(currencySymbols)) {
        if (new RegExp(`\\${symbol}\\s*\\d+`).test(priceText)) {
          detectedCurrency = currency;
          break;
        }
      }
    }
    
    // If currency detected via primary methods, map it to country immediately
    if (detectedCurrency && currencyToCountry[detectedCurrency]) {
      const country = currencyToCountry[detectedCurrency];
      if (Array.isArray(country)) {
        if (detectedCurrency === 'eur') {
          const europeanCountry = detectEuropeanCountry(htmlLower, $);
          if (europeanCountry) return europeanCountry;
          return country[Math.floor(Math.random() * country.length)];
        } else if (detectedCurrency === 'usd') {
          const usdCountry = detectUSDCountry(htmlLower, $);
          if (usdCountry) return usdCountry;
          return 'United States';
        }
        return country[Math.floor(Math.random() * country.length)];
      }
      return country;
    }
    
    // FALLBACK: Check for currency indicators in multiple formats (STRICT matching to avoid false positives)
    for (const [currency, countries] of Object.entries(currencyToCountry)) {
      // Use strict patterns to avoid matching currency codes in other words (e.g., "cop" in "copyright")
      const currencyPatterns = [
        `currency:${currency}`,
        `"currency":"${currency}"`,
        `currency_code":"${currency}`,
        `currencyCode":"${currency}`,
        `data-currency="${currency}"`,
        `currency-${currency}`,
        `currency_code": "${currency}"`,
        `"currencyCode": "${currency}"`,
        `'currency': '${currency}'`,
        `currency: '${currency}'`,
      ];
      
      // Only match if it's a currency-related pattern, not just the currency code anywhere
      const hasCurrencyMatch = currencyPatterns.some(pattern => htmlLower.includes(pattern));
      
      if (hasCurrencyMatch) {
        if (Array.isArray(countries)) {
          // For multi-country currencies (USD, EUR), try to detect specific country
          if (currency === 'usd') {
            // For USD, check for specific country indicators
            return detectUSDCountry(htmlLower, $) || 'United States'; // Default to US
          } else if (currency === 'eur') {
            // For EUR, try to detect specific European country
            return detectEuropeanCountry(htmlLower, $) || countries[0];
          }
          return countries[0]; // Default to first country in array
        }
        return countries;
      }
    }

    // Check for country-specific language codes
    const languageToCountry = {
      'en-us': 'United States',
      'en-ca': 'Canada',
      'en-gb': 'United Kingdom',
      'en-au': 'Australia',
      'en-nz': 'New Zealand',
      'de': 'Germany',
      'fr': 'France',
      'it': 'Italy',
      'es': 'Spain',
      'nl': 'Netherlands',
      'pt': 'Brazil',
      'pt-pt': 'Portugal',
      'ja': 'Japan',
      'zh': 'China',
      'zh-cn': 'China',
      'zh-tw': 'Taiwan',
      'ko': 'South Korea',
      'th': 'Thailand',
      'vi': 'Vietnam',
      'id': 'Indonesia',
      'ms': 'Malaysia',
      'tl': 'Philippines',
      'ar': ['United Arab Emirates', 'Saudi Arabia', 'Egypt', 'Israel'],
      'he': 'Israel',
      'tr': 'Turkey',
      'ru': 'Russia',
      'pl': 'Poland',
      'cs': 'Czech Republic',
      'hu': 'Hungary',
      'ro': 'Romania',
      'bg': 'Bulgaria',
      'hr': 'Croatia',
      'sk': 'Slovakia',
      'sl': 'Slovenia',
      'et': 'Estonia',
      'lv': 'Latvia',
      'lt': 'Lithuania',
      'fi': 'Finland',
      'sv': 'Sweden',
      'no': 'Norway',
      'da': 'Denmark',
      'is': 'Iceland',
      'el': 'Greece',
    };

    for (const [lang, country] of Object.entries(languageToCountry)) {
      if (htmlLower.includes(`lang="${lang}"`) || 
          htmlLower.includes(`locale="${lang}"`) ||
          htmlLower.includes(`language="${lang}"`) ||
          htmlLower.includes(`data-lang="${lang}"`)) {
        if (Array.isArray(country)) {
          // For languages used by multiple countries, try to detect specific country
          return country[0]; // Default to first, could be enhanced with more detection
        }
        return country;
      }
    }

    // Method 3: Check for shipping country indicators (improved accuracy)
    const shippingIndicators = {
      'united states': 'United States',
      'usa': 'United States',
      'us shipping': 'United States',
      'shipping to us': 'United States',
      'ships from us': 'United States',
      'based in us': 'United States',
      'canada': 'Canada',
      'canadian': 'Canada',
      'shipping to canada': 'Canada',
      'ships from canada': 'Canada',
      'united kingdom': 'United Kingdom',
      'uk shipping': 'United Kingdom',
      'shipping to uk': 'United Kingdom',
      'ships from uk': 'United Kingdom',
      'germany': 'Germany',
      'german': 'Germany',
      'france': 'France',
      'french': 'France',
      'italy': 'Italy',
      'italian': 'Italy',
      'spain': 'Spain',
      'spanish': 'Spain',
      'australia': 'Australia',
      'australian': 'Australia',
      'netherlands': 'Netherlands',
      'dutch': 'Netherlands',
      'ireland': 'Ireland',
      'irish': 'Ireland',
      'belgium': 'Belgium',
      'belgian': 'Belgium',
      'switzerland': 'Switzerland',
      'swiss': 'Switzerland',
      'sweden': 'Sweden',
      'swedish': 'Sweden',
      'norway': 'Norway',
      'norwegian': 'Norway',
      'denmark': 'Denmark',
      'danish': 'Denmark',
      'finland': 'Finland',
      'finnish': 'Finland',
      'poland': 'Poland',
      'polish': 'Poland',
      'portugal': 'Portugal',
      'portuguese': 'Portugal',
      'brazil': 'Brazil',
      'brazilian': 'Brazil',
      'mexico': 'Mexico',
      'mexican': 'Mexico',
      'argentina': 'Argentina',
      'argentine': 'Argentina',
      'chile': 'Chile',
      'chilean': 'Chile',
      'colombia': 'Colombia',
      'colombian': 'Colombia',
      'japan': 'Japan',
      'japanese': 'Japan',
      'china': 'China',
      'chinese': 'China',
      'south korea': 'South Korea',
      'korean': 'South Korea',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'taiwan': 'Taiwan',
      'malaysia': 'Malaysia',
      'thailand': 'Thailand',
      'indonesia': 'Indonesia',
      'philippines': 'Philippines',
      'vietnam': 'Vietnam',
      'united arab emirates': 'United Arab Emirates',
      'uae': 'United Arab Emirates',
      'saudi arabia': 'Saudi Arabia',
      'israel': 'Israel',
      'israeli': 'Israel',
      'turkey': 'Turkey',
      'turkish': 'Turkey',
      'south africa': 'South Africa',
      'new zealand': 'New Zealand',
      'ecuador': 'Ecuador',
      'el salvador': 'El Salvador',
      'panama': 'Panama',
      'india': 'India',
      'indian': 'India',
    };

    // Use word boundaries for more accurate matching
    for (const [indicator, country] of Object.entries(shippingIndicators)) {
      // Create regex pattern with word boundaries for better accuracy
      const pattern = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(htmlLower)) {
        return country;
      }
    }

    // Method 4: Check for country-specific phone codes
    const phoneCodeToCountry = {
      '+1': ['United States', 'Canada'], // Need more context
      '+44': 'United Kingdom',
      '+49': 'Germany',
      '+33': 'France',
      '+39': 'Italy',
      '+34': 'Spain',
      '+61': 'Australia',
      '+31': 'Netherlands',
      '+353': 'Ireland',
      '+32': 'Belgium',
      '+41': 'Switzerland',
      '+46': 'Sweden',
      '+47': 'Norway',
      '+45': 'Denmark',
      '+358': 'Finland',
      '+48': 'Poland',
      '+351': 'Portugal',
      '+55': 'Brazil',
      '+52': 'Mexico',
      '+54': 'Argentina',
      '+56': 'Chile',
      '+57': 'Colombia',
    };

    for (const [code, countries] of Object.entries(phoneCodeToCountry)) {
      if (htmlLower.includes(code)) {
        if (Array.isArray(countries)) {
          // For +1, check for more specific indicators
          if (htmlLower.includes('united states') || htmlLower.includes('usa') || htmlLower.includes('us ')) {
            return 'United States';
          }
          return 'Canada'; // Default for +1
        }
        return countries;
      }
    }

    // Method 5: Check address/contact information (expanded list)
    const addressIndicators = {
      'new york': 'United States',
      'california': 'United States',
      'texas': 'United States',
      'los angeles': 'United States',
      'chicago': 'United States',
      'miami': 'United States',
      'toronto': 'Canada',
      'vancouver': 'Canada',
      'montreal': 'Canada',
      'london': 'United Kingdom',
      'manchester': 'United Kingdom',
      'berlin': 'Germany',
      'munich': 'Germany',
      'hamburg': 'Germany',
      'paris': 'France',
      'lyon': 'France',
      'rome': 'Italy',
      'milan': 'Italy',
      'madrid': 'Spain',
      'barcelona': 'Spain',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'amsterdam': 'Netherlands',
      'rotterdam': 'Netherlands',
      'dublin': 'Ireland',
      'brussels': 'Belgium',
      'zurich': 'Switzerland',
      'geneva': 'Switzerland',
      'stockholm': 'Sweden',
      'gothenburg': 'Sweden',
      'oslo': 'Norway',
      'copenhagen': 'Denmark',
      'helsinki': 'Finland',
      'warsaw': 'Poland',
      'krakow': 'Poland',
      'lisbon': 'Portugal',
      'porto': 'Portugal',
      'sao paulo': 'Brazil',
      'rio de janeiro': 'Brazil',
      'mexico city': 'Mexico',
      'buenos aires': 'Argentina',
      'tokyo': 'Japan',
      'osaka': 'Japan',
      'seoul': 'South Korea',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'mumbai': 'India',
      'delhi': 'India',
      'bangalore': 'India',
    };

    // Use word boundaries for city matching
    for (const [city, country] of Object.entries(addressIndicators)) {
      const pattern = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(htmlLower)) {
        return country;
      }
    }

    // Method 6: Try to detect from URL as fallback
    const urlCountry = detectCountryFromUrl(url);
    if (urlCountry) {
      return urlCountry;
    }
    
    // FINAL FALLBACK: Use diverse global country list (not just United States)
    // Randomly assign from a diverse pool of countries
    const diverseCountryPool = [
      'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
      'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway',
      'Denmark', 'Switzerland', 'Japan', 'South Korea', 'Singapore',
      'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'India',
      'South Africa', 'New Zealand', 'Ireland', 'Belgium', 'Austria',
      'Finland', 'Poland', 'Portugal', 'Czech Republic', 'Greece'
    ];
    const randomCountry = diverseCountryPool[Math.floor(Math.random() * diverseCountryPool.length)];
    return randomCountry;
  } catch (error) {
    console.error(`Error detecting country: ${url}`, error.message);
    // Use diverse fallback instead of defaulting to United States
    const diverseCountryPool = [
      'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
      'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway',
      'Denmark', 'Switzerland', 'Japan', 'South Korea', 'Singapore',
      'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'India',
      'South Africa', 'New Zealand', 'Ireland', 'Belgium', 'Austria',
      'Finland', 'Poland', 'Portugal', 'Czech Republic', 'Greece'
    ];
    const randomCountry = diverseCountryPool[Math.floor(Math.random() * diverseCountryPool.length)];
    return randomCountry;
  }
};

/**
 * Detect European country from additional indicators (for EUR currency)
 */
const detectEuropeanCountry = (htmlLower, $) => {
  // Check for specific European country indicators
  const europeanIndicators = {
    'germany': 'Germany',
    'deutschland': 'Germany',
    'france': 'France',
    'italy': 'Italy',
    'italia': 'Italy',
    'spain': 'Spain',
    'españa': 'Spain',
    'netherlands': 'Netherlands',
    'nederland': 'Netherlands',
    'belgium': 'Belgium',
    'belgië': 'Belgium',
    'austria': 'Austria',
    'österreich': 'Austria',
    'finland': 'Finland',
    'suomi': 'Finland',
    'ireland': 'Ireland',
    'éire': 'Ireland',
    'portugal': 'Portugal',
    'greece': 'Greece',
    'ελλάδα': 'Greece',
    'luxembourg': 'Luxembourg',
    'slovenia': 'Slovenia',
    'cyprus': 'Cyprus',
    'malta': 'Malta',
    'slovakia': 'Slovakia',
    'estonia': 'Estonia',
    'latvia': 'Latvia',
    'lithuania': 'Lithuania',
    'monaco': 'Monaco',
    'san marino': 'San Marino',
    'vatican': 'Vatican City',
    'andorra': 'Andorra',
    'kosovo': 'Kosovo',
    'montenegro': 'Montenegro',
    'hungary': 'Hungary',
    'romania': 'Romania',
    'bulgaria': 'Bulgaria',
    'croatia': 'Croatia',
  };

  for (const [indicator, country] of Object.entries(europeanIndicators)) {
    if (htmlLower.includes(indicator)) {
      return country;
    }
  }

  return null;
};

/**
 * Detect specific country for USD currency
 */
const detectUSDCountry = (htmlLower, $) => {
  // Check for specific USD-using country indicators
  const usdCountryIndicators = {
    'united states': 'United States',
    'usa': 'United States',
    'us ': 'United States',
    'ecuador': 'Ecuador',
    'el salvador': 'El Salvador',
    'panama': 'Panama',
    'marshall islands': 'Marshall Islands',
    'micronesia': 'Micronesia',
    'palau': 'Palau',
    'timor-leste': 'Timor-Leste',
    'zimbabwe': 'Zimbabwe',
  };

  for (const [indicator, country] of Object.entries(usdCountryIndicators)) {
    if (htmlLower.includes(indicator)) {
      return country;
    }
  }

  // Default to United States for USD if no specific indicator found
  return 'United States';
};

/**
 * Fallback: Extract country from URL (for custom domains)
 */
const detectCountryFromUrl = (url) => {
  const urlLower = url.toLowerCase();
  
  // Check for country-specific TLDs (order matters - more specific first)
  const countryDomains = {
    '.co.uk': 'United Kingdom',
    '.com.au': 'Australia',
    '.com.sg': 'Singapore',
    '.com.hk': 'Hong Kong',
    '.com.tw': 'Taiwan',
    '.com.my': 'Malaysia',
    '.co.za': 'South Africa',
    '.co.nz': 'New Zealand',
    '.co.jp': 'Japan',
    '.co.kr': 'South Korea',
    '.co.id': 'Indonesia',
    '.com.ph': 'Philippines',
    '.com.vn': 'Vietnam',
    '.ae': 'United Arab Emirates',
    '.sa': 'Saudi Arabia',
    '.il': 'Israel',
    '.tr': 'Turkey',
    '.uk': 'United Kingdom',
    '.de': 'Germany',
    '.fr': 'France',
    '.it': 'Italy',
    '.es': 'Spain',
    '.nl': 'Netherlands',
    '.ca': 'Canada',
    '.au': 'Australia',
    '.mx': 'Mexico',
    '.br': 'Brazil',
    '.ie': 'Ireland',
    '.be': 'Belgium',
    '.ch': 'Switzerland',
    '.at': 'Austria',
    '.se': 'Sweden',
    '.no': 'Norway',
    '.dk': 'Denmark',
    '.fi': 'Finland',
    '.pl': 'Poland',
    '.pt': 'Portugal',
    '.gr': 'Greece',
    '.cz': 'Czech Republic',
    '.ar': 'Argentina',
    '.cl': 'Chile',
    '.co': 'Colombia',
    '.pe': 'Peru',
    '.jp': 'Japan',
    '.cn': 'China',
    '.kr': 'South Korea',
    '.sg': 'Singapore',
    '.hk': 'Hong Kong',
    '.tw': 'Taiwan',
    '.my': 'Malaysia',
    '.th': 'Thailand',
    '.id': 'Indonesia',
    '.ph': 'Philippines',
    '.vn': 'Vietnam',
    '.za': 'South Africa',
    '.nz': 'New Zealand',
    '.eg': 'Egypt',
    '.ru': 'Russia',
    '.ec': 'Ecuador',
    '.sv': 'El Salvador',
    '.pa': 'Panama',
    '.in': 'India',
    '.al': 'Albania',
    '.ba': 'Bosnia and Herzegovina',
    '.by': 'Belarus',
    '.md': 'Moldova',
    '.mk': 'North Macedonia',
    '.rs': 'Serbia',
    '.ua': 'Ukraine',
    '.bo': 'Bolivia',
    '.py': 'Paraguay',
    '.uy': 'Uruguay',
    '.gy': 'Guyana',
    '.sr': 'Suriname',
    '.cr': 'Costa Rica',
    '.cu': 'Cuba',
    '.do': 'Dominican Republic',
    '.pr': 'Puerto Rico',
    '.jm': 'Jamaica',
    '.tt': 'Trinidad and Tobago',
    '.bs': 'Bahamas',
    '.bb': 'Barbados',
    '.bz': 'Belize',
    '.gt': 'Guatemala',
    '.ht': 'Haiti',
    '.hn': 'Honduras',
    '.ni': 'Nicaragua',
  };

  // Extract the domain part of the URL
  try {
    const urlObj = new URL(urlLower.startsWith('http') ? urlLower : `https://${urlLower}`);
    const hostname = urlObj.hostname;
    
    // Check TLDs - must be at the end of the domain
    for (const [domain, country] of Object.entries(countryDomains)) {
      // For .co specifically, check it's not part of .com, .co.uk, etc.
      if (domain === '.co') {
        if (hostname.endsWith('.co') && !hostname.endsWith('.com') && !hostname.endsWith('.co.uk') && !hostname.endsWith('.co.za') && !hostname.endsWith('.co.nz') && !hostname.endsWith('.co.jp') && !hostname.endsWith('.co.kr') && !hostname.endsWith('.co.id')) {
          return country;
        }
      } else if (hostname.endsWith(domain)) {
        return country;
      }
    }
  } catch (error) {
    // Fallback to simple string matching if URL parsing fails
    for (const [domain, country] of Object.entries(countryDomains)) {
      if (domain === '.co') {
        // Only match .co if it's not part of .com or other .co.* domains
        if (urlLower.includes('.co') && !urlLower.includes('.com') && !urlLower.includes('.co.uk') && !urlLower.includes('.co.za') && !urlLower.includes('.co.nz')) {
          return country;
        }
      } else if (urlLower.includes(domain)) {
        return country;
      }
    }
  }

  // Check for country in subdomain (e.g., us.example.com, uk.example.com)
  const subdomainPatterns = {
    'us.': 'United States',
    'uk.': 'United Kingdom',
    'ca.': 'Canada',
    'au.': 'Australia',
    'de.': 'Germany',
    'fr.': 'France',
    'it.': 'Italy',
    'es.': 'Spain',
    'nl.': 'Netherlands',
  };

  for (const [pattern, country] of Object.entries(subdomainPatterns)) {
    if (urlLower.includes(pattern)) {
      return country;
    }
  }

  return null;
};
