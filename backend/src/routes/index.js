const express = require('express');
const healthController = require('../controllers/healthController');
const newsRoutes = require('./newsRoutes');
const preferencesRoutes = require('./preferencesRoutes');
const notificationsRoutes = require('./notificationsRoutes');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.use('/news', newsRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;
