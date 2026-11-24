const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const { requireInternalSecret } = require('../middleware/auth');

const router = express.Router();

router.get('/history', notificationsController.getHistory);
router.post('/test', requireInternalSecret, notificationsController.testNotification);

module.exports = router;
