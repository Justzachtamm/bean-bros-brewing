const ALLOWED_ORIGINS = ["https://beanbrosbrewingco.com", "http://localhost:8888"];

function corsHeaders(event, extra = {}) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
    ...extra,
  };
}

module.exports = { ALLOWED_ORIGINS, corsHeaders };
