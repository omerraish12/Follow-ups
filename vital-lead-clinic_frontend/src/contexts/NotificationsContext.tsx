import { createContext, useContext } from "react";
import type { NotificationsState } from "@/types/notifications";

export const NotificationsContext = createContext<NotificationsState | null>(null);

export const useNotificationsContext = (): NotificationsState => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsContext must be used within NotificationsContext");
  }
  return context;
};
