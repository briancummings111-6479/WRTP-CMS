import { onCall } from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";

interface SendEmailRequest {
    to: string;
    subject: string;
    html: string;
}

export const sendEmailNotification = onCall<SendEmailRequest>(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated");
    }

    const { to, subject, html } = request.data;

    // Check if SMTP configuration is present
    const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || "587");

    if (!smtpUser || !smtpPass) {
        // If no credentials, log the email for debugging/local development
        console.log("---------------------------------------------------");
        console.log("NOTICE: SMTP Credentials not found. Email NOT sent.");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML Body: ${html}`);
        console.log("To fix, set SMTP_USER and SMTP_PASS environment variables.");
        console.log("---------------------------------------------------");
        return { success: true, message: "Email logged (SMTP not configured)" };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"WRTP CMS" <noreply@wrtp-cms.com>',
            to,
            subject,
            html,
        });

        console.log(`Email sent to ${to}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error sending email:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
});
