import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

if (!smtpHost || !smtpUser || !smtpPassword) {
  console.warn('SMTP not configured. Email sending will fail.');
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(smtpPort),
  secure: smtpPort === '465', // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

export const emailConfig = {
  from: smtpFrom,
};
