const { validationResult, body } = require('express-validator');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const IntegrationLog = require('../models/IntegrationLog');
const { getClinicAdminId } = require('../utils/clinicHelpers');
const { DateTime } = require('luxon');

// Keep status aligned with lead controller
const ALLOWED_STATUSES = new Set(['NEW', 'HOT', 'CLOSED', 'LOST']);

const normalizeStatus = (status) => {
  if (!status) return 'NEW';
  const normalized = String(status).trim().toUpperCase();
  return ALLOWED_STATUSES.has(normalized) ? normalized : 'NEW';
};

const normalizeDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (!str) return null;
  const iso = DateTime.fromISO(str, { zone: 'utc' });
  if (iso.isValid) return iso.toISODate();
  const dmy = DateTime.fromFormat(str, 'dd/MM/yyyy', { zone: 'utc' });
  if (dmy.isValid) return dmy.toISODate();
  const dmyDash = DateTime.fromFormat(str, 'dd-MM-yyyy', { zone: 'utc' });
  if (dmyDash.isValid) return dmyDash.toISODate();
  return null;
};

const sanitizePhone = (value) => (value || '').replace(/[^0-9+]/g, '');

// Validation chain exported for route reuse
const contractWebhookValidation = [
  body('clinicId').exists().isInt().withMessage('clinicId is required'),
  body('contracts').custom((value, { req }) => {
    const contracts = Array.isArray(value)
      ? value
      : Array.isArray(req.body)
        ? req.body
        : value
          ? [value]
          : [];
    if (!contracts.length) {
      throw new Error('contracts array is required');
    }
    return true;
  })
];

const handleContractWebhook = async (req, res) => {
  try {
    const expectedSecret = (process.env.CONTRACT_WEBHOOK_SECRET || '').trim();
    if (expectedSecret) {
      const incoming = String(req.headers['x-contract-secret'] || '').trim();
      if (!incoming || incoming !== expectedSecret) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const clinicId = parseInt(req.body.clinicId, 10);
    const adminId = await getClinicAdminId(clinicId);
    const rawContracts = Array.isArray(req.body.contracts)
      ? req.body.contracts
      : Array.isArray(req.body)
        ? req.body
        : [req.body.contracts || req.body.contract || {}];

    const results = [];

    for (const raw of rawContracts) {
      const phone = sanitizePhone(raw.phone);
      if (!phone) {
        results.push({ success: false, error: 'Phone is required', contract: raw });
        continue;
      }

      const status = normalizeStatus(raw.status);
      const nextFollowUp = normalizeDateInput(raw.nextFollowUp || raw.appointmentDate);
      const value = raw.value !== undefined && raw.value !== null ? parseFloat(raw.value) : undefined;
      const payload = {
        name: raw.name || phone,
        phone,
        email: raw.email || null,
        service: raw.service || 'Contract import',
        status,
        source: raw.source || 'contract_webhook',
        value: Number.isFinite(value) ? value : 0,
        notes: raw.notes || raw.description || null,
        nextFollowUp,
        assignedToId: raw.assignedToId || adminId
      };

      try {
        let lead = await Lead.findByPhone(phone, clinicId);
        const isNew = !lead;
        if (isNew) {
          lead = await Lead.create({
            ...payload,
            clinicId
          });
          await Activity.create({
            type: 'LEAD_IMPORTED',
            description: `Lead created from contract import: ${payload.name}`,
            userId: adminId,
            leadId: lead.id
          });
          await Notification.create({
            type: 'lead',
            title: 'New contract imported',
            message: `Lead ${lead.name} was created from a contract.`,
            priority: 'high',
            actionLabel: 'Open lead',
            actionLink: `/leads/${lead.id}`,
            metadata: { leadId: lead.id, source: 'contract_webhook' },
            userId: lead.assigned_to_id || adminId || null,
            clinicId
          });
        } else {
          lead = await Lead.update(lead.id, clinicId, payload);
          await Activity.create({
            type: 'LEAD_IMPORTED',
            description: `Lead updated from contract import: ${payload.name}`,
            userId: adminId,
            leadId: lead.id
          });
        }

        await IntegrationLog.create({
          type: 'contract_webhook',
          level: 'info',
          message: isNew ? 'Lead created from contract' : 'Lead updated from contract',
          clinicId,
          metadata: { leadId: lead.id, status: lead.status }
        });

        if (process.env.NODE_ENV !== 'production') {
          console.info('[contract_webhook] upsert lead', { clinicId, leadId: lead.id, created: isNew });
        }
        results.push({ success: true, leadId: lead.id, created: isNew });
      } catch (error) {
        await IntegrationLog.create({
          type: 'contract_webhook',
          level: 'error',
          message: error.message || 'Contract import failed',
          clinicId,
          metadata: { error: error.stack || error.message, contract: raw }
        });
        if (process.env.NODE_ENV !== 'production') {
          console.error('[contract_webhook] failed', { clinicId, error: error.message });
        }
        results.push({ success: false, error: error.message || 'Failed', contract: raw });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.created).length,
      updated: results.filter((r) => r.success && !r.created).length,
      failed: results.filter((r) => !r.success).length
    };

    return res.json({ success: true, summary, results });
  } catch (error) {
    await IntegrationLog.create({
      type: 'contract_webhook',
      level: 'error',
      message: error.message || 'Contract webhook processing error',
      metadata: { error: error.stack || '' }
    });
    return res.status(500).json({ message: 'Unable to process contract webhook' });
  }
};

module.exports = {
  handleContractWebhook,
  contractWebhookValidation
};
