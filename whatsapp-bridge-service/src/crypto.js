const crypto = require('crypto');

const getEncryptionKey = () => {
  const rawSecret = String(process.env.WA_WEB_AUTH_SECRET || '').trim();
  if (!rawSecret) {
    throw new Error('WA_WEB_AUTH_SECRET is required');
  }
  return crypto.createHash('sha256').update(rawSecret).digest();
};

const encrypt = (plainText) => {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  });
};

const decrypt = (payload) => {
  if (!payload) {
    return '';
  }

  const parsed = JSON.parse(payload);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(parsed.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
};

module.exports = {
  encrypt,
  decrypt
};
