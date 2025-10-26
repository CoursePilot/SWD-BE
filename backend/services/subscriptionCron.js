const Subscription = require("../models/subscription.model");

// Chạy mỗi ngày để check expired subscriptions
async function checkExpiredSubscriptions() {
  try {
    console.log('=== Checking Expired Subscriptions ===');
    const expiredCount = await Subscription.checkAndUpdateExpired();
    
    if (expiredCount > 0) {
      console.log(`✅ Updated ${expiredCount} expired subscriptions`);
    } else {
      console.log('ℹ️ No expired subscriptions found');
    }
    
    return expiredCount;
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
    throw error;
  }
}

// Chạy mỗi giờ để check quota limits
async function checkQuotaLimits() {
  try {
    console.log('=== Checking Quota Limits ===');
    const cancelledCount = await Subscription.checkAndCancelOverQuota();
    
    if (cancelledCount > 0) {
      console.log(`✅ Cancelled ${cancelledCount} over-quota subscriptions`);
    } else {
      console.log('ℹ️ No over-quota subscriptions found');
    }
    
    return cancelledCount;
  } catch (error) {
    console.error('❌ Error checking quota limits:', error);
    throw error;
  }
}

// Chạy tất cả maintenance tasks
async function runMaintenanceTasks() {
  try {
    console.log('🔄 Starting subscription maintenance tasks...');
    
    const expiredCount = await checkExpiredSubscriptions();
    const cancelledCount = await checkQuotaLimits();
    
    console.log('✅ Maintenance tasks completed', {
      expired: expiredCount,
      cancelled: cancelledCount,
      timestamp: new Date().toISOString()
    });
    
    return {
      expired: expiredCount,
      cancelled: cancelledCount,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Maintenance tasks failed:', error);
    throw error;
  }
}

// Setup cron jobs
function setupCronJobs() {
  // Chạy mỗi ngày lúc 2:00 AM
  setInterval(async () => {
    try {
      await runMaintenanceTasks();
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Chạy mỗi giờ để check quota
  setInterval(async () => {
    try {
      await checkQuotaLimits();
    } catch (error) {
      console.error('Quota check cron failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  console.log('🕐 Subscription cron jobs initialized');
  console.log('  - Daily expiry check: 24h interval');
  console.log('  - Hourly quota check: 1h interval');
}

module.exports = {
  checkExpiredSubscriptions,
  checkQuotaLimits,
  runMaintenanceTasks,
  setupCronJobs
};