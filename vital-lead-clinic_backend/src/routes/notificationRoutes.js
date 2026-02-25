const express = require('express');
const {
    getNotifications,
    getUnreadCount,
    createNotification,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/', createNotification);
router.patch('/read/all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearAll);

module.exports = router;
