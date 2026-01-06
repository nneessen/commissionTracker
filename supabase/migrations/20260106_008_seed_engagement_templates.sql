-- supabase/migrations/20260106_008_seed_engagement_templates.sql
-- Seed 70 engagement templates (10 per category) as system templates
-- System templates have user_id = NULL and are visible to all users

-- Get the IMO ID for this organization
DO $$
DECLARE
  v_imo_id UUID;
BEGIN
  -- Get the first (and typically only) IMO
  SELECT id INTO v_imo_id FROM imos LIMIT 1;

  IF v_imo_id IS NULL THEN
    RAISE NOTICE 'No IMO found, skipping template seeding';
    RETURN;
  END IF;

  -- ============================================================================
  -- LICENSED AGENT TEMPLATES (10)
  -- ============================================================================

  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Commission Curiosity', 'Quick question - what''s your current commission structure looking like? I''ve been hearing a lot of agents mention they feel capped lately.', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Carrier Portfolio', 'How many carriers do you have access to right now? Just curious if you''re able to shop around for your clients or if you''re pretty locked in.', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Support System', 'Do you have a solid back office team handling your admin work? Or are you still doing most of that yourself between appointments?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Production Ceiling', 'What would you say is the biggest thing holding you back from writing more business right now? Leads, time, or something else?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Team Building', 'Have you ever thought about building a team under you? Or are you more focused on staying independent for now?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Work Life Balance', 'How''s the work-life balance treating you? I know some agents are grinding 60+ hours and others have figured out how to work smarter.', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Growth Path', 'Where do you see yourself in the insurance space in the next 2-3 years? Same role or trying to level up somehow?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Market Conditions', 'How''s the market treating you lately? Seeing any shifts in what products are moving vs. a year ago?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Tech Tools', 'What tools or tech are you using to manage your book? CRM, quoting software, that kind of thing?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Leadership Interest', 'Random question - if you could mentor newer agents and get paid for it, would that interest you at all?', 'licensed_agent', 'engagement', true),

  -- ============================================================================
  -- HAS TEAM TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Has Team - Growth Challenges', 'What''s been your biggest challenge with growing your team lately? Finding good people, keeping them, or something else?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Retention', 'How do you handle retention on your team? Seems like every agency I talk to has different strategies that work for them.', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Override Structure', 'Are you happy with the override structure you''re getting on your team''s production? Or do you feel like you''re leaving money on the table?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Training Resources', 'What kind of training resources do you have access to for your team? Do you have to create everything yourself?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Admin Burden', 'How much of your time goes into managing the admin side vs. actually helping your team sell? That ratio can make or break an agency.', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Succession Plan', 'Have you thought about what happens to your team and book long-term? Like, is there an exit strategy or succession plan?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Competition', 'Are you seeing more competition for talent in your area? Seems like everyone is trying to recruit the same people lately.', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Culture Building', 'How do you build culture when you''re all working independently? That''s something a lot of team leaders struggle with.', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Leadership Dev', 'Do you have any agents on your team you''re grooming to step up into leadership roles eventually?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Scale Limits', 'What do you think is the ceiling for your current setup? Like, how big could you realistically grow with the structure you have now?', 'has_team', 'engagement', true),

  -- ============================================================================
  -- SOLAR TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Solar - Market Shifts', 'How''s the solar market been treating you lately? I keep hearing mixed things about where it''s headed.', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Commission Timing', 'One thing I always hear about solar is waiting forever to get paid. How''s the commission timing working out for you?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Territory Concerns', 'Is your territory getting saturated at all? Or is there still plenty of untapped market where you''re at?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Company Stability', 'How stable is your company feeling right now? I know some solar companies have been having issues lately.', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Cross Selling', 'Have you ever thought about cross-selling other products to your solar customers? Seems like there could be opportunity there.', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Income Ceiling', 'What''s the realistic income ceiling in solar where you''re at? Like, what are the top performers actually making?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Door Knock Fatigue', 'How are you handling the grind of door-to-door? That''s one thing that burns a lot of solar reps out.', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Lead Quality', 'Are you running your own leads or does your company provide them? And if they provide them, what''s the quality like?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Seasonality', 'How much does seasonality affect your income? Do you have slow months that really hurt?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Career Longevity', 'Where do you see yourself in 5 years? Still in solar or transitioning to something else?', 'solar', 'engagement', true),

  -- ============================================================================
  -- DOOR-TO-DOOR TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'D2D - Physical Demands', 'How''s your body holding up with all the walking? I know D2D can be physically demanding over time.', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Rejection Handling', 'What''s your mental game like for handling rejection? That''s something not everyone can deal with long-term.', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Territory Status', 'Is your territory still fresh or has it been worked pretty hard already? That makes a huge difference.', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Weather Impact', 'How much does weather impact your business? I imagine rough weather months are tough.', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Long Term Plans', 'Do you see yourself doing D2D long-term, or is this more of a stepping stone to something else?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Transferable Skills', 'What skills have you picked up that you think would transfer to other sales roles?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Income Stability', 'How consistent is your income month to month? Or does it swing pretty wildly?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Schedule Control', 'Do you have control over your own schedule, or does the company dictate when and where you work?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Advancement Path', 'Is there a clear path to move up at your company? Or is it kind of just grind forever?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Exit Strategy', 'Have you thought about what''s next after D2D? Or are you still figuring that out?', 'door_to_door', 'engagement', true),

  -- ============================================================================
  -- ATHLETE TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Athlete - Competition Drive', 'I can tell you''ve got that competitive drive - is that something you''re looking to channel into your career too?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Team Dynamics', 'What did you like most about being on a team? The camaraderie, the competition, the structure?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Metrics Focus', 'As an athlete, you''re used to tracking stats and performance. Do you have that same mindset in your career?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Coaching Value', 'How important was having good coaching to your athletic success? Is that something you look for professionally too?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Schedule Needs', 'What kind of schedule flexibility are you looking for? Athletes usually have strong opinions on work-life balance.', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Income Goals', 'What kind of income would actually make a meaningful difference in your life right now?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Goal Setting', 'You clearly know how to set and achieve goals. Are you applying that same discipline to your financial goals?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Discipline Apply', 'That athletic discipline doesn''t just disappear. Are you channeling it into something now, or looking for the right opportunity?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Network Value', 'Your network from sports is probably pretty solid. Have you thought about how to leverage those connections professionally?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Career Transition', 'How''s the transition from athletics been treating you? That can be a tough shift for some people.', 'athlete', 'engagement', true),

  -- ============================================================================
  -- CAR SALESMAN TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'Car Sales - Commission Caps', 'Do you feel capped on what you can make there? I know some dealerships have limits that hold people back.', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Inventory Issues', 'How''s inventory been affecting your numbers? That''s been a pain point for a lot of car salespeople lately.', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Weekend Grind', 'How do you feel about the weekend and holiday schedule? That''s one thing that wears on people in that industry.', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Floor Time', 'Are you still fighting over floor time and ups, or have you built up enough repeat business to not stress about that?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Client Ownership', 'Do you actually own your customer relationships, or does the dealership keep the database?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Repeat Business', 'What percentage of your deals come from repeat customers vs. fresh traffic? That ratio matters a lot long-term.', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Income Consistency', 'How consistent is your income month to month? I know car sales can be feast or famine sometimes.', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Management Path', 'Is there a realistic path to management or ownership at your dealership? Or is it pretty locked in?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Industry Perception', 'How do you feel about the reputation of the car sales industry? Does that ever bother you?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Skills Transfer', 'You''ve clearly got sales skills - have you thought about applying them somewhere with more upside potential?', 'car_salesman', 'engagement', true),

  -- ============================================================================
  -- GENERAL/COLD TEMPLATES (10)
  -- ============================================================================

    (v_imo_id, NULL, 'General - Current Satisfaction', 'On a scale of 1-10, how happy are you with where you''re at professionally right now? And what would make it a 10?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Income Goals', 'If you could design your ideal income situation, what would that look like? Both the amount and how you earn it.', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Flexibility Needs', 'How important is schedule flexibility to you? Like, is that a deal-breaker or just nice to have?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Growth Desires', 'Are you looking to grow and level up professionally, or are you more in maintenance mode right now?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Side Hustle', 'Have you ever thought about a side hustle or secondary income stream? Or is your plate already full?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Entrepreneur Spirit', 'Would you say you have more of an employee mindset or an entrepreneur mindset? No wrong answer, just curious.', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Schedule Prefs', 'What does your ideal work schedule look like? 9-5, flexible hours, or something else entirely?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Remote Interest', 'How important is being able to work from anywhere to you? That''s becoming more of a priority for a lot of people.', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Skills Leverage', 'What skills do you have that you feel like aren''t being fully utilized right now?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Long Term Vision', 'Where do you see yourself in 5 years? And is your current path actually getting you there?', 'general_cold', 'engagement', true);

  RAISE NOTICE 'Successfully inserted 70 engagement templates';
END $$;
