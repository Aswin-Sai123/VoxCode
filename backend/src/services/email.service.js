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

const cleanHeader = (val) => String(val || '').replace(/[\r\n]+/g, ' ').trim();

/**
 * Formats a Date object or ISO string into a clean readable date/time (e.g. "Sat, Oct 31, 2026 at 2:30 PM UTC")
 */
const formatDateTime = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toUTCString().replace(':00 GMT', ' GMT');
};

/**
 * Sends a candidate invitation email with schedule, timings, and 1-click magic link
 */
export const sendAssessmentInvite = async ({
    candidateEmail,
    companyName = 'Engineering Team',
    roleTitle = 'Software Engineer',
    assessmentTitle = 'Technical Assessment',
    assessmentCode,
    durationMinutes = 45,
    customMessage = '',
    openingTime = null,
    closingTime = null
}) => {
    const frontendUrl = getFrontendUrl();
    const safeCode = cleanHeader(assessmentCode);
    const safeCompany = cleanHeader(companyName);
    const safeRole = cleanHeader(roleTitle);
    const safeEmail = cleanHeader(candidateEmail);
    const magicLink = `${frontendUrl}/candidate/assessment/${safeCode}`;

    const formattedOpen = formatDateTime(openingTime);
    const formattedClose = formatDateTime(closingTime);

    let scheduleText = '';
    if (formattedOpen || formattedClose) {
        scheduleText = `
        <p style="margin: 12px 0 6px 0; color: #333333; font-size: 14px;"><strong>Interview Schedule:</strong></p>
        <ul style="margin: 0 0 16px 20px; padding: 0; color: #444444; font-size: 14px; line-height: 1.5;">
            ${formattedOpen ? `<li><strong>Opens:</strong> ${formattedOpen}</li>` : ''}
            ${formattedClose ? `<li><strong>Deadline:</strong> ${formattedClose}</li>` : ''}
        </ul>
        `;
    }

    const mailOptions = {
        from: `"${safeCompany}" <no-reply@voxcode.ai>`,
        to: safeEmail,
        subject: `Interview Invitation: ${safeRole} - ${safeCompany}`,
        text: `Hi,\n\nYou have been invited to complete a technical interview for the ${safeRole} position at ${safeCompany}.\n\nDuration: ${durationMinutes} minutes\n${formattedOpen ? `Opens: ${formattedOpen}\n` : ''}${formattedClose ? `Deadline: ${formattedClose}\n` : ''}\nYou can start your interview directly by clicking the link below:\n${magicLink}\n\nYour Assessment Code: ${safeCode}\n\nBest regards,\n${safeCompany} Recruiting Team`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222222; background-color: #ffffff; margin: 0; padding: 24px; font-size: 14px; line-height: 1.6;">
          <p>Hi,</p>

          <p>You have been invited by <strong>${safeCompany}</strong> to complete a technical interview for the <strong>${safeRole}</strong> role.</p>

          ${customMessage ? `<p style="color: #555555; border-left: 2px solid #0066cc; padding-left: 10px; margin: 14px 0;">${customMessage}</p>` : ''}

          <p style="margin: 14px 0 6px 0;"><strong>Details:</strong></p>
          <ul style="margin: 0 0 16px 20px; padding: 0; color: #444444;">
            <li><strong>Role:</strong> ${safeRole}</li>
            <li><strong>Company:</strong> ${safeCompany}</li>
            <li><strong>Duration:</strong> ${durationMinutes} minutes</li>
            <li><strong>Assessment Code:</strong> ${safeCode}</li>
          </ul>

          ${scheduleText}

          <p style="margin: 20px 0;">
            Please click the link below to begin your interview:
            <br>
            <a href="${magicLink}" style="color: #0066cc; text-decoration: underline; font-weight: 500; font-size: 15px; word-break: break-all;">
              ${magicLink}
            </a>
          </p>

          <p style="margin-top: 28px; color: #666666; font-size: 13px;">
            Best regards,<br>
            <strong>${safeCompany} Recruiting Team</strong>
          </p>
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
    const safeRole = cleanHeader(roleTitle);
    const safeCompany = cleanHeader(companyName);
    const safeEmail = cleanHeader(candidateEmail);
    const reportLink = `${frontendUrl}/candidate/report/${sessionId}`;

    const mailOptions = {
        from: `"VoxCode Reports" <evaluations@voxcode.ai>`,
        to: safeEmail,
        subject: `Performance Report Ready: ${safeRole} at ${safeCompany}`,
        html: `
        <div style="background-color: #0b0f17; color: #e2e8f0; font-family: sans-serif; padding: 24px;">
          <div style="max-width: 540px; margin: 0 auto; background-color: #121824; border: 1px solid #1e293b; border-radius: 16px; padding: 28px;">
            <h2 style="color: #ffffff; margin-top: 0;">Your Interview Report is Ready!</h2>
            <p style="color: #94a3b8;">Your technical interview session has been thoroughly evaluated, algorithmic correctness, and code architecture for <strong>${roleTitle}</strong> at <strong>${companyName}</strong>.</p>
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
