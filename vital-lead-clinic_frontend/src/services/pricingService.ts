import api from "./api";

export interface PricingPlan {
  id: string;
  name: string; // translation key
  price: number;
  currency: string;
  contactsLimit: number | null;
  usersLimit: number | null;
  badge: string | null;
  highlight: boolean;
  features: string[]; // translation keys
  cta: string; // translation key
}

export const pricingService = {
  getPlans: async (): Promise<PricingPlan[]> => {
    const response = await api.get("/pricing");
    return response.data;
  },
};
