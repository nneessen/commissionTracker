-- supabase/migrations/20260115_005_seed_all_stage_templates.sql
-- Seed complete template library: openers, follow_ups, additional engagement/discovery, and closers
-- 10 templates per category per stage = 350 total templates
-- Style: Natural, conversational, 20s demographic, warm approach (jab, jab, punch)

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
  -- OPENER TEMPLATES (70 total - first contact, casual, non-salesy)
  -- ============================================================================

  -- LICENSED AGENT OPENERS (10)
  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Opener 1', 'hey! saw you''re in the insurance game too. how long you been at it?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 2', 'yo what''s good! noticed you''re licensed. what got you into insurance?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 3', 'hey! fellow insurance person here lol. life or health?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 4', 'sup! saw you''re in the industry. what lines you writing?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 5', 'hey there! always cool to connect with other agents. you independent or captive?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 6', 'what''s up! saw the insurance thing. you enjoying it so far?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 7', 'hey! just stumbled on your page. how''s the insurance life treating you?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 8', 'yo! another agent here. what market are you focused on?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 9', 'hey what''s good! saw you''re in insurance. you with an agency or doing your own thing?', 'licensed_agent', 'opener', true),
    (v_imo_id, NULL, 'Licensed - Opener 10', 'sup! noticed we''re in the same space. been in the game long?', 'licensed_agent', 'opener', true),

  -- HAS TEAM OPENERS (10)
    (v_imo_id, NULL, 'Has Team - Opener 1', 'hey! saw you''re running a team. how''s that going for you?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 2', 'yo! noticed you''ve built something. how big is your crew?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 3', 'what''s up! saw you''re leading a team. how long you been building?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 4', 'hey! fellow team builder here. what industry are you guys in?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 5', 'sup! saw you''ve got a squad. in-person or remote team?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 6', 'hey there! noticed you''re running things. how''d you get started?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 7', 'yo what''s good! saw the leadership thing. you enjoying building?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 8', 'hey! always respect someone building a team. what''s your focus?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 9', 'what''s up! saw you''re not just solo. how many people you got?', 'has_team', 'opener', true),
    (v_imo_id, NULL, 'Has Team - Opener 10', 'hey! noticed you''re leading others. how''s the team culture?', 'has_team', 'opener', true),

  -- SOLAR OPENERS (10)
    (v_imo_id, NULL, 'Solar - Opener 1', 'hey! saw you''re in solar. how''s that world treating you?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 2', 'yo what''s good! solar right? how long you been doing that?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 3', 'sup! noticed the solar thing. you enjoying it?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 4', 'hey there! saw you''re in the solar game. residential or commercial?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 5', 'what''s up! solar sales? that''s a grind. how you holding up?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 6', 'hey! saw you''re in solar. what company you with?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 7', 'yo! noticed you''re doing the solar thing. how''s the market in your area?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 8', 'hey what''s good! saw the solar posts. you knocking doors?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 9', 'sup! you in solar? how''d you end up there?', 'solar', 'opener', true),
    (v_imo_id, NULL, 'Solar - Opener 10', 'hey! saw you''re selling solar. full time or side thing?', 'solar', 'opener', true),

  -- DOOR-TO-DOOR OPENERS (10)
    (v_imo_id, NULL, 'D2D - Opener 1', 'hey! saw you''re doing the d2d thing. what are you selling?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 2', 'yo what''s up! door to door? that takes guts. how long you been at it?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 3', 'sup! noticed you''re knocking doors. respect the hustle. what industry?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 4', 'hey there! saw the d2d life. summer sales or year round?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 5', 'what''s good! d2d is no joke. how you liking it?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 6', 'hey! saw you''re doing door to door. with a company or independent?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 7', 'yo! noticed the sales grind. how''s the territory treating you?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 8', 'hey what''s up! d2d right? what got you into that?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 9', 'sup! saw you''re out there knocking. how''s the grind been?', 'door_to_door', 'opener', true),
    (v_imo_id, NULL, 'D2D - Opener 10', 'hey! d2d sales is tough. you got a team or going solo?', 'door_to_door', 'opener', true),

  -- ATHLETE OPENERS (10)
    (v_imo_id, NULL, 'Athlete - Opener 1', 'hey! saw you played ball. what sport?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 2', 'yo what''s good! noticed the athlete thing. you still competing?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 3', 'sup! saw you were an athlete. what level did you play at?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 4', 'hey there! always cool to connect with athletes. what was your sport?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 5', 'what''s up! noticed the athlete background. you miss it?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 6', 'hey! saw you played. how''s life after the game?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 7', 'yo! athlete to athlete here. what you doing now?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 8', 'hey what''s good! saw the sports background. where''d you play?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 9', 'sup! noticed you''re an athlete. still training or moved on?', 'athlete', 'opener', true),
    (v_imo_id, NULL, 'Athlete - Opener 10', 'hey! saw you played sports. what position?', 'athlete', 'opener', true),

  -- CAR SALESMAN OPENERS (10)
    (v_imo_id, NULL, 'Car Sales - Opener 1', 'hey! saw you''re in car sales. how''s the lot life?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 2', 'yo what''s up! car sales right? how long you been doing that?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 3', 'sup! noticed you''re selling cars. new or used?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 4', 'hey there! saw the car thing. what brand you selling?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 5', 'what''s good! car sales is competitive. you crushing it?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 6', 'hey! saw you''re at a dealership. how you like it?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 7', 'yo! noticed the car sales life. what got you into it?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 8', 'hey what''s up! selling cars? how''s the market right now?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 9', 'sup! saw you''re in automotive. you enjoy it?', 'car_salesman', 'opener', true),
    (v_imo_id, NULL, 'Car Sales - Opener 10', 'hey! car sales rep? how''s the dealership treating you?', 'car_salesman', 'opener', true),

  -- GENERAL/COLD OPENERS (10)
    (v_imo_id, NULL, 'General - Opener 1', 'hey! came across your page. what do you do for work?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 2', 'yo what''s up! your page caught my eye. what are you into?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 3', 'hey there! just scrolling and found you. what keeps you busy?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 4', 'sup! your content is interesting. what''s your thing?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 5', 'hey! random but your page looked cool. what do you do?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 6', 'what''s good! came across your profile. you seem driven. what''s your work?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 7', 'hey! saw your page. you look like you''re about your business. what industry?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 8', 'yo! just came across you. what keeps you motivated these days?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 9', 'hey what''s up! your vibe is solid. what do you do for work?', 'general_cold', 'opener', true),
    (v_imo_id, NULL, 'General - Opener 10', 'sup! stumbled on your profile. always looking to connect with driven people. what''s your hustle?', 'general_cold', 'opener', true);

  RAISE NOTICE 'Inserted 70 opener templates';

  -- ============================================================================
  -- FOLLOW-UP TEMPLATES (70 total - checking back, still casual)
  -- ============================================================================

  -- LICENSED AGENT FOLLOW-UPS (10)
  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Follow 1', 'hey just circling back! how''s the insurance world been treating you?', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 2', 'yo! never heard back. you good? busy season?', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 3', 'hey! just checking in. know things get crazy in this business', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 4', 'sup! hope i didn''t catch you at a bad time. just wanted to connect', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 5', 'hey there! figured i''d bump this. how''s production going?', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 6', 'yo! my message probably got buried lol. you still in the game?', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 7', 'hey! just wanted to follow up. how''s business been?', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 8', 'what''s good! didn''t want that message to get lost. hope things are well', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 9', 'sup! just floating this back up. crazy times in insurance lately huh', 'licensed_agent', 'follow_up', true),
    (v_imo_id, NULL, 'Licensed - Follow 10', 'hey! hope i''m not bugging you. just genuinely wanted to connect with other agents', 'licensed_agent', 'follow_up', true),

  -- HAS TEAM FOLLOW-UPS (10)
    (v_imo_id, NULL, 'Has Team - Follow 1', 'hey just bumping this! know running a team keeps you slammed', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 2', 'yo! figured my message got buried. team life is nonstop right', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 3', 'sup! just circling back. how''s the team doing?', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 4', 'hey there! following up. know leaders are always busy', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 5', 'what''s up! just floating this back. hope business is booming', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 6', 'hey! my last message probably got lost in the chaos. all good?', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 7', 'yo! just wanted to reconnect. team keeping you busy?', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 8', 'sup! bumping this up. how''s the squad performing?', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 9', 'hey! following up from before. hope things are going well with the crew', 'has_team', 'follow_up', true),
    (v_imo_id, NULL, 'Has Team - Follow 10', 'what''s good! just checking in. leading is a full time job i know lol', 'has_team', 'follow_up', true),

  -- SOLAR FOLLOW-UPS (10)
    (v_imo_id, NULL, 'Solar - Follow 1', 'hey! just following up. know solar keeps you grinding', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 2', 'yo! my message probably got lost. you out knocking still?', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 3', 'sup! bumping this. how''s the solar game treating you lately?', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 4', 'hey there! circling back. bet you''ve been busy', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 5', 'what''s up! figured i''d check in. solar season been wild?', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 6', 'hey! just wanted to follow up from before. hope deals are closing', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 7', 'yo! floating this back up. you still grinding in solar?', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 8', 'sup! know DMs get buried. just checking in', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 9', 'hey! hope you''re crushing it out there. just wanted to reconnect', 'solar', 'follow_up', true),
    (v_imo_id, NULL, 'Solar - Follow 10', 'what''s good! following up. how''s the territory looking?', 'solar', 'follow_up', true),

  -- DOOR-TO-DOOR FOLLOW-UPS (10)
    (v_imo_id, NULL, 'D2D - Follow 1', 'hey! bumping this. i know d2d keeps you on your feet all day', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 2', 'yo! my message probably got buried after a long day knocking. all good?', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 3', 'sup! just following up. you still out there grinding?', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 4', 'hey there! circling back. know the d2d life is exhausting', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 5', 'what''s up! figured you were probably grinding. just checking in', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 6', 'hey! floating this back. how''s the territory been?', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 7', 'yo! just wanted to reconnect. hope the doors have been good to you', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 8', 'sup! following up from before. still at it?', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 9', 'hey! know you''re probably dead tired after knocking. just checking in', 'door_to_door', 'follow_up', true),
    (v_imo_id, NULL, 'D2D - Follow 10', 'what''s good! bumping this up. hope sales have been solid', 'door_to_door', 'follow_up', true),

  -- ATHLETE FOLLOW-UPS (10)
    (v_imo_id, NULL, 'Athlete - Follow 1', 'hey! just following up. hope training or life has been good', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 2', 'yo! my message probably got lost in the mix. you good?', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 3', 'sup! just circling back. how''s everything going?', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 4', 'hey there! bumping this. hope things are moving for you', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 5', 'what''s up! figured i''d check back in. what''s been keeping you busy?', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 6', 'hey! just wanted to reconnect. life after sports is a journey huh', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 7', 'yo! floating this back up. hope you''re crushing it whatever you''re doing', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 8', 'sup! following up. athletes are always busy so i get it lol', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 9', 'hey! just checking in. what''s been going on with you?', 'athlete', 'follow_up', true),
    (v_imo_id, NULL, 'Athlete - Follow 10', 'what''s good! hope my last message didn''t get lost. just wanted to connect', 'athlete', 'follow_up', true),

  -- CAR SALESMAN FOLLOW-UPS (10)
    (v_imo_id, NULL, 'Car Sales - Follow 1', 'hey! just following up. know dealership life is crazy', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 2', 'yo! my message probably got buried between deals. all good?', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 3', 'sup! bumping this. how''s the lot been treating you?', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 4', 'hey there! circling back. hope you''ve been moving units', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 5', 'what''s up! figured i''d check in. end of month push going?', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 6', 'hey! just wanted to follow up. know weekends keep you slammed', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 7', 'yo! floating this back. how''s the floor been lately?', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 8', 'sup! following up from before. you still at the dealership?', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 9', 'hey! know car sales keeps you grinding. just checking in', 'car_salesman', 'follow_up', true),
    (v_imo_id, NULL, 'Car Sales - Follow 10', 'what''s good! bumping this up. hope sales have been solid', 'car_salesman', 'follow_up', true),

  -- GENERAL/COLD FOLLOW-UPS (10)
    (v_imo_id, NULL, 'General - Follow 1', 'hey! just following up. hope life''s been good', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 2', 'yo! my message probably got lost in the sauce lol. you good?', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 3', 'sup! just bumping this. no worries if you''re busy', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 4', 'hey there! circling back. how''s everything going with you?', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 5', 'what''s up! figured i''d check in. hope things are moving', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 6', 'hey! just wanted to reconnect. what''s been keeping you busy?', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 7', 'yo! floating this back up. hope you''re doing well', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 8', 'sup! know DMs get buried. just wanted to say what''s up', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 9', 'hey! hope my last message wasn''t weird lol. genuinely just trying to connect', 'general_cold', 'follow_up', true),
    (v_imo_id, NULL, 'General - Follow 10', 'what''s good! following up. hope everything''s been solid on your end', 'general_cold', 'follow_up', true);

  RAISE NOTICE 'Inserted 70 follow_up templates';

  -- ============================================================================
  -- ADDITIONAL ENGAGEMENT TEMPLATES (70 total - building rapport, keeping convo going)
  -- ============================================================================

  -- LICENSED AGENT ENGAGEMENT (10 more)
  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Engage 11', 'that''s dope. so are you mostly doing final expense or life?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 12', 'nice! how''d you find your way into insurance? i feel like everyone has a story', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 13', 'for real. what''s been your biggest win lately?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 14', 'gotcha. are you running your own leads or does your agency provide them?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 15', 'that makes sense. what made you pick that carrier/company?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 16', 'interesting. do you do mostly phone sales or in-home appointments?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 17', 'respect. what''s your favorite part about this business?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 18', 'true. are you planning to stay solo or thinking about building eventually?', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 19', 'nice. how''s your close rate been lately? market feels different', 'licensed_agent', 'engagement', true),
    (v_imo_id, NULL, 'Licensed - Engage 20', 'that''s real. what would need to change for you to be where you want to be?', 'licensed_agent', 'engagement', true),

  -- HAS TEAM ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'Has Team - Engage 11', 'that''s cool. how''d you make the jump from selling to leading?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 12', 'nice. do you still sell yourself or mostly focus on the team now?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 13', 'gotcha. what''s the hardest part about building a team for you?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 14', 'respect. how do you find your people? recruiting is a whole job', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 15', 'true. do you have systems in place or still building those out?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 16', 'that makes sense. what does your team meeting/training look like?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 17', 'interesting. are you happy with your current org structure?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 18', 'nice. what''s the biggest lesson you''ve learned building a team?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 19', 'for real. how many people you trying to get to by end of year?', 'has_team', 'engagement', true),
    (v_imo_id, NULL, 'Has Team - Engage 20', 'that''s dope. what keeps your best people around?', 'has_team', 'engagement', true),

  -- SOLAR ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'Solar - Engage 11', 'that''s cool. how many installs you averaging per month?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 12', 'nice. do you like the product or is it more about the money?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 13', 'gotcha. what got you into solar specifically?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 14', 'respect. is your company stable or you seeing some red flags?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 15', 'true. how long before you see that commission check hit?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 16', 'that makes sense. are you building a team there or just selling?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 17', 'interesting. what''s your pitch usually focus on?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 18', 'nice. do you see yourself doing this long term?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 19', 'for real. what would make you consider something else?', 'solar', 'engagement', true),
    (v_imo_id, NULL, 'Solar - Engage 20', 'that''s real. are the good months worth the bad ones?', 'solar', 'engagement', true),

  -- D2D ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'D2D - Engage 11', 'that''s dope. how many doors you hitting daily?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 12', 'nice. what''s your best pitch look like?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 13', 'gotcha. do you actually like the grind or is it a means to an end?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 14', 'respect. what''s the wildest door story you got?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 15', 'true. how do you stay motivated when people keep saying no?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 16', 'that makes sense. is there any path up at your company?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 17', 'interesting. what skills have you picked up doing this?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 18', 'nice. how long you planning to do d2d before you pivot?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 19', 'for real. what would your ideal next step look like?', 'door_to_door', 'engagement', true),
    (v_imo_id, NULL, 'D2D - Engage 20', 'that''s real. is the money worth what you put your body through?', 'door_to_door', 'engagement', true),

  -- ATHLETE ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'Athlete - Engage 11', 'that''s cool. do you miss the competition aspect?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 12', 'nice. what did sports teach you that translates to life?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 13', 'gotcha. are you using that network from sports at all?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 14', 'respect. where do you want to be in 5 years?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 15', 'true. does your current work challenge you like sports did?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 16', 'that makes sense. do you have the same structure now or miss that?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 17', 'interesting. what kind of income would change your life right now?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 18', 'nice. are you coachable in business like you were in sports?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 19', 'for real. what''s holding you back from the next level?', 'athlete', 'engagement', true),
    (v_imo_id, NULL, 'Athlete - Engage 20', 'that''s real. do you feel like you''re reaching your potential right now?', 'athlete', 'engagement', true),

  -- CAR SALES ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'Car Sales - Engage 11', 'that''s cool. how many units you moving monthly?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 12', 'nice. do you actually like cars or just fell into it?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 13', 'gotcha. what made you choose that dealership?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 14', 'respect. you thinking finance manager or staying on the floor?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 15', 'true. how''s the culture at your dealership?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 16', 'that makes sense. do you actually keep your customers or does the dealership own them?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 17', 'interesting. what would make you leave car sales?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 18', 'nice. what''s your close rate looking like?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 19', 'for real. do you see yourself doing this for the long haul?', 'car_salesman', 'engagement', true),
    (v_imo_id, NULL, 'Car Sales - Engage 20', 'that''s real. what skills have you built that could transfer somewhere else?', 'car_salesman', 'engagement', true),

  -- GENERAL ENGAGEMENT (10 more)
    (v_imo_id, NULL, 'General - Engage 11', 'that''s cool. how long you been doing that?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 12', 'nice. do you enjoy it or is it just paying bills?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 13', 'gotcha. what got you into that field?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 14', 'respect. where do you see yourself going with it?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 15', 'true. are you looking to grow or pretty comfortable where you''re at?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 16', 'that makes sense. do you have side hustles or is work keeping you busy enough?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 17', 'interesting. what would your ideal work situation look like?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 18', 'nice. do you control your own schedule or nah?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 19', 'for real. what skills do you have that feel underutilized?', 'general_cold', 'engagement', true),
    (v_imo_id, NULL, 'General - Engage 20', 'that''s real. are you open to learning about new opportunities or pretty locked in?', 'general_cold', 'engagement', true);

  RAISE NOTICE 'Inserted 70 additional engagement templates';

  -- ============================================================================
  -- ADDITIONAL DISCOVERY TEMPLATES (70 total - finding pain points)
  -- ============================================================================

  -- LICENSED AGENT DISCOVERY (10 more)
  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Discovery 11', 'i feel that. what''s the biggest thing you''d change about your current situation if you could?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 12', 'yeah that''s rough. do you feel like you have a real path to grow where you''re at?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 13', 'gotcha. is the money consistent or do you have really rough months?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 14', 'that sucks. do you feel like you''re getting the support you need from your upline?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 15', 'true. are you happy with your commission levels or do you feel like you''re leaving money on the table?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 16', 'makes sense. if money wasn''t an issue what would your ideal setup look like?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 17', 'dang. how much of your income goes right back into leads and marketing?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 18', 'that''s wild. do you feel stuck or like you have options?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 19', 'respect for being honest. what would need to happen for you to make a move?', 'licensed_agent', 'discovery', true),
    (v_imo_id, NULL, 'Licensed - Discovery 20', 'i hear you. on a scale of 1-10 how frustrated are you with where things are?', 'licensed_agent', 'discovery', true),

  -- HAS TEAM DISCOVERY (10 more)
    (v_imo_id, NULL, 'Has Team - Discovery 11', 'that''s tough. what''s the biggest obstacle to growing your team right now?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 12', 'yeah i get that. do you feel like your org gives you the tools to succeed?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 13', 'gotcha. are you happy with what you''re making off your team or feel underpaid?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 14', 'that''s frustrating. how much time do you spend recruiting vs actually leading?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 15', 'true. if you could fix one thing about your current structure what would it be?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 16', 'makes sense. do you feel like your upline actually helps or just collects checks?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 17', 'dang. what would make you consider a different opportunity?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 18', 'that''s real. how long can you realistically see yourself staying where you are?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 19', 'i hear you. what''s the biggest risk of staying where you are?', 'has_team', 'discovery', true),
    (v_imo_id, NULL, 'Has Team - Discovery 20', 'respect for being real. is your current path actually getting you to your goals?', 'has_team', 'discovery', true),

  -- SOLAR DISCOVERY (10 more)
    (v_imo_id, NULL, 'Solar - Discovery 11', 'that''s rough. what happens to your income when deals fall through last minute?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 12', 'yeah i''ve heard that. how long are you willing to wait to get paid?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 13', 'gotcha. do you feel like you have job security there?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 14', 'that sucks. what''s the backup plan if solar doesn''t work out long term?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 15', 'true. how much longer can you realistically do the physical grind?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 16', 'makes sense. if you could do something else with the same income would you?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 17', 'dang. what would you do if your company shut down tomorrow?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 18', 'that''s wild. are you building anything that lasts or just chasing deals?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 19', 'i feel you. what would need to change for you to feel secure?', 'solar', 'discovery', true),
    (v_imo_id, NULL, 'Solar - Discovery 20', 'respect for being honest. is what you''re doing actually sustainable?', 'solar', 'discovery', true),

  -- D2D DISCOVERY (10 more)
    (v_imo_id, NULL, 'D2D - Discovery 11', 'that''s tough. how much longer can you physically keep doing this?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 12', 'yeah that''s real. what''s the exit strategy from d2d?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 13', 'gotcha. do you feel like you''re building anything or just trading time for money?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 14', 'that sucks. what happens during the off season?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 15', 'true. how''s your body holding up? i''ve seen people burn out fast', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 16', 'makes sense. if you could make the same money without knocking would you?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 17', 'dang. what would you do if you couldn''t physically do this anymore?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 18', 'that''s wild. is the grind actually worth what you''re getting out of it?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 19', 'i hear you. what does your ideal situation look like in 3 years?', 'door_to_door', 'discovery', true),
    (v_imo_id, NULL, 'D2D - Discovery 20', 'respect. are you actively looking for something else or just waiting for the right thing?', 'door_to_door', 'discovery', true),

  -- ATHLETE DISCOVERY (10 more)
    (v_imo_id, NULL, 'Athlete - Discovery 11', 'that''s real. do you feel like you''re using your full potential right now?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 12', 'yeah i can see that. what''s been the hardest part about life after sports?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 13', 'gotcha. do you miss having coaches and structure guiding you?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 14', 'that sucks. is the money you''re making now enough to feel secure?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 15', 'true. do you feel like you found something that challenges you like sports did?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 16', 'makes sense. what would you do differently if you could start over?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 17', 'dang. are you happy with where you ended up after sports?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 18', 'that''s wild. what skills from sports are going to waste right now?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 19', 'i hear you. if the right opportunity came along would you jump on it?', 'athlete', 'discovery', true),
    (v_imo_id, NULL, 'Athlete - Discovery 20', 'respect. what''s stopping you from reaching that next level?', 'athlete', 'discovery', true),

  -- CAR SALES DISCOVERY (10 more)
    (v_imo_id, NULL, 'Car Sales - Discovery 11', 'that''s tough. what happens when you have a slow month?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 12', 'yeah that''s real. do you feel stuck at the dealership or like you have options?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 13', 'gotcha. how much longer can you do the weekend grind?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 14', 'that sucks. what''s the ceiling for you there? is there even one?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 15', 'true. do you actually own your customer base or does the dealership?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 16', 'makes sense. if you could make the same money with weekends off would you?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 17', 'dang. what would you do if the dealership closed tomorrow?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 18', 'that''s wild. are you building equity or just helping the owner get rich?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 19', 'i feel you. what would make you consider doing something different?', 'car_salesman', 'discovery', true),
    (v_imo_id, NULL, 'Car Sales - Discovery 20', 'respect for being honest. is car sales your long term plan?', 'car_salesman', 'discovery', true),

  -- GENERAL DISCOVERY (10 more)
    (v_imo_id, NULL, 'General - Discovery 11', 'that''s real. what''s the biggest thing holding you back right now?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 12', 'yeah i hear that. do you feel like you''re reaching your potential?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 13', 'gotcha. on a scale of 1-10 how happy are you with where you''re at?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 14', 'that sucks. what would need to change for that number to be a 10?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 15', 'true. do you feel like your work fulfills you or just pays bills?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 16', 'makes sense. if you could design your perfect situation what would it look like?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 17', 'dang. what''s the biggest sacrifice you''re making right now for work?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 18', 'that''s wild. do you control your income or does someone else?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 19', 'i feel you. what would you do if you knew you couldn''t fail?', 'general_cold', 'discovery', true),
    (v_imo_id, NULL, 'General - Discovery 20', 'respect for being real. are you open to hearing about something different?', 'general_cold', 'discovery', true);

  RAISE NOTICE 'Inserted 70 additional discovery templates';

  -- ============================================================================
  -- CLOSER TEMPLATES (70 total - transitioning to call/meeting)
  -- ============================================================================

  -- LICENSED AGENT CLOSERS (10)
  INSERT INTO instagram_message_templates (imo_id, user_id, name, content, category, message_stage, is_active)
  VALUES
    (v_imo_id, NULL, 'Licensed - Close 1', 'honestly sounds like you''re in the right mindset for something different. would you be down to hop on a quick call and i can share what we''re doing?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 2', 'look i''m not saying it''s for everyone but based on what you said it might be worth a 15 min convo. you free sometime this week?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 3', 'i think you''d actually like what we got going on. no pressure but want to do a quick zoom so i can show you?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 4', 'real talk i connect with agents all the time but you seem different. can we set up a call so i can explain what the opportunity looks like?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 5', 'you seem like someone who''s actually serious about leveling up. want to jump on a call and i can walk you through what we do?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 6', 'not trying to pitch you hard but i think what i''m doing would solve a lot of what you mentioned. 20 minutes to chat?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 7', 'hey based on everything you said i think it makes sense to talk more. can we schedule a quick intro call?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 8', 'i''d rather explain it all on a call than keep going back and forth on here. you down to connect this week?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 9', 'look worst case you spend 15 minutes learning about something new. can we set up a zoom?', 'licensed_agent', 'closer', true),
    (v_imo_id, NULL, 'Licensed - Close 10', 'i think there''s something here worth exploring. want to hop on a quick call and see if it makes sense?', 'licensed_agent', 'closer', true),

  -- HAS TEAM CLOSERS (10)
    (v_imo_id, NULL, 'Has Team - Close 1', 'sounds like you''ve built something solid but maybe hitting a ceiling. want to jump on a call and see if what we''re doing makes sense for you?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 2', 'real talk i work with team leaders who felt exactly like you. 15 min call to see if there''s a fit?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 3', 'based on what you shared i think you''d actually be a great fit for what we''re building. can we set up a zoom?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 4', 'i''ve helped other people in your exact situation make a move. want to hop on a call and i can show you how?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 5', 'look you clearly know how to build. the question is whether you''re in the right vehicle. 20 minutes to explore?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 6', 'no pressure at all but i think it''s worth a convo. would you be open to a quick call this week?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 7', 'i don''t want to oversell it but what we offer could solve a lot of what you mentioned. zoom work for you?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 8', 'you''ve clearly got the skills. let me show you a structure that actually rewards builders. quick call?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 9', 'worst case you get a second opinion on what you''re doing. best case you find something better. down to chat?', 'has_team', 'closer', true),
    (v_imo_id, NULL, 'Has Team - Close 10', 'i think there''s a real conversation to be had here. can we schedule 15-20 min this week?', 'has_team', 'closer', true),

  -- SOLAR CLOSERS (10)
    (v_imo_id, NULL, 'Solar - Close 1', 'look i''ve talked to a ton of solar people going through exactly what you described. want to hop on a call and hear about something different?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 2', 'honestly solar is a stepping stone for most people. want to see what''s on the other side? 15 min call?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 3', 'you''ve already proven you can sell. question is whether you''re maximizing that skill. want to jump on a zoom?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 4', 'i''m not gonna lie what i do is way different from solar but i think you''d crush it. can we schedule a quick call?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 5', 'based on everything you said i think you''re ready for something more sustainable. 20 minutes to chat?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 6', 'no pressure but if you''re even slightly curious it''s worth a conversation. free sometime this week?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 7', 'look worst case you keep doing solar with more info. best case you find something better. zoom?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 8', 'your sales skills are clearly there. let me show you a better vehicle for them. quick intro call?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 9', 'i think what we do would actually excite you. can we hop on a 15 minute call to see if i''m right?', 'solar', 'closer', true),
    (v_imo_id, NULL, 'Solar - Close 10', 'you seem like someone who''s outgrowing where they''re at. want to explore what''s next? quick zoom?', 'solar', 'closer', true),

  -- D2D CLOSERS (10)
    (v_imo_id, NULL, 'D2D - Close 1', 'real talk the skills you''ve built knocking are valuable. want to see how to use them without destroying your body? 15 min call?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 2', 'you''ve already proven you can handle rejection and grind. question is what you do with that next. want to chat?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 3', 'honestly d2d builds beasts but there''s a better way to use what you''ve learned. zoom this week?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 4', 'i think you''re way too talented to be knocking doors forever. let me show you what else is out there. quick call?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 5', 'not saying d2d is bad but there''s a level up waiting. want to hop on a call and i can explain?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 6', 'you''ve already got the hard part down. now let''s talk about using it smarter. 20 minutes?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 7', 'look i respect the grind but there''s more out there. want to see what i mean? quick zoom?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 8', 'worst case you go back to d2d with more perspective. best case you find your exit. call this week?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 9', 'your hustle is clear. let me show you how to turn that into something sustainable. 15 min intro?', 'door_to_door', 'closer', true),
    (v_imo_id, NULL, 'D2D - Close 10', 'i think you''d actually love what we do. can we jump on a quick call so i can show you?', 'door_to_door', 'closer', true),

  -- ATHLETE CLOSERS (10)
    (v_imo_id, NULL, 'Athlete - Close 1', 'look the same drive that made you a great athlete can make you successful in business. want to hop on a call and hear about what i do?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 2', 'honestly what we do rewards people with your mentality. 15 minutes to see if it''s a fit?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 3', 'you clearly have what it takes to compete at a high level. let me show you a new arena. quick zoom?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 4', 'i work with ex-athletes all the time and they crush it in this space. want to learn why? call this week?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 5', 'the transition from sports is hard but you''ve got transferable skills. want to see how to use them? 20 min call?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 6', 'no pressure at all but i think you''d be interested in what i do. can we set up a quick zoom?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 7', 'your discipline and competitiveness would translate perfectly here. want to hop on a call and hear more?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 8', 'worst case you spend 15 minutes learning something new. best case you find your next chapter. down?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 9', 'i think once you see what this is you''ll get excited. can we schedule a quick intro call?', 'athlete', 'closer', true),
    (v_imo_id, NULL, 'Athlete - Close 10', 'you seem ready for something that actually challenges you. let me show you what i mean. zoom?', 'athlete', 'closer', true),

  -- CAR SALES CLOSERS (10)
    (v_imo_id, NULL, 'Car Sales - Close 1', 'you clearly know how to sell. question is whether you''re in the right vehicle no pun intended lol. want to chat?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 2', 'real talk the skills you have would crush in what i do. 15 minutes to see if it makes sense?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 3', 'i talk to car salespeople all the time who make the switch and kill it. want to see what that looks like? quick zoom?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 4', 'you''re already doing the hard part. now imagine doing it with no desk manager and keeping your customers. call?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 5', 'not saying car sales is bad but there might be something better for you. 20 minutes to explore?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 6', 'honestly based on what you said you''re way too talented to stay on a lot forever. want to hop on a call?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 7', 'look worst case you go back to the dealership knowing your options. best case you find freedom. zoom?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 8', 'your closing skills would translate perfectly. let me show you where. quick call this week?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 9', 'i think what we do would actually check all your boxes. can we set up an intro call?', 'car_salesman', 'closer', true),
    (v_imo_id, NULL, 'Car Sales - Close 10', 'you seem like someone who wants more. let me show you what more looks like. 15 min zoom?', 'car_salesman', 'closer', true),

  -- GENERAL/COLD CLOSERS (10)
    (v_imo_id, NULL, 'General - Close 1', 'look based on what you shared i think there might be something here worth exploring. would you be open to a quick call?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 2', 'honestly i don''t know if this is for you but there''s only one way to find out. 15 min zoom work?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 3', 'you seem like someone who''s hungry for more. want to hop on a call and i can share what i do?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 4', 'i''d rather explain it on a call than keep going back and forth. free sometime this week?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 5', 'no pressure at all but i think you''d find what i do interesting. quick intro call?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 6', 'worst case you spend 15 minutes learning about something new. best case it changes everything. down?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 7', 'look i only reach out to people who seem driven. you fit that. want to see what this is about? zoom?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 8', 'i think once you understand what we do you''ll at least be curious. can we set up a quick call?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 9', 'you seem like someone who''s not afraid to bet on yourself. want to hop on a call and hear what that could look like?', 'general_cold', 'closer', true),
    (v_imo_id, NULL, 'General - Close 10', 'real talk i think there''s a conversation worth having here. 20 minutes this week?', 'general_cold', 'closer', true);

  RAISE NOTICE 'Inserted 70 closer templates';

  RAISE NOTICE 'Successfully seeded 350 total templates (70 per stage x 5 stages)';

END $$;
