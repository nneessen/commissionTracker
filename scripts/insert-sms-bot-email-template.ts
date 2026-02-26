// scripts/insert-sms-bot-email-template.ts
// One-time script to insert the AI SMS Bot feature announcement email template
// Run: source .env && npx tsx scripts/insert-sms-bot-email-template.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error(
    "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required",
  );
  console.log(
    "Run with: source .env && npx tsx scripts/insert-sms-bot-email-template.ts",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const htmlPath = resolve(
  __dirname,
  "../docs/email-templates/sms-bot-announcement.html",
);
const bodyHtml = readFileSync(htmlPath, "utf-8");

const bodyText = `YOUR LEADS ARE WAITING. NOW THEY'LL NEVER WAIT AGAIN.

We just launched an AI-powered SMS assistant that responds to your Close CRM leads instantly — no manual texting, no missed opportunities. It engages leads based on your rules and books appointments directly on your Calendly.

INSTANT LEAD RESPONSE
Automatically texts leads the moment they come in via Close CRM. No delay, no missed window.

SMART CONFIGURATION
Set rules by lead status, lead source, and custom fields — the bot only engages the leads you want.

CALENDLY AUTO-BOOKING
The bot handles the back-and-forth and books appointments directly on your calendar.

CLOSE CRM NATIVE
Works directly with your Close pipeline — no manual syncing, no extra tools.

HOW IT WORKS
1. Configure your rules — Set lead status, source, and response triggers
2. Bot engages leads via SMS — Automatic, personalized text messages
3. Appointments booked on Calendly — No manual follow-up needed

Start Automating Now: https://www.thestandardhq.com/chat-bot

© 2026 The Standard. All rights reserved.
Insurance Agency Management Platform`;

async function insertTemplate() {
  // Check if template already exists
  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("name", "AI SMS Bot - Feature Announcement")
    .maybeSingle();

  if (existing) {
    console.log(
      "Template already exists (id: %s). Skipping insert.",
      existing.id,
    );
    return;
  }

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: "AI SMS Bot - Feature Announcement",
      subject: "The Standard HQ Just Connected Close CRM to Calendly with AI",
      body_html: bodyHtml,
      body_text: bodyText,
      variables: [],
      category: "general",
      is_global: true,
      is_active: true,
      is_block_template: false,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("Failed to insert template:", error.message);
    process.exit(1);
  }

  console.log("Template inserted successfully!");
  console.log("  ID:   %s", data.id);
  console.log("  Name: %s", data.name);
}

insertTemplate();
