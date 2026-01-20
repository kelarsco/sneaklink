import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter for sending emails
const createTransporter = () => {
  // Check if email credentials are configured
  // Support both EMAIL_APP_PASSWORD (preferred) and EMAIL_PASSWORD (fallback)
  const emailPassword = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;
  
  // Support for professional email services (SendGrid, AWS SES, Mailgun)
  // SendGrid
  if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // AWS SES
  if (process.env.EMAIL_SERVICE === 'ses' && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return nodemailer.createTransport({
      host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: parseInt(process.env.AWS_SES_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.AWS_ACCESS_KEY_ID,
        pass: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // Mailgun
  if (process.env.EMAIL_SERVICE === 'mailgun' && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return nodemailer.createTransport({
      host: `smtp.mailgun.org`,
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_USER || `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY,
      },
    });
  }

  // Gmail or generic SMTP (fallback)
  if (!process.env.EMAIL_USER || !emailPassword) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env');
  }
  
  // Common SMTP options for better connection handling - increased timeouts for Gmail
  const smtpOptions = {
    connectionTimeout: 30000, // 30 seconds (increased for Gmail)
    greetingTimeout: 30000, // 30 seconds (increased for Gmail)
    socketTimeout: 30000, // 30 seconds (increased for Gmail)
    pool: true, // Use connection pooling
    maxConnections: 1,
    maxMessages: 3,
    rateDelta: 1000,
    rateLimit: 5,
  };
  
  if (process.env.EMAIL_SERVICE === 'gmail' || !process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword, // Use App Password for Gmail
      },
      ...smtpOptions,
    });
  }

  // Generic SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPassword,
    },
    ...smtpOptions,
  });
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (email, code) => {
  try {
    const transporter = createTransporter();

    // Format "From" field - supports both email and "Name <email>" format
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    // Generate unique Message-ID for better deliverability
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;
    
    // Get unsubscribe URL (if configured)
    const unsubscribeUrl = process.env.UNSUBSCRIBE_URL || `${process.env.FRONTEND_URL || 'https://sneaklink.com'}/unsubscribe?email=${encodeURIComponent(email)}`;

    const frontendUrl = process.env.FRONTEND_URL || 'https://sneaklink.com';
    
    const mailOptions = {
      from: fromField,
      to: email,
      subject: 'Login to Sneaklink',
      // Add proper email headers for better deliverability
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'All',
        // Add custom headers for authentication
        'X-Entity-Ref-ID': `verify-${Date.now()}`,
      },
      // Set reply-to to support email or from email
      replyTo: process.env.EMAIL_REPLY_TO || fromEmail,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SneakLink</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px; background: #ffffff;">
              <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">Login to Sneaklink</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Enter the login code below in your current browser to access your account
              </p>
              
              <!-- Code Box -->
              <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                <h1 style="color: #667eea; font-size: 42px; letter-spacing: 12px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">
                  ${code}
                </h1>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                This code will expire in <strong style="color: #333;">5 minutes</strong>.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; line-height: 1.6;">
                If you didn't request this code, please ignore this email. No further action is required.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
                <a href="${frontendUrl}" style="color: #667eea; text-decoration: none; margin: 0 8px;">Our Website</a> |
                <a href="${frontendUrl}/privacy-policy" style="color: #667eea; text-decoration: none; margin: 0 8px;">Privacy Policy</a> |
                <a href="${frontendUrl}/terms-of-service" style="color: #667eea; text-decoration: none; margin: 0 8px;">Terms of Use</a>
              </p>
              <p style="color: #999; font-size: 11px; margin: 0;">
                © 2025 Sneaklink
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Login to Sneaklink

Enter the login code below in your current browser to access your account

${code}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email. No further action is required.

---
Our Website: ${frontendUrl}
Privacy Policy: ${frontendUrl}/privacy-policy
Terms of Use: ${frontendUrl}/terms-of-service

© 2025 Sneaklink
      `,
    };

    // Verify connection before sending - wrap in timeout to avoid long waits
    try {
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ timeout: true }), 15000);
      });
      
      const result = await Promise.race([verifyPromise, timeoutPromise]);
      
      // If timeout occurred, skip verification and try sending anyway
      if (result && result.timeout) {
        console.warn('Email connection verification timed out, attempting to send anyway...');
      }
    } catch (verifyError) {
      // Only throw if it's an actual auth error, not a timeout
      console.error('Email service connection verification failed:', verifyError);
      if (verifyError.code === 'EAUTH') {
        throw new Error('Email authentication failed. Check EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env. For Gmail, use App Password, not regular password.');
      }
      // For other errors, log but continue - verification is not critical for sending
      console.warn('Verification failed but continuing with send attempt:', verifyError.message);
    }

    const info = await transporter.sendMail(mailOptions);
    // Log removed to prevent terminal clutter
    // Email sent successfully
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env. For Gmail, use App Password, not regular password.');
    }
    
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.message?.includes('socket close') || error.message?.includes('Unexpected socket close')) {
      throw new Error(`Cannot connect to email server. Check SMTP settings (${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'}) or network connection. Error: ${error.message || error.code}`);
    }
    
    // Include the original error message for debugging
    throw new Error(`Failed to send verification email: ${error.message || error.code || 'Unknown error'}`);
  }
};

/**
 * Send subscription receipt email
 */
export const sendSubscriptionReceipt = async (receiptData) => {
  try {
    const transporter = createTransporter();

    // Format "From" field
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    // Generate unique Message-ID
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    // Convert amount from kobo to USD
    const ngnAmount = receiptData.amount / 100;
    const usdAmount = ngnAmount / 1500; // Exchange rate
    
    // Format date
    const paymentDate = new Date(receiptData.paymentDate);
    const formattedDate = paymentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Format plan name
    const planName = receiptData.plan.charAt(0).toUpperCase() + receiptData.plan.slice(1) + ' Plan';
    
    // Receipt download URLs - use full API URLs
    const apiBaseUrl = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3000/api';
    const invoiceUrl = `${apiBaseUrl}/subscriptions/receipt/${receiptData.reference}/invoice?token=TOKEN_PLACEHOLDER`;
    const receiptUrl = `${apiBaseUrl}/subscriptions/receipt/${receiptData.reference}/receipt?token=TOKEN_PLACEHOLDER`;
    
    // Note: In production, these should be authenticated links or the user should be logged in
    // For now, link to the receipt page where users can download
    const receiptPageUrl = `${frontendUrl}/receipt?reference=${receiptData.reference}`;
    
    const mailOptions = {
      from: fromField,
      to: receiptData.email,
      subject: `Invoice Paid - ${receiptData.invoiceNumber}`,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
      },
      replyTo: process.env.EMAIL_REPLY_TO || fromEmail,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #000000;">
            
            <!-- Logo -->
            <div style="margin-bottom: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SneakLink</h1>
            </div>
            
            <!-- Receipt Card -->
            <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with Icon -->
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="position: relative; width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #ffffff; font-size: 12px;">✓</span>
                  </div>
                  <span style="font-size: 24px;">📄</span>
                </div>
                <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 600;">Invoice paid</h1>
              </div>
              
              <!-- Amount -->
              <div style="margin-bottom: 16px;">
                <p style="color: #111827; margin: 0; font-size: 48px; font-weight: 700;">$${usdAmount.toFixed(2)}</p>
              </div>
              
              <!-- View Details Link -->
              <div style="margin-bottom: 32px;">
                <a href="${frontendUrl}/receipt?reference=${receiptData.reference}" style="color: #4b5563; font-size: 14px; text-decoration: none;">View invoice and payment details &gt;</a>
              </div>
              
              <!-- Payment Information -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0 0 16px 0; width: 50%;">
                      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Invoice number</p>
                      <p style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">${receiptData.invoiceNumber}</p>
                    </td>
                    <td style="padding: 0 0 16px 0; width: 50%;">
                      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Payment date</p>
                      <p style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">${formattedDate}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; width: 50%;" colspan="2">
                      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">Payment method</p>
                      <p style="color: #111827; font-size: 14px; font-weight: 500; margin: 0;">${receiptData.paymentMethod}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Download Buttons -->
              <div style="display: flex; gap: 12px;">
                <a href="${receiptPageUrl}" style="flex: 1; display: inline-block; padding: 12px 16px; background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; color: #111827; text-align: center; text-decoration: none; font-size: 14px; font-weight: 500;">View Receipt</a>
                <a href="${receiptPageUrl}" style="flex: 1; display: inline-block; padding: 12px 16px; background-color: #000000; border: 1px solid #000000; border-radius: 6px; color: #ffffff; text-align: center; text-decoration: none; font-size: 14px; font-weight: 500;">Download PDF</a>
              </div>
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 12px; margin-bottom: 0;">Visit the receipt page to download your invoice or receipt as PDF</p>
              
            </div>
            
            <!-- Powered by Paystack -->
            <div style="text-align: center; margin-bottom: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">Powered by Paystack</p>
              <div style="display: flex; justify-content: center; gap: 16px; font-size: 12px;">
                <a href="${frontendUrl}/terms-of-service" style="color: #9ca3af; text-decoration: none;">Terms</a>
                <a href="${frontendUrl}/privacy-policy" style="color: #9ca3af; text-decoration: none;">Privacy</a>
              </div>
            </div>
            
          </div>
        </body>
        </html>
      `,
      text: `
Invoice Paid - ${receiptData.invoiceNumber}

Hello ${receiptData.name},

Your invoice has been paid successfully.

Amount: $${usdAmount.toFixed(2)}
Invoice Number: ${receiptData.invoiceNumber}
Payment Date: ${formattedDate}
Payment Method: ${receiptData.paymentMethod}
Plan: ${planName}

View invoice and payment details: ${receiptPageUrl}
Visit the receipt page to download your invoice or receipt as PDF

Powered by Paystack

---
© 2025 SneakLink
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending subscription receipt email:', error);
    throw error;
  }
};

/**
 * Send ticket reply notification email to user
 * Re-export from services/emailService.js for consistency
 */
export { sendTicketReplyNotification } from '../services/emailService.js';
