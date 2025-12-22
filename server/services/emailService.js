import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  // Check if email credentials are configured
  // Support both EMAIL_APP_PASSWORD (preferred) and EMAIL_PASSWORD (fallback)
  const emailPassword = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;
  
  if (!process.env.EMAIL_USER || !emailPassword) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env');
  }

  // Use Gmail SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: emailPassword, // Gmail App Password (not regular password)
    },
  });
};

/**
 * Send contact form email notification
 * @param {Object} contactData - Contact form data
 * @param {string} contactData.name - Sender's name
 * @param {string} contactData.email - Sender's email
 * @param {string} contactData.message - Message content
 * @param {string} [contactData.subject] - Optional subject (for support form)
 * @param {string} [contactData.source] - Source of contact (homepage or account)
 * @returns {Promise<Object>} - Email send result
 */
export const sendContactEmail = async (contactData) => {
  try {
    const { name, email, message, subject, source = 'homepage' } = contactData;
    
    // Validate required fields
    if (!name || !email || !message) {
      throw new Error('Missing required fields: name, email, message');
    }

    const transporter = createTransporter();
    const recipientEmail = process.env.ADMIN_EMAIL || 'dkelaroma@gmail.com';

    // Determine email subject
    const emailSubject = subject 
      ? `[SneakLink Support] ${subject}`
      : `[SneakLink Contact] Message from ${name}`;

    // Format email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00E1FF;">New Contact Form Submission</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Source:</strong> ${source === 'account' ? 'Account Dashboard' : 'Homepage'}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
          <p><strong>Message:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          You can reply directly to this email to respond to ${name} at ${email}
        </p>
      </div>
    `;

    const emailText = `
New Contact Form Submission

Source: ${source === 'account' ? 'Account Dashboard' : 'Homepage'}
Name: ${name}
Email: ${email}
${subject ? `Subject: ${subject}\n` : ''}
Message:
${message}

---
You can reply directly to this email to respond to ${name} at ${email}
    `;

    // Generate unique Message-ID for better deliverability
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${process.env.EMAIL_USER.split('@')[1] || 'sneaklink.com'}>`;

    // Send email
    const info = await transporter.sendMail({
      from: `"SneakLink Contact" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      replyTo: email, // Allow direct reply to customer
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `contact-${Date.now()}`,
      },
    });

    console.log('✅ Contact email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending contact email:', error);
    throw error;
  }
};

/**
 * Send ticket reply notification email to user
 * @param {Object} data - Ticket reply data
 * @param {string} data.userEmail - User's email
 * @param {string} data.userName - User's name
 * @param {string} data.ticketId - Ticket ID
 * @param {string} data.subject - Ticket subject
 * @param {string} data.adminMessage - Admin's reply message
 * @param {string} data.ticketUrl - URL to view ticket
 * @returns {Promise<Object>} - Email send result
 */
export const sendTicketReplyNotification = async (data) => {
  try {
    const { userEmail, userName, ticketId, subject, adminMessage, ticketUrl } = data;
    
    if (!userEmail || !userName || !ticketId || !adminMessage) {
      throw new Error('Missing required fields for ticket reply notification');
    }

    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Support';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SneakLink Support</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">New Reply to Your Support Ticket</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${userName},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We've responded to your support ticket <strong>${ticketId}</strong> regarding "${subject}".
            </p>
            
            <!-- Reply Box -->
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #333; font-size: 16px; line-height: 1.8; margin: 0;">
                ${adminMessage.replace(/\n/g, '<br>')}
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ticketUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Ticket & Reply
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6;">
              You can reply to this ticket by clicking the button above or visiting your account dashboard.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
            <p style="color: #999; font-size: 11px; margin: 0;">
              Ticket ID: ${ticketId}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
SneakLink Support - New Reply to Your Ticket

Hi ${userName},

We've responded to your support ticket ${ticketId} regarding "${subject}".

Reply:
${adminMessage}

View your ticket and reply: ${ticketUrl}

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
Ticket ID: ${ticketId}
    `;

    const info = await transporter.sendMail({
      from: fromField,
      to: userEmail,
      subject: `Re: ${subject} [Ticket: ${ticketId}]`,
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `ticket-reply-${Date.now()}`,
      },
      replyTo: fromEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending ticket reply notification:', error);
    throw error;
  }
};

/**
 * Send new ticket notification to admin
 * @param {Object} data - Ticket data
 * @param {string} data.ticketId - Ticket ID
 * @param {string} data.userName - User's name
 * @param {string} data.userEmail - User's email
 * @param {string} data.subject - Ticket subject
 * @param {string} data.message - Ticket message
 * @returns {Promise<Object>} - Email send result
 */
export const sendNewTicketNotification = async (data) => {
  try {
    const { ticketId, userName, userEmail, subject, message } = data;
    
    if (!ticketId || !userName || !userEmail || !subject || !message) {
      throw new Error('Missing required fields for new ticket notification');
    }

    const transporter = createTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || 'dkelaroma@gmail.com';
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Support';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    // Create deep link to ticket - will redirect to login if not authenticated, then to ticket
    const ticketDeepLink = `${frontendUrl}/manager/login?redirect=/manager/support&ticket=${ticketId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔔 New Support Ticket</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">New Support Request Received</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              A new support ticket has been created and requires your attention.
            </p>
            
            <!-- Ticket Info Box -->
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <div style="margin-bottom: 12px;">
                <strong style="color: #333; font-size: 14px;">Ticket ID:</strong>
                <span style="color: #667eea; font-family: monospace; font-weight: bold; margin-left: 8px;">${ticketId}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #333; font-size: 14px;">From:</strong>
                <span style="color: #666; margin-left: 8px;">${userName} (${userEmail})</span>
              </div>
              <div>
                <strong style="color: #333; font-size: 14px;">Subject:</strong>
                <span style="color: #666; margin-left: 8px;">${subject}</span>
              </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ticketDeepLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Reply in Dashboard
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6; text-align: center;">
              Click the button above to login and view this ticket in your admin dashboard.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
            <p style="color: #999; font-size: 11px; margin: 0;">
              Ticket ID: ${ticketId}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
🔔 New Support Ticket

A new support ticket has been created and requires your attention.

Ticket ID: ${ticketId}
From: ${userName} (${userEmail})
Subject: ${subject}

Reply in dashboard: ${ticketDeepLink}

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
Ticket ID: ${ticketId}
    `;

    const info = await transporter.sendMail({
      from: fromField,
      to: adminEmail,
      subject: `🔔 New Support Ticket: ${ticketId} - ${subject}`,
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `new-ticket-${Date.now()}`,
      },
      // No replyTo - admin should use dashboard to respond
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending new ticket notification:', error);
    throw error;
  }
};

/**
 * Send staff invitation email
 * @param {Object} data - Staff invitation data
 * @param {string} data.staffName - Staff member's name
 * @param {string} data.staffEmail - Staff member's email
 * @param {string} data.role - Staff role
 * @param {string} data.acceptUrl - URL to accept invitation
 * @returns {Promise<Object>} - Email send result
 */
export const sendStaffInvitation = async (data) => {
  try {
    const { staffName, staffEmail, role, acceptUrl } = data;
    
    if (!staffName || !staffEmail || !acceptUrl) {
      throw new Error('Missing required fields for staff invitation');
    }

    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Admin';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SneakLink Staff Invitation</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">You've been invited to join SneakLink!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${staffName},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You've been invited to join the SneakLink team as a <strong>${role}</strong> staff member. 
              Click the button below to accept this invitation and set up your account.
            </p>
            
            <!-- Info Box -->
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #333; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                Once you accept, you'll be able to access the admin dashboard and help manage the platform.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6; text-align: center;">
              This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px; line-height: 1.6;">
              <strong>Note:</strong> After accepting, you'll be able to login without a password. Your access is managed by the admin.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
SneakLink Staff Invitation

Hi ${staffName},

You've been invited to join the SneakLink team as a ${role} staff member. 
Click the link below to accept this invitation and set up your account.

Accept Invitation: ${acceptUrl}

This invitation link will expire in 7 days.

Note: After accepting, you'll be able to login without a password. Your access is managed by the admin.

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
    `;

    // Verify connection before sending - wrap in timeout to avoid long waits (same as verification code)
    try {
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ timeout: true }), 15000);
      });
      
      const result = await Promise.race([verifyPromise, timeoutPromise]);
      
      // If timeout occurred, skip verification and try sending anyway
      if (result && result.timeout) {
        console.warn('Email connection verification timed out for staff invitation, attempting to send anyway...');
      }
    } catch (verifyError) {
      // Only throw if it's an actual auth error, not a timeout
      console.error('Email service connection verification failed for staff invitation:', verifyError);
      if (verifyError.code === 'EAUTH') {
        throw new Error('Email authentication failed. Check EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env. For Gmail, use App Password, not regular password.');
      }
      // For other errors, log but continue - verification is not critical for sending
      console.warn('Verification failed but continuing with send attempt:', verifyError.message);
    }

    const info = await transporter.sendMail({
      from: fromField,
      to: staffEmail,
      subject: `SneakLink Staff Invitation - Join as ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `staff-invite-${Date.now()}`,
      },
      replyTo: fromEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending staff invitation:', error);
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check EMAIL_USER and EMAIL_APP_PASSWORD (or EMAIL_PASSWORD) in server/.env. For Gmail, use App Password, not regular password.');
    }
    
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.message?.includes('socket close') || error.message?.includes('Unexpected socket close')) {
      throw new Error(`Cannot connect to email server. Check SMTP settings (${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'}) or network connection. Error: ${error.message || error.code}`);
    }
    
    // Include the original error message for debugging
    throw new Error(`Failed to send staff invitation email: ${error.message || error.code || 'Unknown error'}`);
  }
};

/**
 * Send staff welcome email with dashboard login link
 * @param {Object} data - Staff welcome data
 * @param {string} data.staffName - Staff member's name
 * @param {string} data.staffEmail - Staff member's email
 * @param {string} data.role - Staff role
 * @param {string} data.loginUrl - URL to login to dashboard
 * @returns {Promise<Object>} - Email send result
 */
export const sendStaffWelcomeEmail = async (data) => {
  try {
    const { staffName, staffEmail, role, loginUrl } = data;
    
    if (!staffName || !staffEmail || !loginUrl) {
      throw new Error('Missing required fields for staff welcome email');
    }

    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Admin';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to SneakLink!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">Your Access is Ready</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${staffName},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Great news! Your invitation has been accepted and your staff account is now active. 
              You can now access the SneakLink admin dashboard.
            </p>
            
            <!-- Info Box -->
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #333; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}
              </p>
              <p style="color: #666; font-size: 14px; margin: 0;">
                You can login using your email address: <strong>${staffEmail}</strong>
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Login to Dashboard
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6; text-align: center;">
              Click the button above to access the admin dashboard. You can use this login link anytime until your access is revoked.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin-top: 20px;">
              <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>Login Instructions:</strong><br>
                1. Click the "Login to Dashboard" button above<br>
                2. Select the "Staff" tab on the login page<br>
                3. Enter your email: <strong>${staffEmail}</strong><br>
                4. No password required - your access is managed by the admin
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
            <p style="color: #999; font-size: 11px; margin: 0;">
              This login link will remain active until your staff access is removed by an administrator.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Welcome to SneakLink!

Hi ${staffName},

Great news! Your invitation has been accepted and your staff account is now active. 
You can now access the SneakLink admin dashboard.

Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Email: ${staffEmail}

Login to Dashboard: ${loginUrl}

Login Instructions:
1. Click the login link above
2. Select the "Staff" tab on the login page
3. Enter your email: ${staffEmail}
4. No password required - your access is managed by the admin

This login link will remain active until your staff access is removed by an administrator.

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
    `;

    const info = await transporter.sendMail({
      from: fromField,
      to: staffEmail,
      subject: `Welcome to SneakLink - Access Your Dashboard`,
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `staff-welcome-${Date.now()}`,
      },
      replyTo: fromEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending staff welcome email:', error);
    throw error;
  }
};

/**
 * Send account status change notification
 * @param {Object} data - Account status notification data
 * @param {string} data.userName - User's name
 * @param {string} data.userEmail - User's email
 * @param {string} data.accountStatus - New account status (suspended/deactivated)
 * @param {string} data.notificationType - Type of notification
 * @param {string} data.violationReason - Reason for status change
 * @param {Array} data.resolutionSteps - Steps to resolve
 * @param {string} data.plan - User's subscription plan
 * @param {number} data.maxDevices - Max devices allowed
 * @param {string} [data.adminCaseId] - Admin case ID if applicable
 * @param {string} data.violationDate - Date of violation
 * @returns {Promise<Object>} - Email send result
 */
export const sendAccountStatusNotification = async (data) => {
  try {
    const {
      userName,
      userEmail,
      accountStatus,
      notificationType,
      violationReason,
      resolutionSteps,
      plan,
      maxDevices,
      adminCaseId,
      violationDate,
    } = data;

    if (!userName || !userEmail || !accountStatus) {
      throw new Error('Missing required fields for account status notification');
    }

    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Security';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    // For suspended/deactivated users, link to homepage with support modal trigger
    const supportUrl = `${frontendUrl}/?support=${accountStatus}`;
    const termsUrl = `${frontendUrl}/terms`;
    const accountUrl = `${frontendUrl}/account`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    // Determine status title and color
    const statusInfo = {
      suspended: {
        title: 'Account Suspended',
        color: '#ff9800',
        bgColor: '#fff3cd',
        borderColor: '#ffc107',
      },
      deactivated: {
        title: 'Account Deactivated',
        color: '#dc3545',
        bgColor: '#f8d7da',
        borderColor: '#dc3545',
      },
    };

    const status = statusInfo[accountStatus] || statusInfo.suspended;
    const isDeactivated = accountStatus === 'deactivated';

    // Build resolution steps HTML
    const resolutionStepsHtml = resolutionSteps
      .map((step, index) => `
        <li style="color: #333; font-size: 15px; line-height: 1.8; margin-bottom: 10px;">
          <strong style="color: #667eea;">${index + 1}.</strong> ${step}
        </li>
      `)
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${status.title}</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${userName},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We're writing to inform you that your SneakLink account has been ${accountStatus === 'deactivated' ? 'deactivated' : 'suspended'}.
            </p>
            
            <!-- Status Alert Box -->
            <div style="background: ${status.bgColor}; border-left: 4px solid ${status.borderColor}; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: ${status.color}; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
                ${status.title}
              </p>
              <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">
                ${violationReason}
              </p>
              ${violationDate ? `
                <p style="color: #666; font-size: 13px; margin: 10px 0 0 0;">
                  Date: ${new Date(violationDate).toLocaleString()}
                </p>
              ` : ''}
            </div>

            ${notificationType === 'auto_suspension_device' ? `
              <!-- Device Limit Info -->
              <div style="background: #e7f3ff; border-left: 4px solid #2196f3; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #333; font-size: 15px; margin: 0 0 10px 0;">
                  <strong>Your Current Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                </p>
                <p style="color: #666; font-size: 14px; margin: 0;">
                  Device Limit: ${maxDevices === -1 ? 'Unlimited' : maxDevices} simultaneous device${maxDevices === 1 ? '' : 's'}
                </p>
              </div>
            ` : ''}

            ${adminCaseId ? `
              <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center;">
                <p style="color: #666; font-size: 13px; margin: 0;">
                  <strong>Case ID:</strong> ${adminCaseId}
                </p>
              </div>
            ` : ''}

            <!-- Resolution Steps -->
            <div style="margin: 30px 0;">
              <h3 style="color: #333; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
                How to Resolve This Issue
              </h3>
              <ol style="padding-left: 20px; margin: 0;">
                ${resolutionStepsHtml}
              </ol>
            </div>

            <!-- Support Contact -->
            <div style="background: #f8f9fa; padding: 20px; margin: 30px 0; border-radius: 4px; text-align: center;">
              <p style="color: #333; font-size: 15px; margin: 0 0 15px 0;">
                <strong>Need Help?</strong>
              </p>
              <a href="${supportUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 5px;">
                Contact Support
              </a>
              ${!isDeactivated ? `
                <a href="${accountUrl}" style="display: inline-block; background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 5px;">
                  View Account
                </a>
              ` : ''}
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6;">
              If you believe this action was taken in error, please contact our support team immediately. 
              ${isDeactivated ? 'Deactivated accounts cannot be restored without admin review.' : 'Suspended accounts may be restored after review.'}
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
            <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">
              <a href="${termsUrl}" style="color: #667eea; text-decoration: none;">Terms of Service</a> | 
              <a href="${supportUrl}" style="color: #667eea; text-decoration: none;">Support</a>
            </p>
            <p style="color: #999; font-size: 10px; margin: 5px 0 0 0;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
${status.title}

Hi ${userName},

We're writing to inform you that your SneakLink account has been ${accountStatus === 'deactivated' ? 'deactivated' : 'suspended'}.

Reason:
${violationReason}

${violationDate ? `Date: ${new Date(violationDate).toLocaleString()}\n` : ''}

${notificationType === 'auto_suspension_device' ? `
Your Current Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
Device Limit: ${maxDevices === -1 ? 'Unlimited' : maxDevices} simultaneous device${maxDevices === 1 ? '' : 's'}
` : ''}

${adminCaseId ? `Case ID: ${adminCaseId}\n` : ''}

How to Resolve This Issue:
${resolutionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Need Help?
Contact Support: ${supportUrl}
${!isDeactivated ? `View Account: ${accountUrl}\n` : ''}

If you believe this action was taken in error, please contact our support team immediately.
${isDeactivated ? 'Deactivated accounts cannot be restored without admin review.' : 'Suspended accounts may be restored after review.'}

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
Terms of Service: ${termsUrl}
Support: ${supportUrl}

This is an automated notification. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: fromField,
      to: userEmail,
      subject: `${status.title} - Action Required`,
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `account-status-${Date.now()}`,
      },
      replyTo: fromEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending account status notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send account restoration notification
 * @param {Object} data - Account restoration notification data
 * @param {string} data.userName - User's name
 * @param {string} data.userEmail - User's email
 * @param {string} data.previousStatus - Previous account status (suspended/deactivated)
 * @returns {Promise<Object>} - Email send result
 */
export const sendAccountRestorationNotification = async (data) => {
  try {
    const { userName, userEmail, previousStatus } = data;

    if (!userName || !userEmail) {
      throw new Error('Missing required fields for account restoration notification');
    }

    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'SneakLink Support';
    const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const loginUrl = `${frontendUrl}/login`;
    const accountUrl = `${frontendUrl}/account`;

    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1] || 'sneaklink.com'}>`;

    const statusText = previousStatus === 'deactivated' ? 'deactivated' : 'suspended';
    const restorationDate = new Date().toLocaleString();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Account Restored</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px; background: #ffffff;">
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${userName},
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Great news! Your SneakLink account has been restored and is now active again.
            </p>
            
            <!-- Success Alert Box -->
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #065f46; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
                Account Successfully Restored
              </p>
              <p style="color: #047857; font-size: 15px; line-height: 1.6; margin: 0;">
                Your account that was previously ${statusText} has been restored. You can now access all features and services again.
              </p>
              <p style="color: #666; font-size: 13px; margin: 10px 0 0 0;">
                Restored on: ${restorationDate}
              </p>
            </div>

            <!-- What's Next -->
            <div style="margin: 30px 0;">
              <h3 style="color: #333; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
                What's Next?
              </h3>
              <ul style="padding-left: 20px; margin: 0; color: #333;">
                <li style="font-size: 15px; line-height: 1.8; margin-bottom: 10px;">
                  You can now log in to your account and access all features
                </li>
                <li style="font-size: 15px; line-height: 1.8; margin-bottom: 10px;">
                  Your subscription and account settings have been preserved
                </li>
                <li style="font-size: 15px; line-height: 1.8; margin-bottom: 10px;">
                  If you have any questions, our support team is here to help
                </li>
              </ul>
            </div>

            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 5px;">
                Login to Your Account
              </a>
              <a href="${accountUrl}" style="display: inline-block; background: #6c757d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 5px;">
                View Account
              </a>
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6;">
              Thank you for your patience. We're glad to have you back!
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} SneakLink. All rights reserved.
            </p>
            <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">
              <a href="${frontendUrl}" style="color: #10b981; text-decoration: none;">Visit SneakLink</a> | 
              <a href="${frontendUrl}/support" style="color: #10b981; text-decoration: none;">Support</a>
            </p>
            <p style="color: #999; font-size: 10px; margin: 5px 0 0 0;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Account Restored

Hi ${userName},

Great news! Your SneakLink account has been restored and is now active again.

Account Successfully Restored

Your account that was previously ${statusText} has been restored. You can now access all features and services again.

Restored on: ${restorationDate}

What's Next?
- You can now log in to your account and access all features
- Your subscription and account settings have been preserved
- If you have any questions, our support team is here to help

Login to Your Account: ${loginUrl}
View Account: ${accountUrl}

Thank you for your patience. We're glad to have you back!

---
© ${new Date().getFullYear()} SneakLink. All rights reserved.
Visit SneakLink: ${frontendUrl}
Support: ${frontendUrl}/support

This is an automated notification. Please do not reply to this email.
    `;

    const info = await transporter.sendMail({
      from: fromField,
      to: userEmail,
      subject: 'Your SneakLink Account Has Been Restored',
      html: emailHtml,
      text: emailText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SneakLink Email Service',
        'X-Priority': '1',
        'X-Auto-Response-Suppress': 'All',
        'X-Entity-Ref-ID': `account-restore-${Date.now()}`,
      },
      replyTo: fromEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending account restoration notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 */
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};
