// scripts/seed-instagram-templates.js
// Seeds Instagram DM templates for The Standard agency
// Target audience: Young twenty-somethings
// Tone: Hip but professional, focused on booking calls

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcyaqwodnyrpkaiojnpz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Run with: SUPABASE_SERVICE_KEY=your_key node scripts/seed-instagram-templates.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = 'd0d3edea-af6d-4990-80b8-1765ba829896';
const IMO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Templates organized by category
const templates = {
  // ==========================================================================
  // LICENSED AGENT - Already in insurance, looking to level up
  // ==========================================================================
  licensed_agent: [
    // Openers (7)
    { name: 'Licensed Agent - Casual Opener', content: `Hey! Saw you're in the insurance game too. Quick question - are you building something for yourself or just collecting a paycheck? No judgment either way, just curious 👀`, message_stage: 'opener' },
    { name: 'Licensed Agent - Results Opener', content: `What's up! I noticed you're licensed - that's dope. Real talk though, are you actually hitting the numbers you want? Most agents I talk to aren't, and there's usually a reason.`, message_stage: 'opener' },
    { name: 'Licensed Agent - Direct Opener', content: `Hey! Fellow agent here. I'm with The Standard and we're doing things a little differently. Would love to share what's working for us if you're open to it.`, message_stage: 'opener' },
    { name: 'Licensed Agent - Problem Aware', content: `Quick question for you - are you getting the support you need from your current setup? Or is it more of a "figure it out yourself" situation? Been there.`, message_stage: 'opener' },
    { name: 'Licensed Agent - Opportunity Opener', content: `Hey! Random but I'm building something with The Standard and looking for agents who actually want to grow. You seem like you might be about that life - am I wrong?`, message_stage: 'opener' },
    { name: 'Licensed Agent - Value Opener', content: `What's good! I help licensed agents go from grinding to actually building wealth. Not the typical "sell more policies" advice. Interested in what I mean?`, message_stage: 'opener' },
    { name: 'Licensed Agent - Curiosity Opener', content: `Hey! Genuine question - if you could change ONE thing about your current situation in insurance, what would it be?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Licensed Agent - Soft Follow Up', content: `Hey! Just circling back - no pressure at all, but did you get a chance to think about what we chatted about? Would love to connect if you're still interested.`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - Value Add Follow Up', content: `Yo! Forgot to mention - we just had an agent hit $20K in a month using our system. Not bragging, just thought you'd want to know what's possible.`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - Check In Follow Up', content: `Hey! Hope you're crushing it this week. Still down to chat if you are - just lmk what works for your schedule.`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - FOMO Follow Up', content: `Quick heads up - we're onboarding a few new agents this month and I thought of you. No pressure, but didn't want you to miss out if you were interested.`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - Casual Follow Up', content: `Hey! No stress if you're slammed, but wanted to see if you're still curious about The Standard. Happy to answer any questions.`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - Results Follow Up', content: `Checking in! One of our newer agents just closed their first $5K week. Made me think of our convo - you still thinking about making a move?`, message_stage: 'follow_up' },
    { name: 'Licensed Agent - Direct Follow Up', content: `Real talk - I know DMs can get buried. Still interested in hopping on a quick call? 15 mins, no pitch, just vibes.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Licensed Agent - Book Call Closer', content: `Alright let's make this happen - what's your schedule look like this week? I've got some spots open and would love to show you what we're building at The Standard.`, message_stage: 'closer' },
    { name: 'Licensed Agent - Urgency Closer', content: `Hey! We're wrapping up our current cohort soon - if you want in, let's get on a call this week. What day works for you?`, message_stage: 'closer' },
    { name: 'Licensed Agent - Easy Closer', content: `Look, worst case you hop on a 15 min call and learn something new. Best case it changes your whole trajectory. Worth it? Drop me a time.`, message_stage: 'closer' },
    { name: 'Licensed Agent - No Pressure Closer', content: `No pressure at all, but if you're serious about leveling up, let's talk. Send me 2-3 times that work and I'll make it happen.`, message_stage: 'closer' },
    { name: 'Licensed Agent - Confident Closer', content: `Here's the deal - The Standard isn't for everyone, but for the right agents, it's a game changer. Let's hop on a call and see if it's a fit. When works?`, message_stage: 'closer' },
    { name: 'Licensed Agent - Value Closer', content: `I'll be honest - this call could be the most valuable 15 mins of your week. Let's lock it in. What's your availability looking like?`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // HAS TEAM - Already leading people, could bring their team
  // ==========================================================================
  has_team: [
    // Openers (7)
    { name: 'Team Leader - Recognition Opener', content: `Hey! I see you're already building a team - that's huge. Most people can't even get to that point. Quick question - are you and your team eating or just surviving?`, message_stage: 'opener' },
    { name: 'Team Leader - Scale Opener', content: `What's up! Building a team is one thing, but scaling it is another game entirely. We've cracked the code at The Standard - would love to share what's working.`, message_stage: 'opener' },
    { name: 'Team Leader - Support Opener', content: `Hey! Real talk - how much of your time is spent putting out fires vs actually growing? Most team leaders I know are drowning. Doesn't have to be that way.`, message_stage: 'opener' },
    { name: 'Team Leader - Opportunity Opener', content: `Quick question - if you could bring your whole team somewhere with better comp, better support, and better systems, would you? Just curious.`, message_stage: 'opener' },
    { name: 'Team Leader - Pain Point Opener', content: `Hey! I know leading a team can feel like herding cats sometimes. What if there was a system that actually made it easier? That's what we built at The Standard.`, message_stage: 'opener' },
    { name: 'Team Leader - Results Opener', content: `What's good! I help team leaders 2-3x their production without working more hours. Sound too good to be true? I get it. Happy to prove it.`, message_stage: 'opener' },
    { name: 'Team Leader - Direct Opener', content: `Hey! I'm putting together a group of ambitious team leaders at The Standard. Your name came up - interested in learning more?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Team Leader - Check In Follow Up', content: `Hey! Just wanted to circle back - how's the team doing? Still interested in chatting about what we're building at The Standard?`, message_stage: 'follow_up' },
    { name: 'Team Leader - Value Follow Up', content: `Yo! Just had a team leader bring over 8 agents last month and they're all killing it. Made me think of you - still open to talking?`, message_stage: 'follow_up' },
    { name: 'Team Leader - Support Follow Up', content: `Quick check in - are you getting the backend support you need for your team? That's one of the biggest things we've dialed in at The Standard.`, message_stage: 'follow_up' },
    { name: 'Team Leader - Growth Follow Up', content: `Hey! Still thinking about scaling your team? Would love to share how we're helping leaders grow without burning out.`, message_stage: 'follow_up' },
    { name: 'Team Leader - Casual Follow Up', content: `Hope you're having a solid week! No pressure, but the offer to chat about The Standard is still on the table if you're interested.`, message_stage: 'follow_up' },
    { name: 'Team Leader - Results Follow Up', content: `Quick update - another team just hit their best month ever after joining us. Your team could be next. Still down to talk?`, message_stage: 'follow_up' },
    { name: 'Team Leader - Direct Follow Up', content: `Real talk - I know you're busy leading your team. But 15 mins could change everything for you and them. Worth a conversation?`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Team Leader - Full Team Closer', content: `Alright, let's do this - I want to show you exactly what The Standard could do for you AND your team. When can we hop on a call?`, message_stage: 'closer' },
    { name: 'Team Leader - Vision Closer', content: `Imagine your team actually hitting their goals consistently. That's what we help make happen. Let's talk - what's your schedule look like?`, message_stage: 'closer' },
    { name: 'Team Leader - Next Level Closer', content: `You've already proven you can build a team. Now let's talk about taking them to the next level. Drop me some times that work.`, message_stage: 'closer' },
    { name: 'Team Leader - No Brainer Closer', content: `Better comp, better systems, better support for your whole team. Let's at least have the conversation. When works for you?`, message_stage: 'closer' },
    { name: 'Team Leader - Leadership Closer', content: `The best leaders are always looking for ways to help their team win. This could be that move. Let's connect this week - what day works?`, message_stage: 'closer' },
    { name: 'Team Leader - Opportunity Closer', content: `We're selectively bringing on team leaders who are ready to grow. You seem like that person. Let's talk - send me your availability.`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // SOLAR - Coming from solar sales industry
  // ==========================================================================
  solar: [
    // Openers (7)
    { name: 'Solar Rep - Industry Opener', content: `Hey! I see you're in solar - respect the grind. Quick question though, how's the market treating you lately? I know it's been wild out there.`, message_stage: 'opener' },
    { name: 'Solar Rep - Transition Opener', content: `What's up! A lot of solar reps have been making the switch to insurance lately. Not saying you should, but curious if you've thought about it?`, message_stage: 'opener' },
    { name: 'Solar Rep - Skills Opener', content: `Hey! Your sales skills in solar would absolutely crush in insurance. Same hustle, better margins. Ever considered making a move?`, message_stage: 'opener' },
    { name: 'Solar Rep - Stability Opener', content: `Real talk - solar can be feast or famine depending on the market. What if there was something more consistent that paid just as well?`, message_stage: 'opener' },
    { name: 'Solar Rep - Opportunity Opener', content: `Hey! Random question - are you married to solar or open to other opportunities? We've got some ex-solar reps at The Standard absolutely killing it.`, message_stage: 'opener' },
    { name: 'Solar Rep - Residual Opener', content: `What's good! One thing I love about insurance vs solar - residual income. You close once and get paid forever. Ever thought about that?`, message_stage: 'opener' },
    { name: 'Solar Rep - Direct Opener', content: `Hey! I'm with The Standard and we're specifically looking for high-energy sales people like you. Solar background is actually perfect for what we do.`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Solar Rep - Market Follow Up', content: `Hey! How's the solar market been this month? Just checking in - still curious if you'd ever consider a change.`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Success Story Follow Up', content: `Quick update - one of our guys came from solar 6 months ago and just hit $15K in a month. Made me think of our convo. Still interested?`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Check In Follow Up', content: `Hey! No pressure at all, but wanted to see if you gave any more thought to what we talked about. Happy to answer any questions.`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Soft Follow Up', content: `Just circling back! I know transitions can be scary, but sometimes the best move is the one you're most nervous about. Still down to chat?`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Value Follow Up', content: `Yo! Forgot to mention - we have a full training program for people coming from other industries. You wouldn't be thrown in blind.`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Timing Follow Up', content: `Hey! Is now a good time to be thinking about a change, or is solar keeping you busy? Either way, the door's open when you're ready.`, message_stage: 'follow_up' },
    { name: 'Solar Rep - Direct Follow Up', content: `Real talk - your sales skills are too good to be stuck if the market's not cooperating. Let's at least have a conversation about options.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Solar Rep - Easy Transition Closer', content: `Look, making a switch can seem like a lot, but we make it stupid easy. Let's hop on a call and I'll walk you through exactly how it works. When are you free?`, message_stage: 'closer' },
    { name: 'Solar Rep - Compare Closer', content: `Tell you what - let's get on a call and I'll show you the numbers side by side. If solar's still better for you, no hard feelings. What day works?`, message_stage: 'closer' },
    { name: 'Solar Rep - Skills Closer', content: `Your D2D skills would translate immediately. Let's talk about how you could be earning in insurance within weeks. When can we connect?`, message_stage: 'closer' },
    { name: 'Solar Rep - Opportunity Closer', content: `We're bringing on a few people from solar this month. If you want in, let's make it happen. What's your schedule look like?`, message_stage: 'closer' },
    { name: 'Solar Rep - No Risk Closer', content: `Worst case, you learn about a solid backup plan. Best case, you find something better than solar. 15 min call - you in?`, message_stage: 'closer' },
    { name: 'Solar Rep - Urgency Closer', content: `I've got a few spots for our next training class. If you're serious about exploring this, let's talk this week. When works for you?`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // DOOR TO DOOR - D2D sales experience
  // ==========================================================================
  door_to_door: [
    // Openers (7)
    { name: 'D2D Rep - Respect Opener', content: `Hey! D2D sales is no joke - major respect for grinding like that. Quick question though, you planning on knocking doors forever or building something bigger?`, message_stage: 'opener' },
    { name: 'D2D Rep - Weather Opener', content: `What's up! Gotta ask - you ever get tired of the weather dictating your income? There's a way to use those same skills without being at nature's mercy.`, message_stage: 'opener' },
    { name: 'D2D Rep - Upgrade Opener', content: `Hey! Your closing skills in D2D would absolutely destroy in insurance. Same energy, better lifestyle. Ever thought about leveling up?`, message_stage: 'opener' },
    { name: 'D2D Rep - Lifestyle Opener', content: `Real talk - D2D is great money but rough on the body and schedule. What if you could make the same (or more) without the physical grind?`, message_stage: 'opener' },
    { name: 'D2D Rep - Skills Opener', content: `Hey! Anyone who can close on a doorstep can close anywhere. We've got D2D vets at The Standard making serious money. Curious to hear more?`, message_stage: 'opener' },
    { name: 'D2D Rep - Direct Opener', content: `What's good! I specifically recruit D2D people because y'all have the work ethic most people don't. Interested in hearing what we're doing at The Standard?`, message_stage: 'opener' },
    { name: 'D2D Rep - Residual Opener', content: `Hey! Here's something D2D doesn't offer - residual income. Close once, get paid over and over. That's the insurance game. Want to know more?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'D2D Rep - Season Follow Up', content: `Hey! How's the D2D season treating you? Just checking in - still curious if you'd want to explore other options.`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Success Follow Up', content: `Quick story - had a D2D guy join us last summer and he just hit $25K in a month. Your skills could do the same. Still interested?`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Check In Follow Up', content: `Hey! No pressure, just wanted to see if you've thought any more about what we discussed. Happy to answer questions.`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Lifestyle Follow Up', content: `Just circling back - how's the grind going? The offer to chat about something more sustainable is still on the table.`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Training Follow Up', content: `Yo! Forgot to mention - we have a full system for training D2D reps into insurance. You wouldn't be starting from scratch.`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Off Season Follow Up', content: `Hey! D2D off-season coming up? That might be the perfect time to explore insurance. Let me know if you want to talk.`, message_stage: 'follow_up' },
    { name: 'D2D Rep - Direct Follow Up', content: `Real talk - your hustle is being wasted if you're not building long-term wealth. Let's at least have a conversation about it.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'D2D Rep - Smooth Transition Closer', content: `Your D2D experience means you're already ahead of most people we train. Let's hop on a call and I'll show you exactly how this works. When are you free?`, message_stage: 'closer' },
    { name: 'D2D Rep - Compare Closer', content: `Let's get on a call and I'll show you the income potential side by side. If D2D is still your move, cool. But you should at least know your options. When works?`, message_stage: 'closer' },
    { name: 'D2D Rep - Easy Closer', content: `15 minute call, no pressure, just information. Worst case you learn something. Best case you find your next chapter. You down?`, message_stage: 'closer' },
    { name: 'D2D Rep - Skill Transfer Closer', content: `Everything you learned knocking doors applies here, but with way better margins. Let's talk about making that transition. What's your availability?`, message_stage: 'closer' },
    { name: 'D2D Rep - Future Closer', content: `Picture this - same income, no more weather stress, and residuals building over time. Let's hop on a call and make it real. When works for you?`, message_stage: 'closer' },
    { name: 'D2D Rep - Ready Closer', content: `You've put in the hard work in D2D. Now let's talk about working smarter. Drop me some times and let's connect.`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // ATHLETE - Former/current athletes with competitive drive
  // ==========================================================================
  athlete: [
    // Openers (7)
    { name: 'Athlete - Competitive Opener', content: `Hey! I can tell you've got that competitive edge. Quick question - are you channeling that into building wealth, or still figuring out the next play?`, message_stage: 'opener' },
    { name: 'Athlete - Post-Sport Opener', content: `What's up! A lot of athletes I know are looking for something that gives them that same drive after sports. Ever thought about building a business?`, message_stage: 'opener' },
    { name: 'Athlete - Traits Opener', content: `Hey! The discipline and work ethic from athletics translates crazy well into sales. We've got former athletes at The Standard absolutely crushing it. Curious?`, message_stage: 'opener' },
    { name: 'Athlete - Direct Opener', content: `Real talk - athletes make some of the best entrepreneurs. Same mindset, different game. Interested in hearing what we're doing at The Standard?`, message_stage: 'opener' },
    { name: 'Athlete - Team Opener', content: `Hey! Miss the team environment from sports? We've built something at The Standard that has that same energy. Would love to tell you about it.`, message_stage: 'opener' },
    { name: 'Athlete - Competition Opener', content: `What's good! Looking for something competitive but with better financial upside than a 9-5? That's literally what we do at The Standard.`, message_stage: 'opener' },
    { name: 'Athlete - Legacy Opener', content: `Hey! Sports career has a shelf life, but what you build in business lasts forever. Ever thought about creating something bigger?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Athlete - Check In Follow Up', content: `Hey! Hope you're staying active and crushing it. Still curious if you've thought about channeling that athlete energy into business?`, message_stage: 'follow_up' },
    { name: 'Athlete - Success Follow Up', content: `Quick update - had a former D1 athlete join us and they just hit their first $10K month in 90 days. Your background could do the same.`, message_stage: 'follow_up' },
    { name: 'Athlete - Mindset Follow Up', content: `Just circling back - the athlete mindset is honestly our secret weapon at The Standard. Still interested in learning more?`, message_stage: 'follow_up' },
    { name: 'Athlete - Soft Follow Up', content: `Hey! No pressure at all, but wanted to see if you'd be down to chat about what we're building. Could be a good fit for your competitive side.`, message_stage: 'follow_up' },
    { name: 'Athlete - Team Follow Up', content: `Yo! We just brought on another former athlete and the culture here is unreal. Made me think of our convo. Still interested?`, message_stage: 'follow_up' },
    { name: 'Athlete - Drive Follow Up', content: `Hey! That drive you developed in sports - are you putting it to work somewhere? Or looking for the right opportunity?`, message_stage: 'follow_up' },
    { name: 'Athlete - Direct Follow Up', content: `Real talk - athletes who don't channel their competitive energy into something productive usually regret it. Let's at least talk about options.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Athlete - Game Day Closer', content: `Think of this as game day energy but for your financial future. Let's hop on a call and I'll show you the playbook. When are you free?`, message_stage: 'closer' },
    { name: 'Athlete - Champion Closer', content: `You've already proven you can compete at a high level. Now let's talk about winning financially. What's your schedule look like?`, message_stage: 'closer' },
    { name: 'Athlete - Recruit Closer', content: `We're specifically recruiting athletes because you already have what most people can't teach. Let's connect this week - what day works?`, message_stage: 'closer' },
    { name: 'Athlete - Team Closer', content: `Picture a team environment with the same intensity as sports, but building real wealth. Let's talk about joining the squad. When works?`, message_stage: 'closer' },
    { name: 'Athlete - Next Chapter Closer', content: `Your athletic career built the foundation. This could be your next chapter. Let's hop on a call and map it out. Drop me some times.`, message_stage: 'closer' },
    { name: 'Athlete - Compete Closer', content: `Ready to compete again? This time for generational wealth. Let's talk. Send me your availability and let's make it happen.`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // CAR SALESMAN - Automotive sales experience
  // ==========================================================================
  car_salesman: [
    // Openers (7)
    { name: 'Car Sales - Industry Opener', content: `Hey! Car sales is a grind - respect the hustle. Quick question though, are you building equity or just making the dealer rich?`, message_stage: 'opener' },
    { name: 'Car Sales - Upgrade Opener', content: `What's up! Your closing skills from the lot would crush in insurance. Same game, but you actually build something for yourself. Ever thought about it?`, message_stage: 'opener' },
    { name: 'Car Sales - Hours Opener', content: `Hey! I know the car lot hours are brutal. What if you could make the same (or more) without living at the dealership?`, message_stage: 'opener' },
    { name: 'Car Sales - Control Opener', content: `Real talk - you ever feel like the dealership controls your whole life? There's a way to use those same skills but actually own your business.`, message_stage: 'opener' },
    { name: 'Car Sales - Residual Opener', content: `What's good! Here's what car sales doesn't give you - residual income. In insurance, you close once and get paid for years. Interested?`, message_stage: 'opener' },
    { name: 'Car Sales - Skills Opener', content: `Hey! Anyone who can handle the car lot can sell anything. We've got former car guys at The Standard making serious money. Want to hear more?`, message_stage: 'opener' },
    { name: 'Car Sales - Direct Opener', content: `Hey! I recruit car salespeople specifically because y'all can actually close. Interested in what we're building at The Standard?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Car Sales - Month End Follow Up', content: `Hey! How was the month on the lot? Just checking in - still curious if you'd want to explore something different.`, message_stage: 'follow_up' },
    { name: 'Car Sales - Success Follow Up', content: `Quick update - had a car sales guy join us and he just hit his first $15K month. Your skills could absolutely do the same. Still interested?`, message_stage: 'follow_up' },
    { name: 'Car Sales - Check In Follow Up', content: `Hey! No pressure, just wanted to see if you've thought any more about what we discussed. Happy to answer any questions.`, message_stage: 'follow_up' },
    { name: 'Car Sales - Freedom Follow Up', content: `Just circling back - how are the hours treating you? The offer to chat about more freedom is still on the table.`, message_stage: 'follow_up' },
    { name: 'Car Sales - Training Follow Up', content: `Yo! Forgot to mention - we have a full program for transitioning sales pros into insurance. You wouldn't skip a beat.`, message_stage: 'follow_up' },
    { name: 'Car Sales - Soft Follow Up', content: `Hey! Just wanted to touch base - whenever you're ready to explore options, I'm here. No rush.`, message_stage: 'follow_up' },
    { name: 'Car Sales - Direct Follow Up', content: `Real talk - your sales talent is being undervalued at a dealership. Let's at least have a conversation about better options.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Car Sales - Easy Transition Closer', content: `Your car sales experience means you're already miles ahead in training. Let's hop on a call and I'll show you exactly how this works. When are you free?`, message_stage: 'closer' },
    { name: 'Car Sales - Compare Closer', content: `Let's get on a call and I'll break down the numbers vs car sales. If the lot is still better, cool. But you should know your options. When works?`, message_stage: 'closer' },
    { name: 'Car Sales - Freedom Closer', content: `Imagine making more money with way more freedom. That's what we're offering at The Standard. Let's talk - what's your availability?`, message_stage: 'closer' },
    { name: 'Car Sales - No Risk Closer', content: `15 minute call, no pressure. Worst case you learn about a backup plan. Best case you find something way better. You in?`, message_stage: 'closer' },
    { name: 'Car Sales - Own It Closer', content: `Stop making the dealer rich and start building your own thing. Let's hop on a call and map it out. Drop me some times that work.`, message_stage: 'closer' },
    { name: 'Car Sales - Ready Closer', content: `You've got the sales skills already. Now let's talk about using them to build real wealth. When can we connect?`, message_stage: 'closer' },
  ],

  // ==========================================================================
  // GENERAL COLD - Cold outreach to anyone
  // ==========================================================================
  general_cold: [
    // Openers (7)
    { name: 'Cold - Curiosity Opener', content: `Hey! Random but genuine question - are you happy with where you're at, or are you low-key looking for something more?`, message_stage: 'opener' },
    { name: 'Cold - Direct Opener', content: `What's up! I'm with The Standard and I'm looking for ambitious people who want to build something real. Does that sound like you?`, message_stage: 'opener' },
    { name: 'Cold - Opportunity Opener', content: `Hey! I know this is random, but I help people build businesses in insurance and you seem like you might have that entrepreneurial energy. Am I off base?`, message_stage: 'opener' },
    { name: 'Cold - Casual Opener', content: `Hey! Quick question - if there was an opportunity to build something that could change your financial future, would you at least want to hear about it?`, message_stage: 'opener' },
    { name: 'Cold - Problem Opener', content: `What's good! Most people I talk to are either bored at their job or stressed about money. Which camp are you in? Or neither?`, message_stage: 'opener' },
    { name: 'Cold - Income Opener', content: `Hey! Genuine question - do you have a way to make money outside your 9-5? If not, I might have something interesting for you.`, message_stage: 'opener' },
    { name: 'Cold - Build Opener', content: `Hey! I'm building something at The Standard and looking for people who actually want to grow. Your profile caught my eye - am I wrong about you?`, message_stage: 'opener' },

    // Follow-ups (7)
    { name: 'Cold - Soft Follow Up', content: `Hey! Just circling back - no pressure at all, but did you get a chance to think about what I mentioned? Happy to chat if you're curious.`, message_stage: 'follow_up' },
    { name: 'Cold - Value Follow Up', content: `Quick thought - what if you could make an extra $5-10K a month on the side? That's what we help people do at The Standard. Still interested?`, message_stage: 'follow_up' },
    { name: 'Cold - Check In Follow Up', content: `Hey! Hope you're having a good week. Just wanted to see if you'd be open to a quick chat about what we're building. No commitment.`, message_stage: 'follow_up' },
    { name: 'Cold - Success Follow Up', content: `Real quick - just had someone join us last month and they already made $3K on the side. Made me think of our convo. Worth exploring?`, message_stage: 'follow_up' },
    { name: 'Cold - Casual Follow Up', content: `Hey! No worries if you're slammed, but wanted to see if you're still curious about The Standard. The offer to chat is always open.`, message_stage: 'follow_up' },
    { name: 'Cold - Direct Follow Up', content: `Just being real - I think you'd be great at what we do. But I can only share more if you're interested. Are you?`, message_stage: 'follow_up' },
    { name: 'Cold - Timing Follow Up', content: `Hey! I know timing is everything. Whenever you're ready to hear about something that could change things, I'm here. No pressure.`, message_stage: 'follow_up' },

    // Closers (6)
    { name: 'Cold - Easy Close Closer', content: `Look, 15 minute call, no pitch, just information. If it's not for you, no hard feelings. But what if it is? When are you free?`, message_stage: 'closer' },
    { name: 'Cold - Opportunity Closer', content: `The Standard isn't for everyone, but for the right people it's life changing. Let's hop on a call and see if you're one of them. What day works?`, message_stage: 'closer' },
    { name: 'Cold - No Risk Closer', content: `Worst case you spend 15 mins learning about something new. Best case you find your next chapter. Worth it? Drop me some times.`, message_stage: 'closer' },
    { name: 'Cold - Direct Closer', content: `I'll be straight with you - I think you'd crush it with us. But the only way to know is to talk. When can we connect?`, message_stage: 'closer' },
    { name: 'Cold - Confident Closer', content: `I wouldn't be reaching out if I didn't think this could work for you. Let's get on a quick call and I'll show you why. What's your availability?`, message_stage: 'closer' },
    { name: 'Cold - Action Closer', content: `At some point you gotta take a shot on yourself. This could be that moment. Let's talk - send me 2-3 times that work for you.`, message_stage: 'closer' },
  ],
};

async function seedTemplates() {
  console.log('Starting to seed Instagram templates...\n');

  let totalCreated = 0;
  const errors = [];

  for (const [category, categoryTemplates] of Object.entries(templates)) {
    console.log(`\nProcessing category: ${category} (${categoryTemplates.length} templates)`);

    for (const template of categoryTemplates) {
      const { data, error } = await supabase
        .from('instagram_message_templates')
        .insert({
          user_id: USER_ID,
          imo_id: IMO_ID,
          name: template.name,
          content: template.content,
          category: category,
          message_stage: template.message_stage,
          is_active: true,
          use_count: 0,
          created_by: USER_ID,
        })
        .select('id, name')
        .single();

      if (error) {
        console.error(`  ❌ Failed: ${template.name} - ${error.message}`);
        errors.push({ name: template.name, error: error.message });
      } else {
        console.log(`  ✓ Created: ${template.name}`);
        totalCreated++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully created ${totalCreated} templates`);
  if (errors.length > 0) {
    console.log(`❌ Failed to create ${errors.length} templates`);
    errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
  }
  console.log('='.repeat(60));
}

seedTemplates().catch(console.error);
