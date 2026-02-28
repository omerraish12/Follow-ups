const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const emailService = require('../utils/emailService');
const { ensureClinicRecord, getClinicAdminId } = require('../utils/clinicHelpers');

const normalizePhone = (value) => (value || '').replace(/[^0-9+]/g, '');

// @desc    Handle landing page contact form
// @route   POST /api/contact
const handleContactForm = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid contact data', errors: errors.array() });
    }

    const { name, phone, email, message, agreement } = req.body;

    if (!agreement) {
        return res.status(400).json({ message: 'Agreement is required' });
    }

    const clinic = await ensureClinicRecord();
    const clinicId = clinic?.id;
    if (!clinicId) {
        return res.status(500).json({ message: 'Clinic configuration missing' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ message: 'Invalid phone number' });
    }

    const adminId = await getClinicAdminId(clinicId);
    let lead = await Lead.findByPhone(normalizedPhone);

    if (lead && lead.clinic_id === clinicId) {
        lead = await Lead.update(lead.id, clinicId, {
            name: name.trim(),
            email: email?.trim() || lead.email,
            service: lead.service || 'Landing page inquiry',
            notes: message.trim(),
            status: 'HOT',
            lastContacted: new Date(),
            assignedToId: lead.assigned_to_id || adminId
        });
    } else {
        lead = await Lead.create({
            name: name.trim(),
            phone: normalizedPhone,
            email: email?.trim(),
            service: 'Landing page inquiry',
            status: 'HOT',
            source: 'landing_page',
            notes: message.trim(),
            clinicId,
            assignedToId: adminId
        });
    }

    await Activity.create({
        type: 'MESSAGE_RECEIVED',
        description: `Contact form submitted: ${name}`,
        userId: adminId,
        leadId: lead.id
    });

    await Notification.create({
        type: 'lead',
        title: 'New contact form lead',
        message: `${name} submitted a demo request through the landing page.`,
        priority: 'high',
        actionLabel: 'View lead',
        actionLink: `/leads/${lead.id}`,
        metadata: { leadId: lead.id, source: 'landing_page' },
        userId: adminId,
        clinicId
    });

    await Message.create({
        content: message.trim(),
        type: 'RECEIVED',
        isBusiness: false,
        leadId: lead.id
    });

    await emailService.sendContactNotification({
        name: name.trim(),
        email: email?.trim(),
        phone: normalizedPhone,
        message: message.trim(),
        clinic
    });

    res.status(201).json({
        success: true,
        leadId: lead.id
    });
};

module.exports = {
    handleContactForm
};
