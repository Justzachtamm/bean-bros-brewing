const db = require("./db");

// Called only after requireSession has established verified email ownership.
async function checkoutCustomer(stripe, user) {
  if (!user?.emailVerified) throw new Error("Verify your email before checkout.");
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const existing = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = existing.data[0] || await stripe.customers.create(
    { email: user.email, name: user.name, metadata: { account_id: user.id } },
    { idempotencyKey: `account-customer-${user.id}` }
  );
  const row = await db.one(`UPDATE accounts SET stripe_customer_id = COALESCE(stripe_customer_id, $2)
    WHERE id = $1 AND email_verified_at IS NOT NULL RETURNING stripe_customer_id`, [user.id, customer.id]);
  if (!row) throw new Error("Account is unavailable.");
  return row.stripe_customer_id;
}

module.exports = { checkoutCustomer };
