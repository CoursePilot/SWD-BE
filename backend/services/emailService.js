const { Resend } = require('resend');

// Initialize a single Resend client instance for reuse
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(toEmail, verifyUrl) {
  const fromEmail = process.env.EMAIL_FROM;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <h2>Email Verification</h2>
      <p>Vui lòng nhấn vào liên kết dưới đây để xác minh email của bạn:</p>
      <p><a href="${verifyUrl}" target="_blank">Xác minh email</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Xác minh email',
      html,
    });
    if (error) {
      console.error('[Resend] Verification email failed:', { to: toEmail, error });
      throw error;
    }
    console.log('[Resend] Verification email sent:', { to: toEmail, id: data?.id, data });
  } catch (error) {
    console.error('[Resend] Verification email failed (exception):', { to: toEmail, error: error?.message || error });
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendEmailOtp,
};

async function sendEmailOtp(toEmail, code) {
  const fromEmail = process.env.EMAIL_FROM;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <h2>Mã xác thực (OTP)</h2>
      <p>Vui lòng dùng mã sau để xác minh email của bạn. Mã có hiệu lực trong 10 phút.</p>
      <div style="font-size:24px;font-weight:bold;letter-spacing:6px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block">${code}</div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Mã xác thực email (OTP)',
      html,
    });
    if (error) {
      console.error('[Resend] OTP email failed:', { to: toEmail, error });
      throw error;
    }
    console.log('[Resend] OTP email sent:', { to: toEmail, id: data?.id, data });
  } catch (error) {
    console.error('[Resend] OTP email failed (exception):', { to: toEmail, error: error?.message || error });
    throw error;
  }
}


