const { DateTime } = require('luxon');
const { query } = require('../config/database');

const getClinicTimezone = async (clinicId) => {
  const result = await query(
    `SELECT timezone FROM clinics WHERE id = $1`,
    [clinicId]
  );
  return result.rows?.[0]?.timezone || 'UTC';
};

const isWithinQuietHours = (quietHours, timezone) => {
  if (!quietHours || !quietHours.start || !quietHours.end) return false;
  const now = DateTime.now().setZone(timezone || 'UTC');
  const startParts = quietHours.start.split(':').map(Number);
  const endParts = quietHours.end.split(':').map(Number);
  if (startParts.length < 2 || endParts.length < 2) return false;

  const start = now.set({ hour: startParts[0], minute: startParts[1], second: 0, millisecond: 0 });
  const end = now.set({ hour: endParts[0], minute: endParts[1], second: 0, millisecond: 0 });

  // Handles windows that cross midnight
  if (end < start) {
    return now >= start || now <= end;
  }

  return now >= start && now <= end;
};

const isWithinQuietHoursForClinic = async (clinicId, quietHours) => {
  if (!clinicId) return false;
  const timezone = await getClinicTimezone(clinicId);
  return isWithinQuietHours(quietHours, timezone);
};

module.exports = {
  isWithinQuietHours,
  isWithinQuietHoursForClinic,
  getClinicTimezone
};
