import api from "./api";

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  iban: string;
  swift?: string;
  reference?: string;
  instructions?: string;
}

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
  paymentMethod?: "bank_transfer";
  bankTransferDetails?: BankTransferDetails;
}

export const pricingService = {
  getPlans: async (): Promise<PricingPlan[]> => {
    const response = await api.get("/pricing");
    return response.data;
  },
};
