import nodemailer from 'nodemailer';
import { getFrontendUrl } from '../utils/url.utils.js';

let transporter = null;

/**
 * Initializes or retrieves the nodemailer transporter
 */
const getTransporter = async () => {
    if (transporter) return transporter;

    // Check if custom SMTP is configured in .env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        return transporter;
    }

    // Default: Create an Ethereal test account for automated testing & instant preview URLs
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('📧 Ethereal test email account initialized for VoxCode notifications');
    } catch (err) {
        console.warn('Failed to create Ethereal account, using fallback mock transport:', err.message);
        transporter = {
            sendMail: async (mailOptions) => {
                console.log(`[MOCK EMAIL DISPATCHED] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
                return { messageId: `mock_${Date.now()}` };
            }
        };
    }

    return transporter;
};

/**
 * Sends a candidate invitation email with a 1-click magic link
 */
export const sendAssessmentInvite = async ({
    candidateEmail,
    companyName = 'Engineering Team',
    roleTitle = 'Software Engineer',
    assessmentTitle = 'Technical Assessment',
    assessmentCode,
    durationMinutes = 45,
    customMessage = ''
}) => {
    const frontendUrl = getFrontendUrl();
    const magicLink = `${frontendUrl}/candidate/assessment/${assessmentCode}`;

    const mailOptions = {
        from: `"${companyName} Recruiting via VoxCode" <no-reply@voxcode.ai>`,
        to: candidateEmail,
        subject: `Interview Invitation: ${roleTitle} at ${companyName} (${assessmentCode})`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #e2e8f0; margin: 0; padding: 24px; }
            .card { max-width: 580px; margin: 0 auto; background-color: #121824; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { text-align: center; margin-bottom: 24px; }
            .badge { display: inline-block; background-color: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; color: #a5b4fc; font-weight: bold; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; }
            h1 { color: #ffffff; font-size: 22px; font-weight: 800; margin: 12px 0 6px 0; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 8px 0; }
            .code-box { background-color: #0b0f17; border: 1px solid #334155; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
            .code { font-family: Courier, monospace; font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: 3px; }
            .details { background-color: #1a2233; border-radius: 10px; padding: 16px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
            .label { color: #64748b; }
            .val { color: #f1f5f9; font-weight: 600; }
            .btn { display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 0; border-radius: 12px; margin: 24px 0; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35); }
            .footer { font-size: 11px; color: #475569; text-align: center; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="badge">AI Technical Assessment</span>
              <h1>You're Invited to Interview!</h1>
              <p><strong>${companyName}</strong> has invited you to complete an adaptive technical interview for the <strong>${roleTitle}</strong> role.</p>
            </div>

            ${customMessage ? `<p style="font-style: italic; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border-left: 3px solid #6366f1;">"${customMessage}"</p>` : ''}

            <div class="details">
              <div class="detail-row">
                <span class="label">Role:</span>
                <span class="val">${roleTitle}</span>
              </div>
              <div class="detail-row">
                <span class="label">Company:</span>
                <span class="val">${companyName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="val">${durationMinutes} Minutes</span>
              </div>
              <div class="detail-row">
                <span class="label">Format:</span>
                <span class="val">2-Stage Voice Q&A + Live Coding</span>
              </div>
            </div>

            <div class="code-box">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">Your Assessment Code</div>
              <div class="code">${assessmentCode}</div>
            </div>

            <a href="${magicLink}" class="btn">Start Technical Assessment →</a>

            <p style="font-size: 12px; text-align: center; color: #64748b;">
              Or navigate to <code>${frontendUrl}/candidate/dashboard</code> and enter code <strong>${assessmentCode}</strong>.
            </p>

            <div class="footer">
              Powered by VoxCode • Adaptive AI Interview Platform with Rohan<br>
              Good luck with your interview!
            </div>
          </div>
        </body>
        </html>
        `
    };

    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;

    return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        magicLink
    };
};

/**
 * Sends notification when candidate AI evaluation is complete
 */
export const sendEvaluationNotification = async ({
    candidateEmail,
    companyName = 'Engineering Team',
    roleTitle = 'Software Engineer',
    overallScore = 0,
    verdict = 'Hire',
    sessionId
}) => {
    const frontendUrl = getFrontendUrl();
    const reportLink = `${frontendUrl}/candidate/report/${sessionId}`;

    const mailOptions = {
        from: `"VoxCode Reports" <evaluations@voxcode.ai>`,
        to: candidateEmail,
        subject: `Performance Report Ready: ${roleTitle} at ${companyName}`,
        html: `
        <div style="background-color: #0b0f17; color: #e2e8f0; font-family: sans-serif; padding: 24px;">
          <div style="max-width: 540px; margin: 0 auto; background-color: #121824; border: 1px solid #1e293b; border-radius: 16px; padding: 28px;">
            <h2 style="color: #ffffff; margin-top: 0;">Your Interview Report is Ready!</h2>
            <p style="color: #94a3b8;">Rohan (AI Interviewer) has evaluated your dialogue exchanges, algorithmic correctness, and code architecture for <strong>${roleTitle}</strong> at <strong>${companyName}</strong>.</p>
            <div style="background: #1a2233; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <div style="font-size: 12px; color: #64748b;">Overall Performance Score</div>
              <div style="font-size: 32px; font-weight: 800; color: #38bdf8;">${overallScore}/100</div>
              <div style="font-size: 13px; font-weight: 700; color: #34d399; margin-top: 4px;">Verdict: ${verdict}</div>
            </div>
            <a href="${reportLink}" style="display: block; text-align: center; background: #6366f1; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 0; border-radius: 10px; margin: 20px 0;">View Full Performance Report Card →</a>
          </div>
        </div>
        `
    };

    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;

    return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        reportLink
    };
};
