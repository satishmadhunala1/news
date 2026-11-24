/**
 * Independent scheduler process for production.
 * Ensures only one scheduler instance runs:
 *   node src/scheduler.js
 */

const { connectDB } = require('./config/db');
const { startScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');
const config = require('./config');

async function main() {
  process.env.RUN_SCHEDULER = 'true';
  await connectDB();
  if (!config.scheduler.enabled) {
    logger.warn('SCHEDULER_ENABLED=false — exiting');
    process.exit(0);
  }
  await startScheduler();
  logger.info('Standalone scheduler process is running');
}

main().catch((err) => {
  logger.error('Scheduler process failed', { message: err.message });
  process.exit(1);
});
