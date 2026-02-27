import type { TFunction } from "i18next";

const AUTOMATION_NAME_TRANSLATIONS: Record<string, string> = {
  "3-Day Follow-up": "automation_name_3_day_follow_up",
  "7-Day Reminder": "automation_name_7_day_reminder",
  "14-Day Win-back": "automation_name_14_day_win_back",
  "Post-Treatment Check-in": "automation_name_post_treatment_check_in",
  "No-Reply Nudge": "automation_name_no_reply_nudge",
};

export function translateAutomationName(name: string | undefined, t: TFunction): string {
  if (!name) return "";
  const key = AUTOMATION_NAME_TRANSLATIONS[name];
  return key ? t(key) : name;
}
