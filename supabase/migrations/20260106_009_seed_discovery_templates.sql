-- supabase/migrations/20260106_009_seed_discovery_templates.sql
-- Seed 70 discovery templates (10 per category) as system templates
-- Discovery stage is for finding pain points and keeping conversation flowing

DO $$
DECLARE
  v_imo_id UUID;
BEGIN
  SELECT id INTO v_imo_id FROM imos LIMIT 1;

  IF v_imo_id IS NULL THEN
    RAISE NOTICE 'No IMO found, skipping template seeding';
    RETURN;
  END IF;

  -- ============================================================================
  -- LICENSED AGENT DISCOVERY TEMPLATES (10)
  -- ============================================================================

  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Pain: Chargebacks', 'How often do policies fall off the books for you? Chargebacks can really eat into what you thought you earned.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Lead Cost', 'What are you spending on leads right now? I talk to agents dropping $2-3k a month and barely breaking even.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Captive Limits', 'Do you ever lose deals because you can only offer one carrier? That''s gotta be frustrating when you know you could help them somewhere else.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: No Residuals', 'Are you building any residual income, or is it all first-year commission? That treadmill gets exhausting.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Compliance', 'How much time do you waste on compliance and paperwork that doesn''t actually make you money?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Training Gap', 'When you started, did anyone actually train you? Or was it more like "here''s your license, good luck"?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Solo Struggle', 'Do you ever feel like you''re on an island trying to figure everything out yourself?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Tech Stack', 'How much are you paying out of pocket for CRM, quoting tools, and all that? It adds up fast.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: Inconsistent Income', 'What''s your worst month vs best month look like? That swing can make it hard to plan anything.', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Pain: No Equity', 'Are you building anything you could actually sell someday? Or just trading time for money?', 'licensed_agent', 'discovery', true),

  -- ============================================================================
  -- HAS TEAM DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Has Team - Pain: Turnover', 'What''s your turnover rate looking like? Training people just to watch them leave is brutal.', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Recruiting Cost', 'How much time and money are you spending on recruiting vs. actually selling?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Override Squeeze', 'Are your overrides getting squeezed? Seems like every year companies find ways to pay less.', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Liability', 'Do you ever worry about liability from what your agents do? That keeps some team leaders up at night.', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: No Systems', 'Do you have actual systems for onboarding and training, or are you reinventing the wheel every time?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Carrier Issues', 'Ever had a carrier drop you or change terms and it messed up your whole team''s production?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Management Time', 'How much of your week goes to managing fires vs. actually growing the business?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Poaching', 'Do you worry about other agencies poaching your top producers? That''s a real threat.', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: No Exit', 'What happens to your team if you want to step back or retire? Is there even a plan for that?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Pain: Cash Flow', 'How do you handle cash flow when you''re paying advances but waiting on overrides?', 'has_team', 'discovery', true),

  -- ============================================================================
  -- SOLAR DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Solar - Pain: Install Delays', 'How often do install delays kill your deals? That wait time loses a lot of customers.', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Clawbacks', 'What''s the clawback situation like? I hear some companies are brutal with that.', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Regulatory Changes', 'Are you worried about net metering changes or incentive cuts affecting your business?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Company Instability', 'Have you seen companies in the space fold and leave reps without their commissions? That''s scary.', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Roof Issues', 'How many deals fall through because of roof condition or shading issues after you already invested time?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Utility Changes', 'When utilities change their rates or rules, does it mess up your pitch and close rate?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: No Benefits', 'Do you get any benefits - health insurance, 401k, anything? Or is it all 1099?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Summer Burnout', 'How do you handle the summer grind when everyone else is on vacation and you''re knocking doors in the heat?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Financing Falls', 'What percentage of your deals die in financing? That''s time you never get back.', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Pain: Reputation', 'Does the sketchy reputation of some solar companies make your job harder? People are skeptical.', 'solar', 'discovery', true),

  -- ============================================================================
  -- DOOR-TO-DOOR DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'D2D - Pain: Body Breakdown', 'How are your knees and feet holding up? I know guys who had to quit because their body gave out.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Safety Concerns', 'Ever had any sketchy situations at the door? That''s a real risk not everyone thinks about.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Burned Territory', 'What happens when your territory gets burned out? Do they just move you or are you stuck?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: No Shows', 'How many appointments no-show on you after you worked hard to set them? That''s demoralizing.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Travel Cost', 'Are you covering your own gas and travel? That eats into your actual earnings fast.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Summer Only', 'Is this a summer-only gig for you? What do you do in the off-season?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Family Time', 'How does your family feel about the schedule? Nights and weekends can strain relationships.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Age Limit', 'Do you ever think about how long you can realistically do this? It''s a young person''s game.', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: No Residual', 'Once you sell it, that''s it right? No ongoing income from those customers?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Pain: Manager Pressure', 'How''s the pressure from management? Some D2D companies are pretty intense about numbers.', 'door_to_door', 'discovery', true),

  -- ============================================================================
  -- ATHLETE DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Athlete - Pain: Identity Loss', 'How''s the transition been from being "the athlete" to figuring out who you are professionally?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Income Drop', 'Did your income take a hit when sports ended? That adjustment can be rough.', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: No Direction', 'Do you feel like you have a clear path forward, or is it kind of "now what?"', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Wasted Network', 'Are you actually leveraging your sports network, or is it just sitting there unused?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Structure Missing', 'Do you miss having that structure and routine from sports? A lot of athletes struggle without it.', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Boredom', 'Is your current work actually challenging you? Or does it feel boring compared to competing?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Underemployed', 'Do you feel like you''re capable of way more than what you''re currently doing?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: No Coaching', 'Who''s coaching you on the business/career side? Or are you trying to figure it out alone?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Financial Pressure', 'Is there pressure to maintain a certain lifestyle even though the big checks stopped?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Pain: Starting Over', 'Does it feel weird starting at the bottom when you were at the top in your sport?', 'athlete', 'discovery', true),

  -- ============================================================================
  -- CAR SALESMAN DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Car Sales - Pain: Desk Control', 'How much control do you actually have over your deals, or does the desk run everything?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Split Deals', 'How often do you have to split deals? That cuts your income in half for the same work.', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Mini Deals', 'What percentage of your deals are minis? Those barely cover your time.', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: No Sick Days', 'What happens when you''re sick or need time off? Do you just lose that income?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Holiday Work', 'How do you feel about working every holiday weekend while everyone else is with family?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Chargeback', 'Do you get hit with chargebacks when deals unwind? That''s money you already spent.', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Lot Politics', 'How''s the politics at the dealership? Favoritism on ups and leads?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: No Future', 'Is there actually a future at your dealership, or will you be doing the same thing in 10 years?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: EV Threat', 'Are you worried about how EVs and online buying will change car sales?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Pain: Burnout', 'How close are you to burnout? That grind takes a toll after a while.', 'car_salesman', 'discovery', true),

  -- ============================================================================
  -- GENERAL/COLD DISCOVERY TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'General - Pain: Stuck Feeling', 'Do you ever feel stuck where you are, like you''re not moving forward?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Underpaid', 'Do you feel like you''re paid what you''re actually worth? Most people don''t.', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: No Control', 'How much control do you have over your income? Can you actually affect how much you make?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Dead End', 'Does your current path have a ceiling? Like, is there a point where you max out?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Time Freedom', 'If you wanted to take a month off, could you? Or would everything fall apart?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: No Ownership', 'Are you building anything that''s actually yours? Or just making someone else rich?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Job Security', 'How secure do you feel in your current situation? Could it disappear tomorrow?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Unfulfilled', 'Does your work actually fulfill you, or is it just a paycheck?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Family Sacrifice', 'How much are you sacrificing family time for work that doesn''t really appreciate you?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Pain: Potential Wasted', 'Do you feel like you have more potential than your current situation allows you to show?', 'general_cold', 'discovery', true);

  RAISE NOTICE 'Successfully inserted 70 discovery templates';
END $$;
