import { useState } from "react";
import { sampleLeads, type Lead, type LeadStatus, type Message } from "@/data/sampleData";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);

  const addLead = (leadData: Omit<Lead, "id" | "messages" | "createdAt" | "lastContact">) => {
    const today = new Date().toISOString().split("T")[0];
    const newLead: Lead = {
      ...leadData,
      id: crypto.randomUUID(),
      messages: [],
      createdAt: today,
      lastContact: today,
    };
    setLeads((prev) => [newLead, ...prev]);
    return newLead;
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
    );
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
  };

  const changeStatus = (id: string, status: LeadStatus) => {
    updateLead(id, { status });
  };

  const addMessage = (leadId: string, text: string, channel: Message["channel"]) => {
    const now = new Date();
    const timestamp = `${now.toISOString().split("T")[0]} ${now.toTimeString().slice(0, 5)}`;
    const newMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: "clinic",
      timestamp,
      channel,
    };
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, messages: [...lead.messages, newMessage], lastContact: now.toISOString().split("T")[0] }
          : lead
      )
    );
  };

  return { leads, addLead, updateLead, deleteLead, changeStatus, addMessage };
}
