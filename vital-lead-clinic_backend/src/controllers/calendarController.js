const { google } = require('googleapis');
const { query } = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto'); // reuse if exists
const { DateTime } = require('luxon');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'openid', 'email'];

const buildOAuthClient = () => {
  const clientId = process.env.GCAL_CLIENT_ID;
  const clientSecret = process.env.GCAL_CLIENT_SECRET;
  const redirectUri = process.env.GCAL_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Calendar credentials are not configured');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const saveToken = async (userId, tokens) => {
  const payload = encrypt(JSON.stringify(tokens || {}));
  await query(
    `INSERT INTO google_tokens (user_id, token_encrypted)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET token_encrypted = EXCLUDED.token_encrypted,
           updated_at = CURRENT_TIMESTAMP`,
    [userId, payload]
  );
};

const loadToken = async (userId) => {
  const result = await query(
    `SELECT token_encrypted FROM google_tokens WHERE user_id = $1`,
    [userId]
  );
  const encrypted = result.rows?.[0]?.token_encrypted || null;
  if (!encrypted) return null;
  const decrypted = decrypt(encrypted);
  return decrypted ? JSON.parse(decrypted) : null;
};

const getAuthUrl = async (req, res) => {
  try {
    const oauth2Client = buildOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to create auth URL' });
  }
};

const oauthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Missing code' });
    }
    const oauth2Client = buildOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await saveToken(req.user.id, tokens);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'OAuth exchange failed' });
  }
};

const getEvents = async (req, res) => {
  try {
    const token = await loadToken(req.user.id);
    if (!token) {
      return res.status(400).json({ message: 'Calendar not connected' });
    }
    const oauth2Client = buildOAuthClient();
    oauth2Client.setCredentials(token);

    const from = req.query.from || DateTime.now().startOf('day').toISO();
    const to = req.query.to || DateTime.now().plus({ days: 7 }).endOf('day').toISO();

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: from,
      timeMax: to,
      singleEvents: true,
      orderBy: 'startTime'
    });

    res.json({ events: data.items || [] });
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ message: error.message || 'Unable to fetch events' });
  }
};

const disconnect = async (req, res) => {
  try {
    await query(`DELETE FROM google_tokens WHERE user_id = $1`, [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Unable to disconnect calendar' });
  }
};

module.exports = {
  getAuthUrl,
  oauthCallback,
  getEvents,
  disconnect
};
