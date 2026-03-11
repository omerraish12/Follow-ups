const { parsePhoneNumberFromString } = require('libphonenumber-js');

const getDefaultCountry = () => {
  return (process.env.DEFAULT_PHONE_COUNTRY || 'US').toUpperCase();
};

const normalizeToE164 = (value, country) => {
  if (!value) return '';
  const candidate = String(value).trim();
  const parsed = parsePhoneNumberFromString(candidate, (country || getDefaultCountry()));
  if (parsed && parsed.isValid()) {
    return parsed.number;
  }
  return '';
};

module.exports = {
  normalizeToE164,
  getDefaultCountry
};
