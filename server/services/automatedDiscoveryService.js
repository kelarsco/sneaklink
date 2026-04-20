import cron from 'node-cron';
import { runContinuousScrapingJob, getContinuousScrapingStatus } from './continuousScrapingService.js';
import { getPrisma } from '../config/postgres.js';

/**
 * Automated Discovery Service
 * 
 * This service runs comprehensive store discovery automatically
 * on different schedules for maximum coverage and efficiency
 */

// Discovery schedules configuration
const DISCOVERY_SCHEDULES = {
  // High-frequency discovery (real-time sources)
  realtime: {
    enabled: true,
    cron: '*/15 * * * *', // Every 15 minutes
    sources: ['discord', 'telegram', 'sslDiscovery'],
    description: 'Real-time discovery from Discord, Telegram, and SSL certificates'
  },
  
  // Medium-frequency discovery (social media and forums)
  social: {
    enabled: true,
    cron: '0 */2 * * *', // Every 2 hours
    sources: ['youtube', 'linkedin', 'forums', 'socialMediaAdvanced'],
    description: 'Social media and forum discovery'
  },
  
  // Low-frequency discovery (comprehensive methods)
  comprehensive: {
    enabled: true,
    cron: '0 */6 * * *', // Every 6 hours
    sources: [
      'appStores', 'appCaseStudies', 'reviewSites', 'competitorAnalysis',
      'ecommerceAwards', 'marketplaceShowcases', 'startupForums'
    ],
    description: 'Comprehensive discovery from app stores, reviews, awards, etc.'
  },
  
  // Resource-intensive discovery (domain generation, DNS enumeration)
  intensive: {
    enabled: true,
    cron: '0 0,12 * * *', // Twice daily at 12 AM/PM
    sources: ['domainGeneration', 'dnsDiscovery'],
    description: 'Resource-intensive discovery methods'
  },
  
  // Daily comprehensive discovery (all sources)
  daily: {
    enabled: true,
    cron: '0 2 * * *', // Daily at 2 AM
    sources: 'all',
    description: 'Full comprehensive discovery using all available methods'
  }
};

// Track scheduled jobs
let scheduledJobs = {};
let discoveryStats = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  lastRunTime: null,
  lastRunResults: null,
  storesDiscovered: 0,
};

/**
 * Initialize automated discovery service
 */
export const initializeAutomatedDiscovery = () => {
  console.log('\n🤖 Initializing Automated Discovery Service...');
  console.log('📅 Scheduling comprehensive store discovery jobs...');
  
  // Schedule each discovery type
  Object.entries(DISCOVERY_SCHEDULES).forEach(([scheduleType, config]) => {
    if (!config.enabled) {
      console.log(`⏸️  ${scheduleType} discovery disabled`);
      return;
    }
    
    try {
      const job = cron.schedule(config.cron, async () => {
        await runScheduledDiscovery(scheduleType, config);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      
      scheduledJobs[scheduleType] = job;
      console.log(`✅ Scheduled ${scheduleType} discovery: ${config.cron}`);
      console.log(`   📝 ${config.description}`);
      
    } catch (error) {
      console.error(`❌ Failed to schedule ${scheduleType} discovery:`, error.message);
    }
  });
  
  console.log(`\n📊 Discovery Schedules Active: ${Object.keys(scheduledJobs).length}`);
  console.log('🔄 Automated discovery service is now running...');
  
  // Run initial discovery after 1 minute
  setTimeout(() => {
    console.log('\n🚀 Running initial comprehensive discovery...');
    runScheduledDiscovery('initial', {
      sources: 'all',
      description: 'Initial comprehensive discovery on startup'
    });
  }, 60000); // 1 minute delay
};

/**
 * Run a scheduled discovery job
 */
async function runScheduledDiscovery(scheduleType, config) {
  const startTime = Date.now();
  discoveryStats.totalRuns++;
  discoveryStats.lastRunTime = new Date();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🤖 Starting ${scheduleType.toUpperCase()} Discovery Job`);
  console.log(`📅 Schedule: ${config.cron}`);
  console.log(`📝 Description: ${config.description}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  try {
    // Check if another job is already running
    const currentStatus = getContinuousScrapingStatus();
    if (currentStatus.isScraping) {
      console.log('⏸️  Another scraping job is already running, skipping...');
      discoveryStats.failedRuns++;
      return;
    }
    
    // Configure scraping for this schedule
    const sourcesToRun = config.sources === 'all' 
      ? Object.keys(DISCOVERY_SCHEDULES).flatMap(key => 
          DISCOVERY_SCHEDULES[key].sources !== 'all' ? DISCOVERY_SCHEDULES[key].sources : []
        ).filter((source, index, arr) => arr.indexOf(source) === index) // Remove duplicates
      : config.sources;
    
    console.log(`🎯 Running ${sourcesToRun.length} discovery sources: ${sourcesToRun.join(', ')}`);
    
    // Update scraping configuration for this run
    const { updateScrapingConfig } = await import('./continuousScrapingService.js');
    const originalConfig = getScrapingConfig();
    
    // Enable only the sources for this schedule
    const newConfig = { ...originalConfig };
    Object.keys(newConfig.ENABLED_SOURCES).forEach(source => {
      newConfig.ENABLED_SOURCES[source] = sourcesToRun.includes(source);
    });
    
    updateScrapingConfig(newConfig);
    
    // Run the discovery job
    const jobId = `${scheduleType}-${Date.now()}`;
    const result = await runContinuousScrapingJob(jobId);
    
    // Restore original configuration
    updateScrapingConfig(originalConfig);
    
    // Update statistics
    const duration = (Date.now() - startTime) / 1000;
    discoveryStats.successfulRuns++;
    discoveryStats.lastRunResults = result;
    
    if (result.success) {
      discoveryStats.storesDiscovered += result.stats?.saved || 0;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`✨ ${scheduleType.toUpperCase()} Discovery Completed Successfully!`);
      console.log('='.repeat(80));
      console.log(`📋 Job ID: ${result.jobId}`);
      console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
      console.log(`📊 Results: ${result.stats?.saved || 0} stores discovered`);
      console.log(`📈 Total stores discovered today: ${discoveryStats.storesDiscovered}`);
      console.log('='.repeat(80));
    } else {
      console.error(`❌ ${scheduleType.toUpperCase()} Discovery Failed: ${result.error}`);
    }
    
  } catch (error) {
    discoveryStats.failedRuns++;
    console.error(`❌ Fatal error in ${scheduleType} discovery:`, error.message);
  }
}

/**
 * Get automated discovery status
 */
export const getAutomatedDiscoveryStatus = () => {
  return {
    isActive: Object.keys(scheduledJobs).length > 0,
    scheduledJobs: Object.keys(scheduledJobs),
    schedules: DISCOVERY_SCHEDULES,
    stats: discoveryStats,
    uptime: process.uptime(),
  };
};

/**
 * Update discovery schedules
 */
export const updateDiscoverySchedules = (newSchedules) => {
  Object.assign(DISCOVERY_SCHEDULES, newSchedules);
  
  // Restart service with new schedules
  stopAutomatedDiscovery();
  setTimeout(initializeAutomatedDiscovery, 5000);
};

/**
 * Stop automated discovery service
 */
export const stopAutomatedDiscovery = () => {
  console.log('\n🛑 Stopping Automated Discovery Service...');
  
  Object.entries(scheduledJobs).forEach(([scheduleType, job]) => {
    try {
      job.stop();
      console.log(`✅ Stopped ${scheduleType} discovery`);
    } catch (error) {
      console.error(`❌ Error stopping ${scheduleType} discovery:`, error.message);
    }
  });
  
  scheduledJobs = {};
  console.log('🔄 Automated discovery service stopped');
};

/**
 * Get scraping configuration (helper function)
 */
async function getScrapingConfig() {
  try {
    const { getScrapingConfig } = await import('./continuousScrapingService.js');
    return getScrapingConfig();
  } catch (error) {
    return {};
  }
}

/**
 * Manual trigger for specific discovery types
 */
export const triggerManualDiscovery = async (discoveryType) => {
  if (!DISCOVERY_SCHEDULES[discoveryType]) {
    throw new Error(`Unknown discovery type: ${discoveryType}`);
  }
  
  console.log(`🎯 Manually triggering ${discoveryType} discovery...`);
  await runScheduledDiscovery(discoveryType, DISCOVERY_SCHEDULES[discoveryType]);
};

/**
 * Get discovery statistics
 */
export const getDiscoveryStatistics = async () => {
  const prisma = getPrisma();
  
  try {
    // Get database statistics
    const totalStores = await prisma.store.count();
    const activeStores = await prisma.store.count({ where: { isActive: true } });
    const verifiedStores = await prisma.store.count({ where: { verified: true } });
    const recentStores = await prisma.store.count({
      where: {
        dateAdded: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    return {
      database: {
        totalStores,
        activeStores,
        verifiedStores,
        recentStores,
      },
      automated: discoveryStats,
      lastUpdate: new Date(),
    };
  } catch (error) {
    console.error('Error getting discovery statistics:', error.message);
    return {
      database: {
        totalStores: 0,
        activeStores: 0,
        verifiedStores: 0,
        recentStores: 0,
      },
      automated: discoveryStats,
      lastUpdate: new Date(),
    };
  }
};
