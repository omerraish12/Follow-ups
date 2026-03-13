import { useEffect } from "react";

const defaultMessage = "You have unsaved changes. Are you sure you want to leave?";

/**
 * Warn on tab/refresh when there are unsaved changes.
 * (React Router's `useBlocker` requires a data router; we keep this minimal to avoid runtime errors.)
 */
export const useUnsavedChanges = (when: boolean, message: string = defaultMessage) => {
  useEffect(() => {
    if (!when) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when, message]);
};

export default useUnsavedChanges;
