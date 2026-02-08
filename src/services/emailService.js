import { transporter, emailConfig } from '../config/email.js';

/**
 * Sends customer credentials via email
 */
export async function sendCredentialsEmail(email, username, password, businessName) {
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: `Welcome to ${businessName || 'Our Platform'} - Your Account Credentials`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .credentials { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .value { font-family: monospace; background-color: #f3f4f6; padding: 5px 10px; border-radius: 3px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { color: #dc2626; font-weight: bold; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${businessName || 'Our Platform'}!</h1>
            </div>
            <div class="content">
              <p>Your account has been created successfully. Please find your login credentials below:</p>
              
              <div class="credentials">
                <div class="credential-item">
                  <span class="label">Username:</span>
                  <div class="value">${username}</div>
                </div>
                <div class="credential-item">
                  <span class="label">Password:</span>
                  <div class="value">${password}</div>
                </div>
              </div>
              
              <p>You can use these credentials to log in to your account.</p>
              <p class="warning">⚠️ Please change your password after your first login for security.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to ${businessName || 'Our Platform'}!

Your account has been created successfully. Please find your login credentials below:

Username: ${username}
Password: ${password}

You can use these credentials to log in to your account.

⚠️ Please change your password after your first login for security.

This is an automated email. Please do not reply.
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

/**
 * Sends password reset email with reset link
 */
export async function sendPasswordResetEmail(email, resetLink, username) {
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { color: #dc2626; font-weight: bold; margin-top: 15px; }
            .link { word-break: break-all; color: #4f46e5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello${username ? ` ${username}` : ''},</p>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p class="link">${resetLink}</p>
              
              <p class="warning">⚠️ This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset Request

Hello${username ? ` ${username}` : ''},

We received a request to reset your password. Use the link below to reset it:

${resetLink}

⚠️ This link will expire in 1 hour. If you didn't request this, please ignore this email.

This is an automated email. Please do not reply.
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
