const nodemailer = require('nodemailer');

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendVerificationEmail(toEmail, verifyUrl) {
  const transporter = createTransport();
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <h2>Email Verification</h2>
      <p>Vui lòng nhấn vào liên kết dưới đây để xác minh email của bạn:</p>
      <p><a href="${verifyUrl}" target="_blank">Xác minh email</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: 'Xác minh email',
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendEmailOtp,
};

async function sendEmailOtp(toEmail, code) {
  const transporter = createTransport();
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <h2>Mã xác thực (OTP)</h2>
      <p>Vui lòng dùng mã sau để xác minh email của bạn. Mã có hiệu lực trong 10 phút.</p>
      <div style="font-size:24px;font-weight:bold;letter-spacing:6px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block">${code}</div>
    </div>
  `;

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: 'Mã xác thực email (OTP)',
    html,
  });
}


