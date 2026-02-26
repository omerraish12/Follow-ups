const plans = [
  {
    id: 'starter',
    name: 'plan_starter',
    price: 0,
    currency: 'USD',
    contactsLimit: 150,
    usersLimit: 1,
    badge: null,
    highlight: false,
    features: [
      'plan_basic_automations',
      'plan_email_support',
      'plan_landing_form'
    ],
    cta: 'start_trial'
  },
  {
    id: 'growth',
    name: 'plan_growth',
    price: 49,
    currency: 'USD',
    contactsLimit: 2000,
    usersLimit: 5,
    badge: 'most_popular',
    highlight: true,
    features: [
      'plan_whatsapp_automation',
      'plan_lead_scoring',
      'plan_two_way_sms',
      'plan_custom_landing',
      'plan_team_roles',
      'plan_priority_support'
    ],
    cta: 'start_trial'
  },
  {
    id: 'scale',
    name: 'plan_scale',
    price: 129,
    currency: 'USD',
    contactsLimit: null,
    usersLimit: 20,
    badge: null,
    highlight: false,
    features: [
      'plan_advanced_branching',
      'plan_api_webhooks',
      'plan_success_manager',
      'plan_custom_reports',
      'plan_sla_support'
    ],
    cta: 'talk_to_sales'
  }
];

const getPlans = async (_req, res) => {
  res.json(plans);
};

module.exports = { getPlans };
