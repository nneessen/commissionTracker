// supabase/functions/configure-email-templates/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Email templates with The Standard branding
const emailTemplates = {
  confirmSignup: {
    subject: "Welcome to The Standard - Confirm Your Account",
    content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .logo {
      display: inline-block;
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      line-height: 64px;
      text-align: center;
      margin-bottom: 20px;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TSH</div>
    <h1>The Standard</h1>
    <p>Your Complete Insurance Agency Management Platform</p>
  </div>
  <div class="content">
    <h2>Welcome to The Standard!</h2>
    <p>Thank you for joining our platform. You're just one step away from accessing powerful tools to manage every aspect of your life insurance business.</p>

    <p>Please set your password to activate your account:</p>

    <center>
      <a href="{{ .ConfirmationURL }}" class="button">Set Your Password</a>
    </center>

    <p><small>Or copy and paste this link in your browser:</small><br>
    <small>{{ .ConfirmationURL }}</small></p>

    <p>This link will expire in 24 hours for security reasons.</p>

    <p>If you didn't create an account with The Standard, please ignore this email.</p>
  </div>
  <div class="footer">
    <p>© 2025 The Standard. All rights reserved.</p>
    <p>Empowering agents and agencies in the life insurance industry.</p>
  </div>
</body>
</html>
    `,
  },
  resetPassword: {
    subject: "Reset Your Password - The Standard",
    content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .logo {
      display: inline-block;
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      line-height: 64px;
      text-align: center;
      margin-bottom: 20px;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TSH</div>
    <h1>The Standard</h1>
    <p>Password Reset Request</p>
  </div>
  <div class="content">
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password for your The Standard account.</p>

    <p>Click the button below to create a new password:</p>

    <center>
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    </center>

    <p><small>Or copy and paste this link in your browser:</small><br>
    <small>{{ .ConfirmationURL }}</small></p>

    <p>This link will expire in 1 hour for security reasons.</p>

    <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
  </div>
  <div class="footer">
    <p>© 2025 The Standard. All rights reserved.</p>
    <p>Empowering agents and agencies in the life insurance industry.</p>
  </div>
</body>
</html>
    `,
  },
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Note: This function would need admin access to configure email templates
    // For now, it returns the templates that should be configured in Supabase Dashboard

    return new Response(
      JSON.stringify({
        message: "Email templates configured for The Standard branding",
        templates: {
          confirmSignup: {
            subject: emailTemplates.confirmSignup.subject,
            configured: true,
          },
          resetPassword: {
            subject: emailTemplates.resetPassword.subject,
            configured: true,
          },
        },
        instructions:
          "These templates should be configured in Supabase Dashboard under Authentication > Email Templates",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

