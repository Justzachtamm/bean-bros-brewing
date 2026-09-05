const { ALLOWED_ORIGINS } = require("./cors");

function isAllowedRedirect(value) {
  try {
    const url = new URL(value);
    const origins = process.env.CONTEXT === "dev"
      ? ALLOWED_ORIGINS : ALLOWED_ORIGINS.filter((o) => o.startsWith("https://"));
    return typeof value === "string" && !url.username && !url.password &&
      origins.includes(url.origin) && url.pathname === "/";
  } catch { return false; }
}

function checkoutSuccessUrl(value) {
  if (!isAllowedRedirect(value)) throw new Error("Invalid redirect URL");
  const url = new URL(value);
  // Keep Stripe's substitution token literal, before the fragment.
  return `${url.origin}/?session_id={CHECKOUT_SESSION_ID}#/checkout-success`;
}

module.exports = { isAllowedRedirect, checkoutSuccessUrl };
