export type ServiceOption = {
  value: string;
  labelKey: string;
};

export const SERVICE_OPTIONS: ServiceOption[] = [
  { value: "Dental Cleaning", labelKey: "service_option_dental_cleaning" },
  { value: "Orthodontics", labelKey: "service_option_orthodontics" },
  { value: "Root Canal", labelKey: "service_option_root_canal" },
  { value: "Implants", labelKey: "service_option_implants" },
  { value: "Cosmetic Dentistry", labelKey: "service_option_cosmetic_dentistry" },
  { value: "Check-up", labelKey: "service_option_checkup" },
];

const normalizeValue = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const buildLookup = () => {
  const lookup: Record<string, string> = {};
  SERVICE_OPTIONS.forEach(({ value, labelKey }) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    lookup[trimmed] = labelKey;
    lookup[normalizeValue(trimmed)] = labelKey;
  });
  return lookup;
};

const SERVICE_TRANSLATION_LOOKUP = buildLookup();

export const getServiceTranslationKey = (service?: string) => {
  if (!service) {
    return undefined;
  }
  const trimmed = service.trim();
  if (!trimmed) {
    return undefined;
  }
  return (
    SERVICE_TRANSLATION_LOOKUP[trimmed] ??
    SERVICE_TRANSLATION_LOOKUP[normalizeValue(trimmed)]
  );
};

export const getTranslatedServiceLabel = (
  service: string | undefined,
  t: (key: string) => string,
  fallback?: string
) => {
  if (!service) {
    return fallback ?? "";
  }
  const translationKey = getServiceTranslationKey(service);
  return translationKey ? t(translationKey) : service;
};
