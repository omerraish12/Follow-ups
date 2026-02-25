const Notification = require('../models/Notification');

// @desc    Get notifications for current user/clinic
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

        const notifications = await Notification.findAll(
            req.user.clinic_id,
            req.user.id,
            limit
        );

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countUnread(req.user.clinic_id, req.user.id);
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a notification (admin/system use)
// @route   POST /api/notifications
const createNotification = async (req, res) => {
    try {
        const {
            type,
            title,
            message,
            priority,
            actionLabel,
            actionLink,
            metadata,
            userId
        } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const notification = await Notification.create({
            type,
            title,
            message,
            priority,
            actionLabel,
            actionLink,
            metadata,
            userId: userId || null,
            clinicId: req.user.clinic_id
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
    try {
        const updated = await Notification.markRead(
            req.params.id,
            req.user.clinic_id,
            req.user.id
        );

        if (!updated) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read/all
const markAllRead = async (req, res) => {
    try {
        const updated = await Notification.markAllRead(req.user.clinic_id, req.user.id);
        res.json({ count: updated.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
    try {
        const deleted = await Notification.delete(
            req.params.id,
            req.user.clinic_id,
            req.user.id
        );

        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ id: deleted.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications
const clearAll = async (req, res) => {
    try {
        const result = await Notification.clearAll(req.user.clinic_id, req.user.id);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    createNotification,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll
};
