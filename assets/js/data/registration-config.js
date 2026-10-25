export const learningRegistrationConfig = Object.freeze({
  contact: Object.freeze({
    platform: "Zalo",
    number: "0943943151",
    displayNumber: "0943 943 151",
    url: "https://zalo.me/0943943151"
  }),
  registration: Object.freeze({
    provider: "formspree",
    endpoint: ""
  }),
  offlineServiceArea: "Hà Nội",
  supportedLearningFormats: Object.freeze(["online", "offline"])
});

export const registrationConfig = learningRegistrationConfig.registration;

export function isRegistrationConfigured(config = registrationConfig) {
  if (config?.provider !== "formspree" || typeof config.endpoint !== "string") return false;
  try {
    const endpoint = new URL(config.endpoint);
    return endpoint.protocol === "https:" && endpoint.hostname === "formspree.io" && /^\/f\/[a-z0-9]+$/i.test(endpoint.pathname);
  } catch {
    return false;
  }
}
