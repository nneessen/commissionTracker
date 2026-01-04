// supabase/functions/privacy-policy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() => {
  const html = `<!DOCTYPE html>
<html>
<head><title>Privacy Policy - The Standard HQ</title></head>
<body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> January 2026</p>

<h2>Information We Collect</h2>
<p>When you connect your Instagram account, we access:</p>
<ul>
<li>Your Instagram business profile information</li>
<li>Direct messages sent to your business account</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use this information to:</p>
<ul>
<li>Display and manage your Instagram direct messages</li>
<li>Send messages on your behalf when you compose them</li>
<li>Track conversation history</li>
</ul>

<h2>Data Storage</h2>
<p>Your data is stored securely using Supabase infrastructure with encryption at rest.</p>

<h2>Your Rights</h2>
<p>You can disconnect your Instagram account at any time, which will stop data collection and remove stored access tokens.</p>

<h2>Contact</h2>
<p>For questions, contact us through the app.</p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});
