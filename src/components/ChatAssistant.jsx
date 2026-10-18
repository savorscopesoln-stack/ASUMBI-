import React, { useEffect, useRef, useState } from "react";
import { SITE, waLink } from "../config/site";

/* =========================================================
   CHAT ASSISTANT (landing page)
   A lightweight, rule-based assistant for visitors. It answers
   common questions from the knowledge base below and always
   offers a hand-off to a human on WhatsApp. It is NOT an AI
   model: it only knows what is written in KB. To make it
   smarter later, replace `answer()` with a call to your backend.
   Reads the landing page's CSS variables, so it must render
   inside the .doravo-landing wrapper.
========================================================= */

const KB = [
  {
    keys: ["what is", "doravo", "about", "platform", "software", "system"],
    answer:
      "Doravo Core is an education management platform by Doravo. It brings student and staff management, assessments and e-exams, attendance, fees, communication and everyday school operations into one platform.",
  },
  {
    keys: ["exam", "assessment", "e-exam", "test", "marking", "marks"],
    answer:
      "You can create, sit and mark assessments online, including timed e-exams on dedicated exam devices. Results are tied back to each student's record.",
  },
  {
    keys: ["fee", "fees", "payment", "invoice", "receipt", "wallet", "billing", "credit"],
    answer:
      "Fees are tracked against your school's own fee structure and terms, with payments and balances in one place. Invoices can be downloaded and receipts are issued once a payment is confirmed.",
  },
  {
    keys: ["attendance", "register"],
    answer:
      "Daily registers are taken by class or subject and roll up into per-student and school-wide attendance records, with no separate spreadsheets.",
  },
  {
    keys: ["gate", "visitor", "meal", "kitchen", "leave", "administration", "operations"],
    answer:
      "School administration covers gate and visitor logs, kitchen and meal cards, and leave-out requests and approvals, all in one workspace.",
  },
  {
    keys: ["teacher", "student", "parent", "portal", "role"],
    answer:
      "Administrators, teachers, students and parents each get a portal built around what they need to do.",
  },
  {
    keys: ["brand", "logo", "campus", "group", "multi"],
    answer:
      "Your logo, colours and report cards appear across your login screen, portals and printed documents. School groups get a dedicated workspace per campus on one platform.",
  },
  {
    keys: ["price", "pricing", "cost", "how much", "quote", "plan", "subscription"],
    answer:
      "Pricing depends on your school and the modules you need. Message us on WhatsApp and we'll send a quote.",
  },
  {
    keys: ["demo", "trial", "try", "book", "contact", "talk", "call", "whatsapp", "email", "reach"],
    answer: `The fastest way to get a demo is WhatsApp on ${SITE.whatsappDisplay}. You can also email ${SITE.email}.`,
  },
  {
    keys: ["login", "sign in", "log in", "account"],
    answer: "Use the Sign In button at the top of the page to log in to your school's portal.",
  },
];

const FALLBACK =
  "I'm not sure about that one. Our team can answer it directly on WhatsApp, just tap the green button below.";

const SUGGESTIONS = [
  "What is Doravo Core?",
  "How do e-exams work?",
  "How do fees work?",
  "Request a demo",
];

const answer = (q) => {
  const t = q.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const item of KB) {
    const score = item.keys.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best ? best.answer : FALLBACK;
};

const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.2-.4.7-1.300.1-.2 0-.3 0-.4l-.8-1.800c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.200 5.200 5.200 0 0 0 1.100 2.800 11.900 11.900 0 0 0 4.600 4c1.700.7 2.400.8 3.200.7a2.700 2.700 0 0 0 1.800-1.300 2.200 2.200 0 0 0 .2-1.300c-.1-.1-.3-.2-.5-.3z" />
  </svg>
);

export { WaIcon };

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([
    { from: "bot", text: `Hi! I'm the ${SITE.name} assistant. Ask me a question or pick a suggestion.` },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, open]);

  const send = (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", text: answer(q) }]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="dv-chat" role="dialog" aria-label={`${SITE.name} assistant`}>
          <div className="dv-chat-head">
            <strong>{SITE.name} Assistant</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="dv-chat-body" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`dv-msg ${m.from}`}>{m.text}</div>
            ))}
            {msgs.length === 1 && (
              <div className="dv-chips">
                {SUGGESTIONS.map((s) => (
                  <button type="button" key={s} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <a className="dv-chat-wa" href={waLink()} target="_blank" rel="noopener noreferrer">
            <WaIcon /> Chat with a human on WhatsApp
          </a>
          <form
            className="dv-chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Your question"
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="dv-chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        {open ? (
          "×"
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 5h16v11H9l-5 4z" />
          </svg>
        )}
      </button>
    </>
  );
}
