/**
 * Web server entry point.
 * Scheduler runs in this process only when RUN_SCHEDULER=true
 * (default true in development for convenience).
 */

const config = require('./config');
const createApp = require('./app');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');
const { startScheduler } = require('./services/schedulerService');
const telegramService = require('./services/telegramService');

async function bootstrap() {
  try {
    await connectDB();

    const app = createApp();
    app.listen(config.port, () => {
      logger.info(`Backend running on http://localhost:${config.port}`);
    });

    const runScheduler =
      process.env.RUN_SCHEDULER === undefined
        ? config.nodeEnv !== 'production'
        : process.env.RUN_SCHEDULER === 'true';

    if (runScheduler && config.scheduler.enabled) {
      await startScheduler();
    } else {
      logger.info('Scheduler not started in this process (set RUN_SCHEDULER=true to enable)');
    }

    if (config.telegram.enabled) {
      telegramService.startPolling();
    }
  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  }
}

bootstrap();
