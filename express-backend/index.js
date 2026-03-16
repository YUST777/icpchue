import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { transporter } from './src/services/emailService.js';
import { initDB } from './src/config/db.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { blockBots, helmetConfig, corsConfig } from './src/middleware/security.js';
import { logAccess } from './src/middleware/logging.js';

// Import Routes (Currently no external routes mounted)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Validate critical env vars
const requiredEnvVars = [
  'PORT', 'API_SECRET_KEY', 'DATABASE_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ERROR: Required environment variable ${envVar} is not set in .env file`);
    process.exit(1);
  }
}

// Initialize Database
console.log('[INFO] Initializing database...');
initDB().catch(err => {
  console.error('[ERROR] Database initialization failed:', err);
  // Don't exit, might be transient
});

// Initialize Scraper Worker (BullMQ)
import { initScraperWorker } from './src/services/scraperWorker.js';
initScraperWorker();

// Verify Email Service
/*
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email service connection error:', error);
  } else {
    console.log('✓ Email service is ready');
  }
});
*/
console.log('[INFO] Email service initialized');

// ============================================
// MIDDLEWARE
// ============================================

// Security Middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(blockBots);

// Static Files
app.use('/pfps', express.static(path.join(__dirname, '../pfps'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(logAccess);

// Trust Proxy (for getting correct IP from Nginx)
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// ============================================
// ROUTES
// ============================================

// Health Check
import { judge0 } from './src/services/judgeService.js';
import { pool, redis } from './src/config/db.js';

app.get('/api/health', async (req, res) => {
  let judgeStatus = 'unknown';
  let dbStatus = 'error';
  let redisStatus = 'error';

  try {
    const status = await judge0.getStatus();
    judgeStatus = status ? 'connected' : 'error';
  } catch (e) {
    judgeStatus = 'error';
  }

  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }

  try {
    const redisPing = await redis.ping();
    redisStatus = redisPing === 'PONG' ? 'connected' : 'error';
  } catch (e) {
    redisStatus = 'error';
  }

  const allHealthy = judgeStatus === 'connected' && dbStatus === 'connected' && redisStatus === 'connected';

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      judge0: judgeStatus,
      redis: redisStatus,
      db: dbStatus
    }
  });
});

// 404 Handler for API
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[INFO] Server listening on port ${PORT}`);
  console.log(`[INFO] Health check available at http://localhost:${PORT}/api/health`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
