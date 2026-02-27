import api from "./api";

export interface ContactFormPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
  agreement: boolean;
}

const contactService = {
  sendContactMessage(payload: ContactFormPayload): Promise<void> {
    return api.post("/contact", payload).then(() => undefined);
  },
};

export { contactService };
