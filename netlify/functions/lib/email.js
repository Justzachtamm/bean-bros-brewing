const https = require("https");

// Transactional email via Brevo (https://developers.brevo.com/).
//
// Used for the messages our Terms now PROMISE customers: the subscription
// acknowledgment, the annual renewal reminder, and price-change notices. These
// are service messages tied to something the customer bought — they are not
// marketing, they carry no unsubscribe link, and they are sent regardless of
// marketing consent. Anything promotional goes through Brevo's campaign side
// against the opted-in list, never through here.
//
// Requires BREVO_API_KEY. If it is missing, every send becomes a logged no-op
// rather than an exception: a mail outage must never take down checkout or the
// Stripe webhook, because a webhook that 500s gets retried and a retried
// checkout is a far worse problem than a missing email.

const API_HOST = "api.brevo.com";
const API_PATH = "/v3/smtp/email";
const FROM = { name: "Bean Bros Brewing Co.", email: "hello@beanbrosbrewingco.com" };
const REPLY_TO = { email: "hello@beanbrosbrewingco.com" };
const POSTAL_ADDRESS = "Bean Bros Brewing Co., 556 North Route 17, Paramus, NJ 07652";

function isConfigured() {
  return !!process.env.BREVO_API_KEY;
}

function post(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        host: API_HOST,
        path: API_PATH,
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 8000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ ok: true, status: res.statusCode });
          resolve({ ok: false, status: res.statusCode, body: data.slice(0, 300) });
        });
      }
    );
    req.on("timeout", () => { req.destroy(new Error("Brevo request timed out")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Never throws. Returns { ok, skipped?, status?, error? }.
async function send({ to, name, subject, html, text, tag }) {
  if (!isConfigured()) {
    console.warn(`Email skipped (BREVO_API_KEY not set): "${subject}" to ${to}`);
    return { ok: false, skipped: "not configured" };
  }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.warn(`Email skipped (no usable address): "${subject}"`);
    return { ok: false, skipped: "no address" };
  }
  try {
    const result = await post({
      sender: FROM,
      replyTo: REPLY_TO,
      to: [{ email: to, name: name || undefined }],
      subject,
      htmlContent: html,
      textContent: text,
      tags: tag ? [tag] : undefined,
    });
    if (!result.ok) console.error(`Brevo rejected "${subject}" (${result.status}):`, result.body);
    else console.log(`Email sent: "${subject}" to ${to}`);
    return result;
  } catch (err) {
    console.error(`Email failed for "${subject}":`, err.message);
    return { ok: false, error: err.message };
  }
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function shell(bodyHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1612;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;padding:28px;">
<tr><td style="font-family:Georgia,serif;font-size:19px;color:#1a1612;padding-bottom:18px;border-bottom:1px solid #eae5df;">Bean Bros Brewing Co.</td></tr>
<tr><td style="padding-top:20px;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #eae5df;font-size:12px;line-height:1.6;color:#8a8178;">
${esc(POSTAL_ADDRESS)}<br>
<a href="https://beanbrosbrewingco.com" style="color:#8a8178;">beanbrosbrewingco.com</a>
</td></tr></table></td></tr></table></body></html>`;
}

// ---------------------------------------------------------------------------
// Subscription acknowledgment — required by California's AB 2863 and promised
// in our Terms. Must restate the product, the amount, the frequency, that it
// renews automatically, and how to cancel.
// ---------------------------------------------------------------------------
function subscriptionAcknowledgment({ name, items, amount, frequencyLabel, portalUrl }) {
  const lines = (items || []).map((i) => `${i.quantity || 1} × ${i.name}${i.grind ? ` (${i.grind})` : ""}`);
  const listHtml = lines.map((l) => `<li style="margin-bottom:4px;">${esc(l)}</li>`).join("");
  const cancel = portalUrl || "https://beanbrosbrewingco.com/#account";

  const html = shell(`
<p style="margin:0 0 14px;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
<p style="margin:0 0 14px;">Thanks for subscribing. Here's exactly what you signed up for, so it's on the record:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
<tr><td style="font-size:14px;line-height:1.7;">
<strong>What you get:</strong><ul style="margin:6px 0 12px;padding-left:20px;">${listHtml}</ul>
<strong>Amount:</strong> ${esc(money(amount))} per delivery<br>
<strong>How often:</strong> ${esc(frequencyLabel)}<br>
<strong>Renews:</strong> automatically, each period, until you cancel
</td></tr></table>
<p style="margin:0 0 14px;"><strong>Cancelling takes one click.</strong> Open
<a href="${esc(cancel)}" style="color:#8a6d3b;">your account</a> and choose cancel — it stops all future
billing immediately. No phone call, no retention offer, no fee. Or reply to this email and we'll do it for you
within one business day.</p>
<p style="margin:0 0 14px;">There's no minimum and no commitment. You can also change your delivery
frequency or address from the same place.</p>
<p style="margin:0;">— Bean Bros</p>`);

  const text = `${name ? `Hi ${name},` : "Hi,"}

Thanks for subscribing. Here's exactly what you signed up for:

${lines.map((l) => `  - ${l}`).join("\n")}

Amount:     ${money(amount)} per delivery
How often:  ${frequencyLabel}
Renews:     automatically, each period, until you cancel

CANCELLING TAKES ONE CLICK. Open your account and choose cancel — it stops all
future billing immediately. No phone call, no retention offer, no fee:
${cancel}

Or reply to this email and we'll cancel for you within one business day.
There's no minimum and no commitment.

— Bean Bros
${POSTAL_ADDRESS}`;

  return { subject: "Your Bean Bros subscription — the details, and how to cancel", html, text, tag: "subscription-ack" };
}

// ---------------------------------------------------------------------------
// Renewal reminder — AB 2863 requires the product, the amount and frequency of
// the charges, and the means to cancel, in the same medium the customer used.
// ---------------------------------------------------------------------------
function renewalReminder({ name, items, amount, frequencyLabel, portalUrl }) {
  const lines = (items || []).map((i) => `${i.quantity || 1} × ${i.name}`);
  const cancel = portalUrl || "https://beanbrosbrewingco.com/#account";
  const html = shell(`
<p style="margin:0 0 14px;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
<p style="margin:0 0 14px;">A quick, required check-in about your Bean Bros subscription — it's still
running, and we'd rather you hear that from us than from a bank statement.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
<tr><td style="font-size:14px;line-height:1.7;">
<strong>Subscription:</strong> ${esc(lines.join(", ") || "Coffee subscription")}<br>
<strong>Amount:</strong> ${esc(money(amount))} per delivery<br>
<strong>How often:</strong> ${esc(frequencyLabel)}<br>
<strong>Renews:</strong> automatically until cancelled
</td></tr></table>
<p style="margin:0 0 14px;">Happy? Do nothing. Want to stop, pause, or change how often it arrives?
<a href="${esc(cancel)}" style="color:#8a6d3b;">Manage or cancel your subscription</a> — cancelling is
immediate and free, or just reply to this email.</p>
<p style="margin:0;">— Bean Bros</p>`);
  const text = `${name ? `Hi ${name},` : "Hi,"}

A required check-in about your Bean Bros subscription.

Subscription: ${lines.join(", ") || "Coffee subscription"}
Amount:       ${money(amount)} per delivery
How often:    ${frequencyLabel}
Renews:       automatically until cancelled

Happy? Do nothing. Want to stop, pause, or change frequency?
${cancel}

Cancelling is immediate and free, or just reply to this email.

— Bean Bros
${POSTAL_ADDRESS}`;
  return { subject: "Your Bean Bros subscription is still active", html, text, tag: "renewal-reminder" };
}

// ---------------------------------------------------------------------------
// Price change — AB 2863 requires 7–30 days' notice with cancellation info.
// ---------------------------------------------------------------------------
function priceChangeNotice({ name, oldAmount, newAmount, effectiveDate, frequencyLabel, portalUrl }) {
  const cancel = portalUrl || "https://beanbrosbrewingco.com/#account";
  const html = shell(`
<p style="margin:0 0 14px;">${name ? `Hi ${esc(name)},` : "Hi,"}</p>
<p style="margin:0 0 14px;">We're changing the price of your subscription, and you should know before it happens.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;border-radius:8px;padding:16px;margin-bottom:16px;">
<tr><td style="font-size:14px;line-height:1.7;">
<strong>Now:</strong> ${esc(money(oldAmount))} ${esc(frequencyLabel)}<br>
<strong>From ${esc(effectiveDate)}:</strong> ${esc(money(newAmount))} ${esc(frequencyLabel)}
</td></tr></table>
<p style="margin:0 0 14px;">If that doesn't work for you, <a href="${esc(cancel)}" style="color:#8a6d3b;">cancel
before ${esc(effectiveDate)}</a> and you'll never be charged the new amount. Cancelling is immediate and free.</p>
<p style="margin:0;">— Bean Bros</p>`);
  const text = `${name ? `Hi ${name},` : "Hi,"}

We're changing the price of your subscription.

Now:                 ${money(oldAmount)} ${frequencyLabel}
From ${effectiveDate}: ${money(newAmount)} ${frequencyLabel}

If that doesn't work for you, cancel before ${effectiveDate} and you'll never be
charged the new amount. Cancelling is immediate and free:
${cancel}

— Bean Bros
${POSTAL_ADDRESS}`;
  return { subject: `Your Bean Bros subscription price changes on ${effectiveDate}`, html, text, tag: "price-change" };
}

module.exports = {
  send, isConfigured,
  subscriptionAcknowledgment, renewalReminder, priceChangeNotice,
  FROM, POSTAL_ADDRESS,
};
