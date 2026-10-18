// Central contact + brand details for the public landing page.
// The landing page, chat assistant and every WhatsApp link read from here.
export const SITE = {
  name: "Doravo Core",
  company: "Doravo",
  url: "https://www.doravocore.co.ke",
  // WhatsApp number in international format, digits only (0708903949 -> 254708903949)
  whatsapp: "254708903949",
  whatsappDisplay: "+254 708 903 949",
  email: "info@doravocore.co.ke",
  demoMessage: "Hello Doravo! I'd like to request a demo of Doravo Core for my school.",
};

export const waLink = (text = SITE.demoMessage) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
