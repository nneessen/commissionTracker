// supabase/functions/terms-of-service/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() => {
  const html = `<!DOCTYPE html>
<html>
<head><title>Terms of Service - The Standard HQ</title></head>
<body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
<h1>Terms of Service</h1>
<p><strong>Last Updated:</strong> January 2026</p>

<h2>Acceptance of Terms</h2>
<p>By using The Standard HQ and connecting your Instagram account, you agree to these terms.</p>

<h2>Service Description</h2>
<p>The Standard HQ provides tools to manage Instagram direct messages for business accounts.</p>

<h2>Your Responsibilities</h2>
<ul>
<li>You must have a valid Instagram Business or Creator account</li>
<li>You are responsible for all messages sent through the platform</li>
<li>You must comply with Instagram's Terms of Service and Community Guidelines</li>
</ul>

<h2>Limitations</h2>
<ul>
<li>We are not responsible for Instagram API downtime or changes</li>
<li>Message delivery is subject to Instagram's 24-hour messaging window policy</li>
</ul>

<h2>Termination</h2>
<p>You may disconnect your Instagram account at any time. We reserve the right to suspend accounts that violate these terms.</p>

<h2>Changes to Terms</h2>
<p>We may update these terms. Continued use constitutes acceptance.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});
