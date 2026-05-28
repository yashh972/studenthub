import nodemailer from 'nodemailer';

/**
 * Sends a premium HTML email containing the verification OTP code.
 * Falls back to console simulation if SMTP credentials are not configured in environment variables.
 * 
 * @param {string} toEmail - The recipient's email address
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<{success: boolean, simulated: boolean}>}
 */
export async function sendOTPEmail(toEmail, otpCode) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Fallback if environment variables are not configured
  if (!smtpUser || !smtpPass) {
    console.log('\n==================================================');
    console.log(`📩 [FALLBACK SIMULATION] Sent OTP Verification to: ${toEmail}`);
    console.log(`🔑 Verification OTP Code: [ ${otpCode} ] (Expires in 10 mins)`);
    console.log('💡 Note: Configure SMTP_USER and SMTP_PASS in your .env file to enable real email sending.');
    console.log('==================================================\n');
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // Use secure SSL for port 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"StudyHUB Support" <${smtpUser}>`,
      to: toEmail,
      subject: 'Verify your StudyHUB Account',
      text: `Welcome to StudyHUB! Your verification OTP code is: ${otpCode}. It expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background-color: #0b0f19;
              color: #e5e7eb;
              margin: 0;
              padding: 0;
            }
            .wrapper {
              background-color: #0b0f19;
              width: 100%;
              table-layout: fixed;
              padding: 40px 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #111827;
              border: 1px solid #1f2937;
              border-radius: 16px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
            }
            .logo {
              font-size: 28px;
              font-weight: 800;
              color: #8b5cf6;
              margin-bottom: 24px;
              letter-spacing: -0.05em;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 16px;
              color: #ffffff;
            }
            .text {
              font-size: 16px;
              color: #9ca3af;
              line-height: 1.6;
              margin-bottom: 32px;
            }
            .otp-container {
              background: rgba(139, 92, 246, 0.1);
              border: 2px dashed rgba(139, 92, 246, 0.4);
              border-radius: 12px;
              padding: 20px 30px;
              margin: 24px auto;
              display: inline-block;
            }
            .otp-code {
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 8px;
              color: #a78bfa;
              font-family: 'Courier New', Courier, monospace;
            }
            .footer {
              font-size: 12px;
              color: #4b5563;
              margin-top: 40px;
              border-top: 1px solid #1f2937;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="logo">StudyHUB</div>
              <div class="title">Verify Your Email Address</div>
              <p class="text">
                Welcome to StudyHub! To complete your sign-up and secure your student account, please use the 6-digit verification code below. This code will expire in 10 minutes.
              </p>
              <div class="otp-container">
                <span class="otp-code">${otpCode}</span>
              </div>
              <p class="text">If you did not request this code, you can safely ignore this email.</p>
              <div class="footer">
                &copy; 2026 StudyHub. All rights reserved.<br>
                Empowering student collaboration and learning.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, simulated: false };
  } catch (error) {
    console.error('❌ Error sending real OTP email through SMTP:', error);
    // If real email sending fails, we can print a simulation fallback message so testing isn't blocked
    console.log('\n==================================================');
    console.log(`📩 [ERROR FALLBACK SIMULATION] Sent OTP Verification to: ${toEmail}`);
    console.log(`🔑 Verification OTP Code: [ ${otpCode} ] (Expires in 10 mins)`);
    console.log('==================================================\n');
    return { success: false, simulated: true, error: error.message };
  }
}
