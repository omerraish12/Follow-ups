const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      // host: process.env.EMAIL_HOST,
      // port: process.env.EMAIL_PORT,
      secure: false,
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // Helps if you are behind a corporate proxy/firewall
      },
      logger: true,                     // ← add this
      debug: true,                      // ← add this
    });
  }

  async sendPasswordReset(to, resetUrl, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: 'איפוס סיסמה - מערכת ניהול לידים',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">איפוס סיסמה</h2>
          <p>שלום ${name},</p>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
          <p>לחץ על הקישור הבא לאיפוס הסיסמה:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              איפוס סיסמה
            </a>
          </div>
          <p>הקישור תקף לשעה אחת.</p>
          <p>אם לא ביקשת איפוס סיסמה, אנא התעלם מהודעה זו.</p>
          <hr style="border: 1px solid #f0f0f0;">
          <p style="color: #999; font-size: 12px;">צוות מערכת ניהול לידים</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendContactNotification(payload = {}) {
    const to = process.env.CONTACT_NOTIFICATION_EMAIL || process.env.EMAIL_USER;
    if (!to) {
      console.warn('Contact notification email not configured, skipping message');
      return;
    }

    const { name, email, phone, message, clinic } = payload;
    const clinicName = clinic?.name ? clinic.name : 'Clinic';
    const formattedMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #1f4ef7;">New contact form submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
        <p><strong>Clinic:</strong> ${clinicName}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: `New contact from ${name}`,
      html: formattedMessage
    };

    if (email) {
      mailOptions.replyTo = email;
    }

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
