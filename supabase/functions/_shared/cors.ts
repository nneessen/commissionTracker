// Shared CORS configuration for edge functions
// Restricts origins to known application domains

const ALLOWED_ORIGINS = [
  "https://www.thestandardhq.com",
  "https://thestandardhq.com",
  "http://localhost:5173", // Local dev
  "http://localhost:3000", // Local dev alt
];

export function getCorsHeaders(
  requestOrigin?: string | null,
): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsResponse(req: Request): Response {
  const origin = req.headers.get("origin");
  return new Response("ok", { headers: getCorsHeaders(origin) });
}
