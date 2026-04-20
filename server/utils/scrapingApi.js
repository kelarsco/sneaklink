/**
 * Simple HTML fetching utility
 * Replaces the old complex scraping API wrapper
 * Provides basic HTML fetching functionality
 */

import axios from 'axios';

/**
 * Get HTML content from a URL
 * @param {string} url - URL to fetch
 * @param {Object} options - Optional fetch options
 * @returns {Promise<string>} - HTML content
 */
export const getHTMLWithAPI = async (url, options = {}) => {
  try {
    const response = await axios.get(url, {
      timeout: options.timeout || 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...options.headers,
      },
      ...options,
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error.message);
    throw error;
  }
};

/**
 * Scrape with API (alias for getHTMLWithAPI for backward compatibility)
 */
export const scrapeWithAPI = getHTMLWithAPI;

