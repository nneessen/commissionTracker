// src/features/chat-bot/data/conversation-scripts.ts
// Hardcoded conversation scripts for the demo component

export interface DemoMessage {
  sender: "lead" | "bot";
  text: string;
  /** Delay in ms before this message appears (simulates typing) */
  delay: number;
}

export interface ConversationScript {
  id: string;
  title: string;
  description: string;
  messages: DemoMessage[];
}

export const conversationScripts: ConversationScript[] = [
  {
    id: "intro-booking",
    title: "Appointment Booking",
    description: "New lead to booked appointment in under 2 minutes",
    messages: [
      {
        sender: "lead",
        text: "Hi I got a missed call from this number",
        delay: 0,
      },
      {
        sender: "bot",
        text: "Hey! Yeah we reached out about the mortgage protection you inquired about. Is this still Sarah?",
        delay: 1800,
      },
      {
        sender: "lead",
        text: "Yes this is Sarah",
        delay: 2200,
      },
      {
        sender: "bot",
        text: "Great Sarah! I just wanted to follow up and get you some info on your options. Would you have a few minutes for a quick call today or tomorrow?",
        delay: 2000,
      },
      {
        sender: "lead",
        text: "Tomorrow works better for me",
        delay: 2500,
      },
      {
        sender: "bot",
        text: "Perfect. I have a 10:00am or 2:30pm open tomorrow. Which works better for you?",
        delay: 1600,
      },
      {
        sender: "lead",
        text: "2:30 works",
        delay: 1400,
      },
      {
        sender: "bot",
        text: "You're all set for tomorrow at 2:30pm. You'll get a calendar invite shortly. Talk to you then Sarah!",
        delay: 1800,
      },
    ],
  },
  {
    id: "objection-handling",
    title: "Objection Handling",
    description: "Redirects pricing questions to the appointment",
    messages: [
      {
        sender: "lead",
        text: "How much does it cost",
        delay: 0,
      },
      {
        sender: "bot",
        text: "Good question! The rate actually depends on a few things like your age and coverage amount, so it varies for everyone. That's exactly what we go over on the call. Would you have time for a quick 10 minute chat today?",
        delay: 2200,
      },
      {
        sender: "lead",
        text: "Can you just give me a ballpark",
        delay: 2800,
      },
      {
        sender: "bot",
        text: "I wish I could but I'd hate to give you a number that's way off. The good news is the call is super quick and there's zero obligation. I have a 3:00pm or 5:00pm open today if either works?",
        delay: 2400,
      },
      {
        sender: "lead",
        text: "Fine 5 works",
        delay: 1600,
      },
      {
        sender: "bot",
        text: "Awesome, you're locked in for 5:00pm today. You'll get a calendar invite in just a sec. Talk soon!",
        delay: 1800,
      },
    ],
  },
  {
    id: "follow-up",
    title: "Follow-Up",
    description: "Re-engages a lead who went cold",
    messages: [
      {
        sender: "bot",
        text: "Hey Mike, just checking back in. Still interested in getting those mortgage protection details? Happy to find a time that works for you.",
        delay: 0,
      },
      {
        sender: "lead",
        text: "Sorry been busy. Yeah I still need to do that",
        delay: 3000,
      },
      {
        sender: "bot",
        text: "No worries at all, I know how it goes! I have a couple spots open tomorrow morning if you want to knock it out. 9:00am or 11:00am work?",
        delay: 2000,
      },
      {
        sender: "lead",
        text: "11 works",
        delay: 1400,
      },
      {
        sender: "bot",
        text: "Done! 11:00am tomorrow. Calendar invite coming your way. Looking forward to it Mike.",
        delay: 1600,
      },
    ],
  },
  {
    id: "veteran",
    title: "Veteran Lead",
    description: "Adapts messaging for veteran life insurance leads",
    messages: [
      {
        sender: "lead",
        text: "Someone called me about veteran benefits?",
        delay: 0,
      },
      {
        sender: "bot",
        text: "Hey! Yes we reached out about the veteran life insurance options available to you. Thank you for your service by the way. Are you still looking into that?",
        delay: 2000,
      },
      {
        sender: "lead",
        text: "Yeah I'm interested. What kind of coverage are we talking",
        delay: 2600,
      },
      {
        sender: "bot",
        text: "There are a few different options depending on your situation. We walk through everything on a quick call so I can make sure you're seeing the plans that actually make sense for you. Got a few minutes today or tomorrow?",
        delay: 2400,
      },
      {
        sender: "lead",
        text: "Today after 4 would be best",
        delay: 1800,
      },
      {
        sender: "bot",
        text: "I've got 4:30pm open today. That work for you?",
        delay: 1400,
      },
      {
        sender: "lead",
        text: "Yep",
        delay: 1000,
      },
      {
        sender: "bot",
        text: "You're all set for 4:30pm today. Calendar invite headed your way. Talk to you soon!",
        delay: 1600,
      },
    ],
  },
];
