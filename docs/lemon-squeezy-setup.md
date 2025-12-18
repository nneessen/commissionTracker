# Lemon Squeezy Setup Guide for The Standard HQ

Complete, detailed step-by-step instructions. Follow exactly as written.

---

## Part 1: Create Your Lemon Squeezy Account

### Step 1.1: Sign Up

1. Open your browser and go to: **https://www.lemonsqueezy.com**
2. Click the **"Get started free"** button (top right corner)
3. You'll see a sign-up form. Fill in:
   - **Email**: Your business email
   - **Password**: Create a strong password
4. Click **"Create account"**
5. Check your email inbox for a verification email from Lemon Squeezy
6. Click the verification link in the email

### Step 1.2: Initial Account Setup

After verifying, you'll be taken through an onboarding wizard:

1. **What's your name?**
   - Enter your full name (e.g., `Nick Neessen`)
   - Click **Continue**

2. **What will you sell?**
   - Select **"Software / SaaS"**
   - Click **Continue**

3. **Business type** (if asked):
   - Select **"I'm an individual"** or **"I have a registered business"** depending on your situation

---

## Part 2: Create Your Store

### Step 2.1: Store Details

After onboarding, you'll create your store:

1. **Store name**:

   ```
   The Standard HQ
   ```

2. **Store slug** (this creates your checkout URL):

   ```
   thestandardhq
   ```

   - This will make your store URL: `thestandardhq.lemonsqueezy.com`
   - **IMPORTANT**: Write this down. You need it later for `VITE_LEMON_SQUEEZY_STORE_ID`

3. **Country**: Select `United States`

4. **Currency**: Select `USD - US Dollar`

5. Click **"Create store"**

### Step 2.2: Store Branding (Optional but Recommended)

1. In the left sidebar, click **Settings** (gear icon)
2. Click **Store** under Settings
3. You can customize:
   - **Store logo**: Upload your The Standard HQ logo (recommended size: 512x512px)
   - **Brand color**: Use `#18181b` (matches your app's dark theme)
   - **Store description**:
     ```
     The Standard HQ helps insurance agents track policies, commissions, and grow their business.
     ```
4. Click **Save changes**

---

## Part 3: Payment Setup (Required Before You Can Sell)

### Step 3.1: Connect Payment Processing

1. In the left sidebar, click **Settings**
2. Click **Payments**
3. You have two options:

**Option A: Lemon Squeezy Payments (Easier)**

- Click **"Enable Lemon Squeezy Payments"**
- Follow the prompts to verify your identity
- Lemon Squeezy handles everything, takes ~2.9% + $0.30 per transaction

**Option B: Connect Your Own Stripe (More Control)**

- Click **"Connect Stripe"**
- Log into your Stripe account
- Authorize the connection

### Step 3.2: Payout Settings

1. Still in **Settings** → **Payments**
2. Scroll to **Payout details**
3. Click **"Add payout method"**
4. Enter your bank account details:
   - Bank name
   - Routing number
   - Account number
5. Set your payout schedule (weekly, monthly, etc.)
6. Click **Save**

### Step 3.3: Tax Settings

1. Go to **Settings** → **Tax**
2. For US-based SaaS, you typically need to:
   - Toggle **"Enable tax collection"** ON
   - Select states where you have tax nexus
   - Or use **"Let Lemon Squeezy handle taxes"** (they use TaxJar)
3. Click **Save**

---

## Part 4: Create the Starter Plan Product

### Step 4.1: Create the Product

1. In the left sidebar, click **Products**
2. Click the **"+ New product"** button (top right)
3. Fill in the form:

**Basic Information:**

- **Name**:
  ```
  Starter Plan
  ```
- **Description** (this shows on the checkout page):

  ```
  Financial Intelligence - Understand your business

  Perfect for individual insurance agents who want to take control of their finances.

  ✓ Full dashboard with KPIs
  ✓ Policy tracking & management
  ✓ Expense tracking
  ✓ Basic income targets
  ✓ View reports
  ✓ Commission guide
  ✓ Connect to your upline
  ```

**Product Type:**

- Select **"Subscription"** (NOT "Single payment")

**Media (Optional):**

- You can upload a product image if you want

4. Click **"Create product"**

### Step 4.2: Add Monthly Pricing Variant

After creating the product, you'll be on the product detail page.

1. Scroll down to the **Variants** section
2. You'll see a default variant was created. Click on it to edit, OR click **"+ Add variant"**
3. Fill in:

**Variant Details:**

- **Name**:
  ```
  Monthly
  ```
- **Description** (optional):
  ```
  Billed monthly, cancel anytime
  ```

**Pricing:**

- **Price**: `$10.00`
- Make sure the currency shows `USD`

**Billing:**

- **Subscription billing interval**: Select **"Month"**
- **Interval count**: `1` (means every 1 month)
- **Free trial**: Leave at `0` days (or add a trial if you want)

**Inventory:**

- Leave **"Unlimited"** selected

4. Click **"Save variant"**

5. **IMPORTANT - Copy the Variant ID:**
   - After saving, look at the variant in the list
   - Click the **three dots menu (⋮)** on the right side of the variant row
   - Click **"Copy variant ID"**
   - Paste it somewhere and label it: `Starter Monthly: 1158805`

### Step 4.3: Add Annual Pricing Variant

1. Click **"+ Add variant"**
2. Fill in:

**Variant Details:**

- **Name**:
  ```
  Annual
  ```
- **Description**:
  ```
  Billed yearly - Save $20/year!
  ```

**Pricing:**

- **Price**: `$100.00`

**Billing:**

- **Subscription billing interval**: Select **"Year"**
- **Interval count**: `1`

3. Click **"Save variant"**

4. **Copy the Variant ID** (same process as before):
   - Click three dots → "Copy variant ID"
   - Label it: `Starter Annual: 1158815`

### Step 4.4: Copy the Product ID

1. While on the Starter Plan product page
2. Look at the URL in your browser. It will look like:
   ```
   https://app.lemonsqueezy.com/products/XXXXXX
   ```
3. That number is your Product ID. Copy it and label: `Starter Product: XXXXXX`

---

## Part 5: Create the Pro Plan Product

### Step 5.1: Create the Product

1. Click **Products** in the sidebar
2. Click **"+ New product"**
3. Fill in:

**Basic Information:**

- **Name**:
  ```
  Pro Plan
  ```
- **Description**:

  ```
  Growth Tools - Communicate and grow your business

  Everything in Starter, plus powerful tools to reach clients and hit your goals.

  ✓ Everything in Starter
  ✓ 200 emails/month included
  ✓ Full income targets with forecasting
  ✓ Export reports to CSV/PDF
  ✓ Email campaigns to clients
  ✓ Advanced analytics
  ```

**Product Type:**

- Select **"Subscription"**

4. Click **"Create product"**

### Step 5.2: Add Monthly Variant

1. In the Variants section, edit the default or add new:

- **Name**: `Monthly`
- **Description**: `Billed monthly, cancel anytime`
- **Price**: `$25.00`
- **Billing interval**: `Month`
- **Interval count**: `1`

2. Save and **copy the Variant ID** → Label: `Pro Monthly: 1158809`

### Step 5.3: Add Annual Variant

1. Click **"+ Add variant"**

- **Name**: `Annual`
- **Description**: `Billed yearly - Save $50/year!`
- **Price**: `$250.00`
- **Billing interval**: `Year`
- **Interval count**: `1`

2. Save and **copy the Variant ID** → Label: `Pro Annual: 1158818`

### Step 5.4: Copy Product ID

From the URL: `https://app.lemonsqueezy.com/products/XXXXXX`
Label: `Pro Product: XXXXXX`

---

## Part 6: Create the Team Plan Product

### Step 6.1: Create the Product

1. Click **Products** → **"+ New product"**
2. Fill in:

**Basic Information:**

- **Name**:
  ```
  Team Plan
  ```
- **Description**:

  ```
  Agency Builder - Manage and grow your team

  Everything in Pro, plus full team management capabilities.

  ✓ Everything in Pro
  ✓ 500 emails/month included
  ✓ SMS messaging
  ✓ Team hierarchy view
  ✓ Downline performance reports
  ✓ Override commission tracking
  ✓ Recruiting pipeline
  ✓ Unlimited team size - flat rate!
  ```

**Product Type:**

- Select **"Subscription"**

3. Click **"Create product"**

### Step 6.2: Add Monthly Variant

- **Name**: `Monthly`
- **Description**: `Billed monthly, cancel anytime`
- **Price**: `$50.00`
- **Billing interval**: `Month`
- **Interval count**: `1`

Save and **copy Variant ID** → Label: `Team Monthly: 1158810`

### Step 6.3: Add Annual Variant

- **Name**: `Annual`
- **Description**: `Billed yearly - Save $100/year!`
- **Price**: `$500.00`
- **Billing interval**: `Year`
- **Interval count**: `1`

Save and **copy Variant ID** → Label: `Team Annual: 1158820`

### Step 6.4: Copy Product ID

From URL → Label: `Team Product: XXXXXX`

---

## Part 7: Your Collected IDs

At this point, you should have written down 9 IDs. Organize them like this:

```
STARTER:
  Product ID:         736216
  Monthly Variant ID: _______________
  Annual Variant ID:  _______________

PRO:
  Product ID:         736219
  Monthly Variant ID: _______________
  Annual Variant ID:  _______________

TEAM:
  Product ID:         736220
  Monthly Variant ID: _______________
  Annual Variant ID:  _______________

STORE SLUG: _______________
```

---

## Part 8: Configure the Webhook

The webhook allows Lemon Squeezy to notify your app when someone subscribes, pays, cancels, etc.

### Step 8.1: Navigate to Webhooks

1. In the left sidebar, click **Settings** (gear icon)
2. In the Settings menu, scroll down and click **Webhooks**
3. Click the **"+ Add endpoint"** button

### Step 8.2: Configure Webhook Settings

Fill in the form:

**Callback URL:**

```
https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/lemon-webhook
```

(Copy this exactly - this is your Supabase edge function URL)

**Events to send:**

Check these specific events (uncheck everything else):

- [x] `subscription_created` - When someone subscribes
- [x] `subscription_updated` - When subscription changes (upgrade/downgrade)
- [x] `subscription_cancelled` - When someone cancels
- [x] `subscription_paused` - When subscription is paused
- [x] `subscription_resumed` - When subscription resumes from pause
- [x] `subscription_payment_success` - When payment goes through
- [x] `subscription_payment_failed` - When payment fails
- [x] `subscription_payment_recovered` - When failed payment is recovered

### Step 8.3: Save and Get Signing Secret

signing secret = N123j234n345!$!$

1. Click **"Save endpoint"**
2. After saving, you'll be taken to the webhook details page
3. Look for **"Signing secret"** - it will be hidden like `whsec_••••••••`
4. Click the **eye icon** or **"Reveal"** to show it
5. Click **"Copy"** to copy the full signing secret
6. **SAVE THIS SOMEWHERE SECURE** - you need it for the next step
   - It looks like: `whsec_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`

---

## Part 9: Update Your Database

Now you need to put your Lemon Squeezy IDs into your The Standard HQ database.

### Step 9.1: Create the SQL Update File

Create a file with your actual IDs. Replace the placeholder values below with your real IDs:

```bash
cat > /tmp/update_lemon_ids.sql << 'EOF'
-- Update Starter plan with Lemon Squeezy IDs
UPDATE subscription_plans SET
  lemon_product_id = 'REPLACE_WITH_STARTER_PRODUCT_ID',
  lemon_variant_id_monthly = 'REPLACE_WITH_STARTER_MONTHLY_VARIANT',
  lemon_variant_id_annual = 'REPLACE_WITH_STARTER_ANNUAL_VARIANT'
WHERE name = 'starter';

-- Update Pro plan with Lemon Squeezy IDs
UPDATE subscription_plans SET
  lemon_product_id = 'REPLACE_WITH_PRO_PRODUCT_ID',
  lemon_variant_id_monthly = 'REPLACE_WITH_PRO_MONTHLY_VARIANT',
  lemon_variant_id_annual = 'REPLACE_WITH_PRO_ANNUAL_VARIANT'
WHERE name = 'pro';

-- Update Team plan with Lemon Squeezy IDs
UPDATE subscription_plans SET
  lemon_product_id = 'REPLACE_WITH_TEAM_PRODUCT_ID',
  lemon_variant_id_monthly = 'REPLACE_WITH_TEAM_MONTHLY_VARIANT',
  lemon_variant_id_annual = 'REPLACE_WITH_TEAM_ANNUAL_VARIANT'
WHERE name = 'team';

-- Verify the updates
SELECT name, lemon_product_id, lemon_variant_id_monthly, lemon_variant_id_annual
FROM subscription_plans
WHERE name IN ('starter', 'pro', 'team');
EOF
```

### Step 9.2: Edit the File with Your Real IDs

Open `/tmp/update_lemon_ids.sql` in a text editor and replace all the `REPLACE_WITH_...` values with your actual IDs from Part 7.

### Step 9.3: Run the Update

```bash
./scripts/apply-migration.sh /tmp/update_lemon_ids.sql
```

You should see output showing 3 UPDATE statements and then a SELECT showing your IDs are now in the database.

---

## Part 10: Set Environment Variables

### Step 10.1: Frontend Environment Variable

Your app needs to know your Lemon Squeezy store slug to generate checkout URLs.

1. Open your `.env` or `.env.local` file in the project root
2. Add this line (replace with YOUR store slug from Part 2):
   ```
   VITE_LEMON_SQUEEZY_STORE_ID=thestandardhq
   ```
3. Save the file

### Step 10.2: Supabase Webhook Secret

Your edge function needs the signing secret to verify webhooks are actually from Lemon Squeezy.

Run this command (replace with YOUR signing secret from Part 8):

```bash
supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET='whsec_YOUR_ACTUAL_SECRET_HERE' --project-ref pcyaqwodnyrpkaiojnpz
```

**Note**: The secret should be in single quotes to prevent shell interpretation of special characters.

---

## Part 11: Deploy the Webhook Edge Function

The edge function code is already created. Now deploy it to Supabase:

```bash
supabase functions deploy lemon-webhook --project-ref pcyaqwodnyrpkaiojnpz
```

You should see output like:

```
Bundling function lemon-webhook...
Deploying function lemon-webhook...
Function lemon-webhook deployed successfully
```

---

## Part 12: Enable Test Mode and Test

### Step 12.1: Enable Test Mode in Lemon Squeezy

1. Go to Lemon Squeezy dashboard
2. Click **Settings** → **General**
3. Find **"Test mode"** toggle at the top
4. Turn it **ON** - you'll see an orange banner saying "Test mode enabled"

### Step 12.2: Test the Full Flow

1. **Start your local app:**

   ```bash
   npm run dev
   ```

2. **Log in** as a free-tier user (or create a new test account)

3. **Go to Settings → Billing**

4. **Select a plan** from the dropdown (e.g., "Starter - $10.00/mo")

5. **Select billing interval** (Monthly or Annual)

6. **Click "Upgrade"** - this should open a new tab with Lemon Squeezy checkout

7. **On the checkout page**, enter test payment details:
   - **Email**: Your email
   - **Card number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/28`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
   - **Country**: United States
   - **ZIP**: Any valid ZIP (e.g., `12345`)

8. **Click "Pay"**

9. **Verify it worked:**
   - You should see a success page
   - Check your email for a welcome email
   - In your app, refresh the Billing page - you should see your new plan

### Step 12.3: Check Webhook Logs

To see if webhooks are being received:

```bash
supabase functions logs lemon-webhook --project-ref pcyaqwodnyrpkaiojnpz
```

You should see logs like:

```
Received Lemon Squeezy webhook: subscription_created
Processing subscription for user: xxxx-xxxx-xxxx
Subscription created successfully
```

### Step 12.4: Check Lemon Squeezy Webhook Deliveries

1. Go to Lemon Squeezy → **Settings** → **Webhooks**
2. Click on your webhook
3. Click the **"Deliveries"** tab
4. You should see recent webhook attempts with status `200` (success)

If you see failures (status 4xx or 5xx), click on the delivery to see the error response.

---

## Part 13: Go Live

Once testing is complete:

### Step 13.1: Disable Test Mode

1. Go to Lemon Squeezy → **Settings** → **General**
2. Toggle **"Test mode"** OFF
3. Confirm the prompt

### Step 13.2: Verify Production Settings

Make sure:

- [x] Payment processing is connected (Stripe or Lemon Squeezy Payments)
- [x] Payout bank account is configured
- [x] Tax settings are configured
- [x] All 3 products are created with correct pricing
- [x] Webhook is configured and tested
- [x] Environment variables are set in production

### Step 13.3: Deploy Frontend Changes

If you haven't already, deploy your frontend with the new `VITE_LEMON_SQUEEZY_STORE_ID` env var:

```bash
# If using Vercel
vercel --prod

# Or your deployment method
npm run build && # your deploy command
```

---

## Troubleshooting

### "Checkout URL not working"

**Symptom**: Clicking Upgrade doesn't open checkout or shows error

**Fix**:

1. Check browser console for errors
2. Verify `VITE_LEMON_SQUEEZY_STORE_ID` is set in `.env`
3. Verify variant IDs in database match Lemon Squeezy
4. Restart dev server after changing `.env`

### "Webhook signature verification failed"

**Symptom**: Logs show "Invalid signature" error

**Fix**:

1. Make sure the secret starts with `whsec_`
2. Re-copy the secret from Lemon Squeezy (click reveal, then copy)
3. Re-set it: `supabase secrets set LEMON_SQUEEZY_WEBHOOK_SECRET='whsec_...'`
4. Redeploy: `supabase functions deploy lemon-webhook`

### "Webhook not receiving events"

**Symptom**: No webhook deliveries showing in Lemon Squeezy

**Fix**:

1. Verify URL is exactly: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/lemon-webhook`
2. Make sure edge function is deployed: `supabase functions list`
3. Check that events are selected in webhook config

### "User subscription not updating after payment"

**Symptom**: Payment succeeds but user stays on Free

**Fix**:

1. Check edge function logs: `supabase functions logs lemon-webhook`
2. Verify `custom.user_id` is in the checkout URL (check network tab in browser)
3. Check database for errors in `subscription_events` table

### "Test mode card not working"

**Symptom**: Card `4242...` is declined

**Fix**:

1. Make sure Test Mode is enabled in Lemon Squeezy
2. Try a different test card: `4000 0056 0000 0009` (successful 3D Secure)

---

## Reference Card

| Item                | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Your Store Slug     | `thestandardhq` (or your slug)                                        |
| Webhook URL         | `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/lemon-webhook` |
| Frontend Env Var    | `VITE_LEMON_SQUEEZY_STORE_ID=thestandardhq`                           |
| Supabase Secret     | `LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_...`                              |
| Test Card (Success) | `4242 4242 4242 4242`                                                 |
| Test Card (Decline) | `4000 0000 0000 0002`                                                 |
| Starter Monthly     | $10.00/month                                                          |
| Starter Annual      | $100.00/year                                                          |
| Pro Monthly         | $25.00/month                                                          |
| Pro Annual          | $250.00/year                                                          |
| Team Monthly        | $50.00/month                                                          |
| Team Annual         | $500.00/year                                                          |

---

## Getting Help

- **Lemon Squeezy Docs**: https://docs.lemonsqueezy.com
- **Lemon Squeezy Help Center**: https://help.lemonsqueezy.com
- **Test Cards Reference**: https://docs.lemonsqueezy.com/guides/developer-guide/testing
