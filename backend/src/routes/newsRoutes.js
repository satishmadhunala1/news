const express = require('express');
const { query } = require('express-validator');
const newsController = require('../controllers/newsController');
const { requireInternalSecret } = require('../middleware/auth');
const { fetchLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  newsController.listNews
);

router.get('/latest', newsController.latestNews);
router.get('/important', newsController.importantNews);
router.get('/saved', newsController.savedNews);
router.get('/dashboard', newsController.dashboardStats);
router.get('/search', newsController.searchNews);
router.post('/chat', fetchLimiter, newsController.chatNews);
router.get('/category/:category', newsController.byCategory);
router.get('/location/:location', newsController.byLocation);
router.post('/fetch', requireInternalSecret, fetchLimiter, newsController.fetchNews);
router.post('/enrich-images', requireInternalSecret, fetchLimiter, newsController.enrichImages);
router.post('/:id/bookmark', newsController.toggleBookmark);

module.exports = router;
