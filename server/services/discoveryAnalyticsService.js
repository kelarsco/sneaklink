import { getPrisma } from '../config/postgres.js';
import { getAutomatedDiscoveryStatus } from './automatedDiscoveryService.js';
import { getContinuousScrapingStatus } from './continuousScrapingService.js';

/**
 * Discovery Analytics Service
 * 
 * Comprehensive monitoring and analytics for store discovery performance
 * and effectiveness tracking
 */

// Analytics configuration
const ANALYTICS_CONFIG = {
  // Metrics to track
  metrics: {
    discoveryRate: true,        // Stores discovered per hour
    verificationRate: true,      // Stores verified per hour
    successRate: true,          // Percentage of successful discoveries
    qualityScore: true,          // Average quality of discovered stores
    sourceEffectiveness: true,    // Which sources perform best
    geographicDistribution: true, // Distribution by country
    themeDistribution: true,      // Distribution by theme
    timeToVerify: true,         // Average time to verify stores
  },
  
  // Retention periods
  retention: {
    hourly: 24,    // Keep 24 hours of hourly data
    daily: 30,     // Keep 30 days of daily data
    weekly: 12,    // Keep 12 weeks of weekly data
    monthly: 24,    // Keep 24 months of monthly data
  },
  
  // Alert thresholds
  alerts: {
    lowDiscoveryRate: 5,        // Alert if < 5 stores/hour
    highErrorRate: 0.2,        // Alert if > 20% error rate
    lowQualityScore: 60,        // Alert if average quality < 60%
    sourceFailure: 0.5,          // Alert if source success rate < 50%
  }
};

/**
 * Get comprehensive discovery analytics
 */
export const getDiscoveryAnalytics = async (timeframe = '24h') => {
  console.log(`📊 Generating discovery analytics for timeframe: ${timeframe}`);
  
  try {
    const prisma = getPrisma();
    const now = new Date();
    
    // Calculate time range
    const timeRange = parseTimeframe(timeframe, now);
    
    // Get basic metrics
    const [
      totalStores,
      newStores,
      verifiedStores,
      activeStores,
      recentStores,
    ] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({
        where: {
          dateAdded: { gte: timeRange.start }
        }
      }),
      prisma.store.count({
        where: {
          verified: true,
          dateAdded: { gte: timeRange.start }
        }
      }),
      prisma.store.count({
        where: {
          isActive: true,
          dateAdded: { gte: timeRange.start }
        }
      }),
      prisma.store.count({
        where: {
          dateAdded: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      }),
    ]);
    
    // Get source distribution
    const sourceStats = await getSourceDistribution(timeRange);
    
    // Get quality metrics
    const qualityMetrics = await getQualityMetrics(timeRange);
    
    // Get geographic distribution
    const geoDistribution = await getGeographicDistribution(timeRange);
    
    // Get theme distribution
    const themeDistribution = await getThemeDistribution(timeRange);
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics(timeRange);
    
    // Get automated discovery status
    const automatedStatus = getAutomatedDiscoveryStatus();
    const scrapingStatus = getContinuousScrapingStatus();
    
    // Calculate derived metrics
    const discoveryRate = calculateDiscoveryRate(newStores, timeRange.duration);
    const verificationRate = calculateVerificationRate(verifiedStores, newStores, timeRange.duration);
    const successRate = calculateSuccessRate(activeStores, newStores);
    
    // Check for alerts
    const alerts = checkAlerts({
      discoveryRate,
      verificationRate,
      successRate,
      qualityScore: qualityMetrics.averageQuality,
      sourceStats,
    });
    
    const analytics = {
      timeframe,
      timestamp: now,
      duration: timeRange.duration,
      
      // Basic metrics
      metrics: {
        totalStores,
        newStores,
        verifiedStores,
        activeStores,
        recentStores,
        discoveryRate,
        verificationRate,
        successRate,
      },
      
      // Distribution analytics
      distribution: {
        sources: sourceStats,
        geographic: geoDistribution,
        themes: themeDistribution,
        quality: qualityMetrics,
      },
      
      // Performance metrics
      performance: performanceMetrics,
      
      // System status
      system: {
        automated: automatedStatus,
        scraping: scrapingStatus,
        uptime: process.uptime(),
      },
      
      // Alerts and recommendations
      alerts,
      recommendations: generateRecommendations(analytics),
    };
    
    console.log(`✅ Analytics generated successfully`);
    return analytics;
    
  } catch (error) {
    console.error('❌ Error generating discovery analytics:', error.message);
    throw error;
  }
};

/**
 * Get source distribution statistics
 */
async function getSourceDistribution(timeRange) {
  const prisma = getPrisma();
  
  try {
    const sourceData = await prisma.$queryRaw`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(CASE WHEN shopify_confidence > 0 THEN shopify_confidence ELSE 0 END) as avg_confidence,
        AVG(CASE WHEN is_active = true THEN 1 ELSE 0 END) as success_rate
      FROM stores 
      WHERE date_added >= ${timeRange.start}
      GROUP BY source
      ORDER BY count DESC
      LIMIT 20
    `;
    
    return sourceData.map(row => ({
      source: row.source,
      count: parseInt(row.count),
      avgConfidence: parseFloat(row.avg_confidence) || 0,
      successRate: parseFloat(row.success_rate) || 0,
    }));
  } catch (error) {
    console.error('Error getting source distribution:', error.message);
    return [];
  }
}

/**
 * Get quality metrics
 */
async function getQualityMetrics(timeRange) {
  const prisma = getPrisma();
  
  try {
    const qualityData = await prisma.$queryRaw`
      SELECT 
        AVG(shopify_confidence) as avg_confidence,
        AVG(CASE WHEN is_active = true THEN 1 ELSE 0 END) as avg_success_rate,
        AVG(CASE WHEN product_count > 0 THEN product_count ELSE 0 END) as avg_product_count,
        COUNT(CASE WHEN health_status = 'excellent' THEN 1 END) as excellent_count,
        COUNT(CASE WHEN health_status = 'good' THEN 1 END) as good_count,
        COUNT(CASE WHEN health_status = 'fair' THEN 1 END) as fair_count,
        COUNT(CASE WHEN health_status = 'poor' THEN 1 END) as poor_count
      FROM stores 
      WHERE date_added >= ${timeRange.start}
    `;
    
    const total = qualityData[0]?.excellent_count + qualityData[0]?.good_count + 
                 qualityData[0]?.fair_count + qualityData[0]?.poor_count || 0;
    
    return {
      averageQuality: qualityData[0]?.avg_confidence || 0,
      averageSuccessRate: qualityData[0]?.avg_success_rate || 0,
      averageProductCount: Math.round(qualityData[0]?.avg_product_count || 0),
      qualityDistribution: {
        excellent: qualityData[0]?.excellent_count || 0,
        good: qualityData[0]?.good_count || 0,
        fair: qualityData[0]?.fair_count || 0,
        poor: qualityData[0]?.poor_count || 0,
        total,
      },
    };
  } catch (error) {
    console.error('Error getting quality metrics:', error.message);
    return {
      averageQuality: 0,
      averageSuccessRate: 0,
      averageProductCount: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, total: 0 },
    };
  }
}

/**
 * Get geographic distribution
 */
async function getGeographicDistribution(timeRange) {
  const prisma = getPrisma();
  
  try {
    const geoData = await prisma.$queryRaw`
      SELECT 
        country,
        COUNT(*) as count
      FROM stores 
      WHERE date_added >= ${timeRange.start}
        AND country != 'Unknown'
      GROUP BY country
      ORDER BY count DESC
      LIMIT 15
    `;
    
    return geoData.map(row => ({
      country: row.country,
      count: parseInt(row.count),
    }));
  } catch (error) {
    console.error('Error getting geographic distribution:', error.message);
    return [];
  }
}

/**
 * Get theme distribution
 */
async function getThemeDistribution(timeRange) {
  const prisma = getPrisma();
  
  try {
    const themeData = await prisma.$queryRaw`
      SELECT 
        business_model as theme,
        COUNT(*) as count
      FROM stores 
      WHERE date_added >= ${timeRange.start}
        AND business_model != 'Unknown'
      GROUP BY business_model
      ORDER BY count DESC
      LIMIT 15
    `;
    
    return themeData.map(row => ({
      theme: row.theme,
      count: parseInt(row.count),
    }));
  } catch (error) {
    console.error('Error getting theme distribution:', error.message);
    return [];
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(timeRange) {
  const prisma = getPrisma();
  
  try {
    // Get verification times
    const verificationData = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (last_verified - date_added))) as avg_verification_time,
        MIN(EXTRACT(EPOCH FROM (last_verified - date_added))) as min_verification_time,
        MAX(EXTRACT(EPOCH FROM (last_verified - date_added))) as max_verification_time
      FROM stores 
      WHERE date_added >= ${timeRange.start}
        AND last_verified IS NOT NULL
    `;
    
    // Get error rates by source
    const errorData = await prisma.$queryRaw`
      SELECT 
        source,
        COUNT(CASE WHEN is_active = false THEN 1 END) as errors,
        COUNT(*) as total
      FROM stores 
      WHERE date_added >= ${timeRange.start}
      GROUP BY source
    `;
    
    const avgVerificationTime = verificationData[0]?.avg_verification_time || 0;
    const errorRates = errorData.map(row => ({
      source: row.source,
      errorRate: row.total > 0 ? (row.errors / row.total) : 0,
    }));
    
    return {
      averageVerificationTime: Math.round(avgVerificationTime),
      minVerificationTime: verificationData[0]?.min_verification_time || 0,
      maxVerificationTime: verificationData[0]?.max_verification_time || 0,
      errorRates,
      overallErrorRate: errorRates.reduce((sum, r) => sum + r.errorRate, 0) / errorRates.length,
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error.message);
    return {
      averageVerificationTime: 0,
      minVerificationTime: 0,
      maxVerificationTime: 0,
      errorRates: [],
      overallErrorRate: 0,
    };
  }
}

/**
 * Parse timeframe into start/end dates
 */
function parseTimeframe(timeframe, now) {
  const duration = parseTimeframeDuration(timeframe);
  const start = new Date(now.getTime() - duration);
  
  return { start, end: now, duration };
}

/**
 * Parse timeframe duration in milliseconds
 */
function parseTimeframeDuration(timeframe) {
  const match = timeframe.match(/(\d+)([hdwmy])/);
  if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours
  
  const [, amount, unit] = match;
  const value = parseInt(amount);
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    case 'y': return value * 365 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

/**
 * Calculate discovery rate
 */
function calculateDiscoveryRate(newStores, duration) {
  const hours = duration / (1000 * 60 * 60);
  return hours > 0 ? Math.round(newStores / hours * 10) / 10 : 0;
}

/**
 * Calculate verification rate
 */
function calculateVerificationRate(verifiedStores, newStores, duration) {
  const hours = duration / (1000 * 60 * 60);
  return newStores > 0 && hours > 0 ? Math.round((verifiedStores / newStores) * 100) : 0;
}

/**
 * Calculate success rate
 */
function calculateSuccessRate(activeStores, newStores) {
  return newStores > 0 ? Math.round((activeStores / newStores) * 100) : 0;
}

/**
 * Check for alerts
 */
function checkAlerts(metrics) {
  const alerts = [];
  
  // Low discovery rate alert
  if (metrics.discoveryRate < ANALYTICS_CONFIG.alerts.lowDiscoveryRate) {
    alerts.push({
      type: 'low_discovery_rate',
      severity: 'warning',
      message: `Discovery rate is low: ${metrics.discoveryRate} stores/hour`,
      threshold: ANALYTICS_CONFIG.alerts.lowDiscoveryRate,
    });
  }
  
  // High error rate alert
  if (metrics.performance.overallErrorRate > ANALYTICS_CONFIG.alerts.highErrorRate) {
    alerts.push({
      type: 'high_error_rate',
      severity: 'error',
      message: `Error rate is high: ${Math.round(metrics.performance.overallErrorRate * 100)}%`,
      threshold: ANALYTICS_CONFIG.alerts.highErrorRate,
    });
  }
  
  // Low quality score alert
  if (metrics.distribution.quality.averageQuality < ANALYTICS_CONFIG.alerts.lowQualityScore) {
    alerts.push({
      type: 'low_quality_score',
      severity: 'warning',
      message: `Average quality score is low: ${metrics.distribution.quality.averageQuality}%`,
      threshold: ANALYTICS_CONFIG.alerts.lowQualityScore,
    });
  }
  
  // Source failure alerts
  metrics.sourceStats.forEach(source => {
    if (source.successRate < ANALYTICS_CONFIG.alerts.sourceFailure) {
      alerts.push({
        type: 'source_failure',
        severity: 'warning',
        message: `Source ${source.source} has low success rate: ${Math.round(source.successRate * 100)}%`,
        source: source.source,
        successRate: source.successRate,
      });
    }
  });
  
  return alerts;
}

/**
 * Generate recommendations based on analytics
 */
function generateRecommendations(analytics) {
  const recommendations = [];
  
  // Discovery rate recommendations
  if (analytics.metrics.discoveryRate < 10) {
    recommendations.push({
      type: 'discovery_optimization',
      priority: 'high',
      title: 'Increase Discovery Rate',
      description: 'Consider enabling more discovery sources or increasing frequency',
      action: 'Review automated discovery schedules and source configuration',
    });
  }
  
  // Quality recommendations
  if (analytics.distribution.quality.averageQuality < 70) {
    recommendations.push({
      type: 'quality_improvement',
      priority: 'medium',
      title: 'Improve Store Quality',
      description: 'Average quality score is below optimal range',
      action: 'Enhance verification criteria and source filtering',
    });
  }
  
  // Source optimization recommendations
  const lowPerformingSources = analytics.distribution.sources.filter(s => s.successRate < 50);
  if (lowPerformingSources.length > 0) {
    recommendations.push({
      type: 'source_optimization',
      priority: 'medium',
      title: 'Optimize Underperforming Sources',
      description: `Sources with low success rates: ${lowPerformingSources.map(s => s.source).join(', ')}`,
      action: 'Review and update scraping methods for these sources',
    });
  }
  
  // Geographic coverage recommendations
  const topCountries = analytics.distribution.geographic.slice(0, 3);
  if (analytics.distribution.geographic.length < 10) {
    recommendations.push({
      type: 'geographic_expansion',
      priority: 'low',
      title: 'Expand Geographic Coverage',
      description: `Currently focused on: ${topCountries.map(c => c.country).join(', ')}`,
      action: 'Add more international discovery sources',
    });
  }
  
  return recommendations;
}

/**
 * Export analytics data
 */
export const exportAnalyticsData = async (format = 'json', timeframe = '24h') => {
  console.log(`📤 Exporting analytics data in ${format} format...`);
  
  try {
    const analytics = await getDiscoveryAnalytics(timeframe);
    
    switch (format.toLowerCase()) {
      case 'csv':
        return exportToCSV(analytics);
      case 'json':
        return analytics;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('❌ Error exporting analytics data:', error.message);
    throw error;
  }
};

/**
 * Export analytics to CSV format
 */
function exportToCSV(analytics) {
  const csvHeaders = [
    'timestamp',
    'totalStores',
    'newStores',
    'verifiedStores',
    'activeStores',
    'discoveryRate',
    'verificationRate',
    'successRate',
    'averageQuality',
  ];
  
  const csvRow = [
    analytics.timestamp.toISOString(),
    analytics.metrics.totalStores,
    analytics.metrics.newStores,
    analytics.metrics.verifiedStores,
    analytics.metrics.activeStores,
    analytics.metrics.discoveryRate,
    analytics.metrics.verificationRate,
    analytics.metrics.successRate,
    analytics.distribution.quality.averageQuality,
  ];
  
  return csvHeaders.join(',') + '\n' + csvRow.join(',');
}
