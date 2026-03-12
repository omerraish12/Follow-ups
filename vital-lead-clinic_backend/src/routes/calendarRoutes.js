const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getAuthUrl,
  oauthCallback,
  getEvents,
  disconnect
} = require('../controllers/calendarController');

const router = express.Router();

router.get('/auth-url', protect, getAuthUrl);
router.get('/oauth/callback', protect, oauthCallback);
router.get('/events', protect, getEvents);
router.post('/disconnect', protect, disconnect);

module.exports = router;
