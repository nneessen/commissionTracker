// scripts/seed-engagement-templates.js
// Seeds Instagram DM engagement/conversation continuer templates
// These are for mid-conversation when rapport is building and you're gathering info

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Run with: SUPABASE_SERVICE_KEY=your_key node scripts/seed-engagement-templates.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = 'd0d3edea-af6d-4990-80b8-1765ba829896';
const IMO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Engagement templates organized by category
// These are for mid-conversation - probing, rapport building, transitioning
const engagementTemplates = {
  // ==========================================================================
  // LICENSED AGENT - Engagement/Conversation Continuers
  // ==========================================================================
  licensed_agent: [
    { name: 'Licensed Agent - Background Probe', content: `That's dope that you're already licensed! How long have you been at it? What got you into insurance in the first place?`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Pain Point Dig', content: `Interesting - so what's the biggest thing holding you back right now? Is it leads, training, comp, or something else?`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Vision Question', content: `Yeah I totally get that. What would need to change for you to feel like you're actually winning? Like what does that look like for you?`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Ideal Setup', content: `That makes sense. Out of curiosity, what does your ideal setup look like? Like if you could design the perfect situation, what would it be?`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Satisfaction Check', content: `Real talk - are you happy where you're at, or just comfortable? No judgment, genuine question.`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Loyalty Probe', content: `Sounds like you've got some solid experience. What's keeping you at your current spot? Is it loyalty, comp, or something else?`, message_stage: 'engagement' },
    { name: 'Licensed Agent - Openness Check', content: `I hear you. So if the right opportunity came along, would you be open to at least hearing about it? Or are you locked in where you are?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // HAS TEAM - Engagement/Conversation Continuers
  // ==========================================================================
  has_team: [
    { name: 'Team Leader - Team Size Probe', content: `That's awesome you've built a team! How many people are you leading right now? What's been the hardest part about scaling?`, message_stage: 'engagement' },
    { name: 'Team Leader - Support Gap', content: `Yeah team building is no joke. What do you wish your upline did better to support you? Like what's missing?`, message_stage: 'engagement' },
    { name: 'Team Leader - Magic Wand', content: `Makes sense. If you could wave a magic wand and fix one thing about your current situation, what would it be?`, message_stage: 'engagement' },
    { name: 'Team Leader - Problem Diagnosis', content: `So is it more of a retention issue or a recruiting issue? Both are fixable btw.`, message_stage: 'engagement' },
    { name: 'Team Leader - Systems Check', content: `I feel that. What systems do you have in place for training your people? Or is it more 1-on-1 right now?`, message_stage: 'engagement' },
    { name: 'Team Leader - Bottleneck ID', content: `Gotcha. What would it take for your team to double their production? What's the bottleneck?`, message_stage: 'engagement' },
    { name: 'Team Leader - Interest Gauge', content: `That's real. So if there was a way to get better support AND better comp for your whole team, would that be worth exploring?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // SOLAR - Engagement/Conversation Continuers
  // ==========================================================================
  solar: [
    { name: 'Solar Rep - Experience Probe', content: `Nice! How long have you been in solar? What's been your favorite part of it so far?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Market Reality', content: `Yeah the solar market can be wild. What's been the biggest challenge for you lately? Is it the leads, the installations, or something else?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Income Goals', content: `I hear you. If you don't mind me asking, what kind of income are you trying to hit? Are you close to that right now?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Skills Transfer', content: `That's solid. You know what's cool? All those sales skills you've built would transfer perfectly to insurance. Same energy, different product. Ever thought about that?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Stability Question', content: `Makes sense. What matters more to you right now - the potential for big months, or more consistency in your income?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Residual Interest', content: `Real talk - does the idea of residual income appeal to you? Like getting paid on the same clients year after year?`, message_stage: 'engagement' },
    { name: 'Solar Rep - Openness Check', content: `Gotcha. So would you say you're 100% committed to solar, or open to exploring other paths if they made sense?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // DOOR TO DOOR - Engagement/Conversation Continuers
  // ==========================================================================
  door_to_door: [
    { name: 'D2D Rep - Experience Dig', content: `D2D is no joke - respect the grind! How long have you been knocking? What are you selling right now?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Best Part', content: `Nice! What's your favorite thing about D2D? And what's the one thing you'd change if you could?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Numbers Question', content: `That makes sense. If you don't mind sharing, what does a good week look like for you income-wise? Are you hitting that consistently?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Long Term', content: `I hear you. Do you see yourself doing D2D long term, or is this more of a stepping stone to something else?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Weather/Seasons', content: `Real question - how do you handle the seasonal stuff? Like what do you do when the weather sucks or business slows down?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Skills Recognition', content: `You know what's crazy? The skills you've built knocking doors are exactly what crushes in insurance. Same resilience, better lifestyle. Sound interesting?`, message_stage: 'engagement' },
    { name: 'D2D Rep - Lifestyle Check', content: `Gotcha. If there was a way to make similar or better money without the constant grind of D2D, would that be worth looking into?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // ATHLETE - Engagement/Conversation Continuers
  // ==========================================================================
  athlete: [
    { name: 'Athlete - Sport Background', content: `That's dope! What sport do/did you play? How long have you been at it?`, message_stage: 'engagement' },
    { name: 'Athlete - Competition Mindset', content: `Love that competitive energy. What are you working toward right now career-wise? Any specific goals you're chasing?`, message_stage: 'engagement' },
    { name: 'Athlete - Post-Sport Plans', content: `Makes sense. Have you thought about what you want to do long-term? Like after sports or alongside it?`, message_stage: 'engagement' },
    { name: 'Athlete - Work Ethic Connect', content: `I hear you. Here's what's cool - that athlete mindset and work ethic translates perfectly to business. You already know how to grind. Ever thought about that?`, message_stage: 'engagement' },
    { name: 'Athlete - Income Goals', content: `Real talk - what kind of income would you need to feel comfortable? Not asking for exact numbers, just ballpark what you're shooting for.`, message_stage: 'engagement' },
    { name: 'Athlete - Time Freedom', content: `That makes sense. How important is flexibility to you? Like being able to set your own schedule around training or whatever?`, message_stage: 'engagement' },
    { name: 'Athlete - Interest Gauge', content: `Gotcha. So if there was something that let you build real income with that same competitive drive, would you want to hear about it?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // CAR SALESMAN - Engagement/Conversation Continuers
  // ==========================================================================
  car_salesman: [
    { name: 'Car Sales - Experience Probe', content: `Nice! How long have you been in car sales? What dealership are you at? I know that world can be intense.`, message_stage: 'engagement' },
    { name: 'Car Sales - Best/Worst', content: `That's solid. What's the best part of car sales for you? And what's the one thing you'd change if you could?`, message_stage: 'engagement' },
    { name: 'Car Sales - Income Reality', content: `I hear you. If you don't mind me asking, are you hitting the numbers you want? Or is there a gap between where you are and where you want to be?`, message_stage: 'engagement' },
    { name: 'Car Sales - Schedule Pain', content: `Yeah the schedule in car sales is brutal. Weekends, nights, all that. How do you feel about that long-term?`, message_stage: 'engagement' },
    { name: 'Car Sales - Skills Transfer', content: `Here's what's crazy - those car sales skills would absolutely crush in insurance. Same closing ability, way better lifestyle. Ever thought about that?`, message_stage: 'engagement' },
    { name: 'Car Sales - Ceiling Question', content: `Makes sense. Do you feel like there's a ceiling where you're at? Or do you see a clear path to where you want to be?`, message_stage: 'engagement' },
    { name: 'Car Sales - Openness Check', content: `Gotcha. So if there was something with better hours, similar or better income, and more control - would that be worth a conversation?`, message_stage: 'engagement' },
  ],

  // ==========================================================================
  // GENERAL COLD - Engagement/Conversation Continuers
  // ==========================================================================
  general_cold: [
    { name: 'Cold - Background Dig', content: `Nice to meet you! So what are you up to right now career-wise? What's your current situation looking like?`, message_stage: 'engagement' },
    { name: 'Cold - Goals Question', content: `That's interesting. What kind of goals are you working toward? Like what does success look like for you right now?`, message_stage: 'engagement' },
    { name: 'Cold - Pain Point Probe', content: `I hear you. What's the biggest challenge you're facing right now in your career or income? What would you want to change?`, message_stage: 'engagement' },
    { name: 'Cold - Experience Check', content: `Makes sense. Have you ever done any kind of sales or entrepreneurial stuff before? Or is this all new territory?`, message_stage: 'engagement' },
    { name: 'Cold - Income Goals', content: `Real talk - what kind of income would make you feel like you've "made it"? Not judging, just curious what you're shooting for.`, message_stage: 'engagement' },
    { name: 'Cold - Time Freedom', content: `Gotcha. How important is flexibility and being your own boss to you? Or are you cool with a traditional 9-5 type setup?`, message_stage: 'engagement' },
    { name: 'Cold - Interest Gauge', content: `That's real. So if there was something that could help you hit those goals faster - something legitimate, not a scam - would you want to hear about it?`, message_stage: 'engagement' },
  ],
};

async function seedEngagementTemplates() {
  console.log('Starting engagement template seeding...\n');

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [category, templates] of Object.entries(engagementTemplates)) {
    console.log(`\n📁 Category: ${category}`);
    console.log('─'.repeat(50));

    for (const template of templates) {
      try {
        // Check if template with same name already exists
        const { data: existing } = await supabase
          .from('instagram_message_templates')
          .select('id')
          .eq('user_id', USER_ID)
          .eq('name', template.name)
          .maybeSingle();

        if (existing) {
          console.log(`  ⏭️  Skipped (exists): ${template.name}`);
          totalSkipped++;
          continue;
        }

        // Insert new template
        const { error } = await supabase
          .from('instagram_message_templates')
          .insert({
            imo_id: IMO_ID,
            user_id: USER_ID,
            name: template.name,
            content: template.content,
            category: category,
            message_stage: template.message_stage,
            is_active: true,
            use_count: 0,
          });

        if (error) {
          console.error(`  ❌ Error: ${template.name}`, error.message);
          totalErrors++;
        } else {
          console.log(`  ✅ Inserted: ${template.name}`);
          totalInserted++;
        }
      } catch (err) {
        console.error(`  ❌ Exception: ${template.name}`, err.message);
        totalErrors++;
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('SUMMARY');
  console.log('═'.repeat(50));
  console.log(`✅ Inserted: ${totalInserted}`);
  console.log(`⏭️  Skipped:  ${totalSkipped}`);
  console.log(`❌ Errors:   ${totalErrors}`);
  console.log(`📊 Total:    ${totalInserted + totalSkipped + totalErrors}`);
}

seedEngagementTemplates()
  .then(() => {
    console.log('\n✨ Engagement template seeding complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
