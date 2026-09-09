import nodemailer from 'nodemailer';
import env from '../config/environment.js';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    if (env.EMAIL.user && env.EMAIL.pass) {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL.host,
        port: env.EMAIL.port,
        secure: env.EMAIL.port === 465,
        auth: {
          user: env.EMAIL.user,
          pass: env.EMAIL.pass,
        },
      });
      console.log('[EmailService] SMTP transporter configured with custom credentials.');
    } else {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`[EmailService] Ethereal test mailbox generated: ${testAccount.user}`);
      } catch (err) {
        console.warn(`[EmailService] Failed to create Ethereal test account: ${err.message}`);
      }
    }
  }

  async sendPriceDropAlert({ userEmail, userName, productTitle, platformName, oldPrice, newPrice, productUrl }) {
    const dropAmount = (oldPrice - newPrice).toFixed(2);
    const dropPercent = (((oldPrice - newPrice) / oldPrice) * 100).toFixed(2);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 1px;">🔥 PRICE DROP ALERT!</h1>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px; color: #94a3b8;">Hello ${userName || 'Valued User'},</p>
          <p style="font-size: 18px; font-weight: bold; color: #ffffff;">${productTitle}</p>
          <div style="background: #1e293b; padding: 18px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 6px 0; color: #cbd5e1;"><strong>Platform:</strong> <span style="color: #38bdf8;">${platformName}</span></p>
            <p style="margin: 6px 0; color: #cbd5e1;"><strong>Previous Price:</strong> <span style="text-decoration: line-through; color: #ef4444;">₹${Number(oldPrice).toLocaleString('en-IN')}</span></p>
            <p style="margin: 6px 0; color: #10b981; font-size: 20px;"><strong>Current Price:</strong> ₹${Number(newPrice).toLocaleString('en-IN')}</p>
            <p style="margin: 6px 0; color: #22c55e;"><strong>Total Savings:</strong> ₹${Number(dropAmount).toLocaleString('en-IN')} (${dropPercent}%)</p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${productUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Product on Store &rarr;</a>
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to: userEmail,
      subject: `🔥 Price Drop on ${productTitle} (${platformName})!`,
      html: htmlContent,
    });
  }

  async sendTargetPriceAlert({ userEmail, userName, productTitle, platformName, currentPrice, targetPrice, productUrl }) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff;">🎯 TARGET PRICE REACHED!</h1>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px; color: #94a3b8;">Hello ${userName || 'Valued User'},</p>
          <p style="font-size: 18px; font-weight: bold; color: #ffffff;">${productTitle}</p>
          <div style="background: #1e293b; padding: 18px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 6px 0; color: #cbd5e1;"><strong>Platform:</strong> <span style="color: #38bdf8;">${platformName}</span></p>
            <p style="margin: 6px 0; color: #cbd5e1;"><strong>Target Threshold:</strong> ₹${Number(targetPrice).toLocaleString('en-IN')}</p>
            <p style="margin: 6px 0; color: #10b981; font-size: 20px;"><strong>Current Price:</strong> ₹${Number(currentPrice).toLocaleString('en-IN')}</p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${productUrl}" style="background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Grab Deal on ${platformName} &rarr;</a>
          </div>
        </div>
      </div>
    `;

    return this.sendMail({
      to: userEmail,
      subject: `🎯 Target Price Hit: ${productTitle} is now ₹${Number(currentPrice).toLocaleString('en-IN')}`,
      html: htmlContent,
    });
  }

  async sendMail({ to, subject, html }) {
    try {
      if (!this.transporter) {
        console.log(`[EmailService MOCK SEND] To: ${to} | Subject: ${subject}`);
        return { success: true, mocked: true };
      }

      const info = await this.transporter.sendMail({
        from: env.EMAIL.from,
        to,
        subject,
        html,
      });

      console.log(`[EmailService] Message sent: ${info.messageId}`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] 🔗 Preview Email Online: ${previewUrl}`);
      }

      return { success: true, messageId: info.messageId, previewUrl };
    } catch (err) {
      console.error('[EmailService] Dispatch failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

const emailService = new EmailService();
export default emailService;
export { emailService };
