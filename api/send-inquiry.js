// /api/send-inquiry.js
// Vercel serverless function — receives the sourcing form submission
// and sends it as an email via Resend, using a server-side API key
// (RESEND_API_KEY) that is never exposed to the browser.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, company, email, details } = req.body || {};

    // Basic validation
    if (!name || !email || !details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Very light email sanity check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // Escape basic HTML to avoid injection in the email body
    const escapeHtml = (str = '') =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6;">
        <h2 style="font-family: Georgia, serif; font-weight: 400; letter-spacing: 0.05em;">New Sourcing Request — Meridian</h2>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; vertical-align: top;">Name</td><td style="padding: 6px 0;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; vertical-align: top;">Company</td><td style="padding: 6px 0;">${escapeHtml(company || '—')}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; vertical-align: top;">Email</td><td style="padding: 6px 0;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: bold; vertical-align: top;">Details</td><td style="padding: 6px 0; white-space: pre-wrap;">${escapeHtml(details)}</td></tr>
        </table>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Meridian Sourcing Form <inquiries@mail.meridiangtn.com>',
        to: ['info@meridiangtn.com'],
        reply_to: email,
        subject: `New Sourcing Request from ${name}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error('Resend API error:', errText);
      return res.status(502).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-inquiry error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
