export type LeadStatus = "new" | "hot" | "closed" | "lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  service: string;
  source: string;
  createdAt: string;
  lastContact: string;
  nextFollowUp: string | null;
  notes: string;
  messages: Message[];
  value: number;
}

export interface Message {
  id: string;
  text: string;
  sender: "clinic" | "client";
  timestamp: string;
  channel: "whatsapp" | "sms" | "email";
}

export interface KPIData {
  totalLeads: number;
  hotLeads: number;
  closedDeals: number;
  lostLeads: number;
  conversionRate: number;
  returnRate: number;
  revenue: number;
  avgResponseTime: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  delayDays: number;
  message: string;
  active: boolean;
  targetStatus: LeadStatus;
}

export const sampleLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Cohen",
    phone: "+972-50-123-4567",
    email: "sarah.c@email.com",
    status: "hot",
    service: "Dental Cleaning",
    source: "WhatsApp",
    createdAt: "2025-02-15",
    lastContact: "2025-02-19",
    nextFollowUp: "2025-02-22",
    notes: "Interested in teeth whitening package",
    value: 1200,
    messages: [
      { id: "m1", text: "Hi, I'd like to book a dental cleaning appointment", sender: "client", timestamp: "2025-02-15 10:30", channel: "whatsapp" },
      { id: "m2", text: "Hello Sarah! We'd love to help. We have openings this week. Would you also be interested in our whitening package?", sender: "clinic", timestamp: "2025-02-15 10:35", channel: "whatsapp" },
      { id: "m3", text: "Yes! How much is the whitening package?", sender: "client", timestamp: "2025-02-15 10:40", channel: "whatsapp" },
      { id: "m4", text: "Our premium whitening package is ₪1,200 and includes 3 sessions. Would you like to schedule a consultation?", sender: "clinic", timestamp: "2025-02-15 10:45", channel: "whatsapp" },
    ],
  },
  {
    id: "2",
    name: "David Levi",
    phone: "+972-52-234-5678",
    email: "david.l@email.com",
    status: "new",
    service: "Orthodontics",
    source: "Website",
    createdAt: "2025-02-18",
    lastContact: "2025-02-18",
    nextFollowUp: "2025-02-20",
    notes: "Submitted inquiry form for braces",
    value: 8000,
    messages: [
      { id: "m5", text: "I'm interested in getting braces for my teenager", sender: "client", timestamp: "2025-02-18 14:00", channel: "email" },
    ],
  },
  {
    id: "3",
    name: "Maya Rosenberg",
    phone: "+972-54-345-6789",
    email: "maya.r@email.com",
    status: "closed",
    service: "Root Canal",
    source: "Referral",
    createdAt: "2025-02-01",
    lastContact: "2025-02-16",
    nextFollowUp: null,
    notes: "Treatment completed. Follow-up in 3 months.",
    value: 3500,
    messages: [
      { id: "m6", text: "Dr. Amit referred me for a root canal consultation", sender: "client", timestamp: "2025-02-01 09:00", channel: "whatsapp" },
      { id: "m7", text: "Welcome Maya! Dr. Amit is wonderful. Let's schedule your consultation. How's Tuesday at 2pm?", sender: "clinic", timestamp: "2025-02-01 09:15", channel: "whatsapp" },
      { id: "m8", text: "Perfect, see you then!", sender: "client", timestamp: "2025-02-01 09:20", channel: "whatsapp" },
      { id: "m9", text: "Thank you for coming in today. Your treatment is scheduled for next week.", sender: "clinic", timestamp: "2025-02-04 15:00", channel: "whatsapp" },
      { id: "m10", text: "Treatment completed! Please don't hesitate to reach out if you have any questions.", sender: "clinic", timestamp: "2025-02-16 11:00", channel: "whatsapp" },
    ],
  },
  {
    id: "4",
    name: "Oren Shapira",
    phone: "+972-53-456-7890",
    email: "oren.s@email.com",
    status: "lost",
    service: "Implants",
    source: "Google Ads",
    createdAt: "2025-01-20",
    lastContact: "2025-02-10",
    nextFollowUp: null,
    notes: "Went with another clinic due to pricing",
    value: 15000,
    messages: [
      { id: "m11", text: "How much do dental implants cost?", sender: "client", timestamp: "2025-01-20 16:00", channel: "whatsapp" },
      { id: "m12", text: "Hi Oren! Implant costs vary from ₪5,000-15,000 depending on the case. Would you like a free consultation?", sender: "clinic", timestamp: "2025-01-20 16:30", channel: "whatsapp" },
      { id: "m13", text: "I'll think about it", sender: "client", timestamp: "2025-01-20 17:00", channel: "whatsapp" },
    ],
  },
  {
    id: "5",
    name: "Noa Friedman",
    phone: "+972-58-567-8901",
    email: "noa.f@email.com",
    status: "hot",
    service: "Cosmetic Dentistry",
    source: "Instagram",
    createdAt: "2025-02-17",
    lastContact: "2025-02-19",
    nextFollowUp: "2025-02-21",
    notes: "Wants veneers consultation, very interested",
    value: 20000,
    messages: [
      { id: "m14", text: "Hi! I saw your veneer results on Instagram. They look amazing!", sender: "client", timestamp: "2025-02-17 20:00", channel: "whatsapp" },
      { id: "m15", text: "Thank you Noa! We'd love to help you achieve your dream smile. Can we schedule a consultation?", sender: "clinic", timestamp: "2025-02-17 20:10", channel: "whatsapp" },
      { id: "m16", text: "Yes please! What dates do you have available?", sender: "client", timestamp: "2025-02-17 20:15", channel: "whatsapp" },
    ],
  },
  {
    id: "6",
    name: "Yael Mizrachi",
    phone: "+972-50-678-9012",
    email: "yael.m@email.com",
    status: "new",
    service: "Check-up",
    source: "WhatsApp",
    createdAt: "2025-02-19",
    lastContact: "2025-02-19",
    nextFollowUp: "2025-02-21",
    notes: "Routine check-up request",
    value: 400,
    messages: [
      { id: "m17", text: "Hi, I need to schedule a routine check-up", sender: "client", timestamp: "2025-02-19 08:00", channel: "whatsapp" },
    ],
  },
];

export const sampleKPIs: KPIData = {
  totalLeads: 48,
  hotLeads: 12,
  closedDeals: 28,
  lostLeads: 8,
  conversionRate: 58,
  returnRate: 85,
  revenue: 142000,
  avgResponseTime: "12 min",
};

export const sampleAutomationRules: AutomationRule[] = [
  {
    id: "a1",
    name: "New Lead Welcome",
    trigger: "Lead created",
    delayDays: 0,
    message: "Hi {name}! Thank you for reaching out to our clinic. We'll get back to you shortly with available appointments.",
    active: true,
    targetStatus: "new",
  },
  {
    id: "a2",
    name: "Follow-up Reminder",
    trigger: "No response",
    delayDays: 2,
    message: "Hi {name}, we noticed you haven't booked yet. Would you like us to help you find a convenient time?",
    active: true,
    targetStatus: "new",
  },
  {
    id: "a3",
    name: "Hot Lead Nurture",
    trigger: "Status changed to Hot",
    delayDays: 1,
    message: "Hi {name}! We have a special offer this week. Book your {service} appointment and get 10% off!",
    active: true,
    targetStatus: "hot",
  },
  {
    id: "a4",
    name: "Win-back Campaign",
    trigger: "No contact for 14 days",
    delayDays: 14,
    message: "Hi {name}, we miss you! It's been a while since your last visit. Book now and receive a complimentary cleaning.",
    active: false,
    targetStatus: "lost",
  },
];
