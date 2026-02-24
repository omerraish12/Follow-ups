const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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
}

module.exports = new EmailService();