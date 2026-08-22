import React, { useEffect, useRef, useState } from "react";
import API from "../../api";
import {
  CreditCard, UtensilsCrossed, CalendarDays, ShieldAlert,
  Printer, Loader2, CheckCircle2, Circle,
} from "lucide-react";

/* ─── shared design-token stylesheet — identical id/tokens to the
   rest of the app; a no-op if already mounted by the layout or
   another page. ─── */
const injectStyles = () => {
  if (document.getElementById("dash-tokens")) return;
  const el = document.createElement("style");
  el.id = "dash-tokens";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --card-elevated: #FFFFFF;
      --border: #E2E5EA;
      --text: #0B0F19;
      --text-secondary: #384152;
      --text-muted: #64748B;
      --primary: #8B1E2D;
      --primary-dark: #6F1725;
      --primary-tint: #FBEAEC;
      --success: #15803D;
      --success-tint: #ECFDF3;
      --warning: #B45309;
      --warning-tint: #FFFBEB;
      --destructive: #DC2626;
      --destructive-tint: #FEF2F2;
      --info: #1D4ED8;
      --info-tint: #EFF6FF;
      --shadow-sm: 0 1px 2px rgba(16,24,40,0.04);
      --shadow: 0 1px 3px rgba(16,24,40,0.06);
      --radius: 14px;
      --radius-sm: 10px;
    }
    [data-theme='dark'] {
      --bg: #0F1115;
      --card: #171A21;
      --card-elevated: #1D2129;
      --border: #323844;
      --text: #FFFFFF;
      --text-secondary: #C7CCD6;
      --text-muted: #9198A6;
      --primary: #E8A0A8;
      --primary-dark: #F3C0C6;
      --primary-tint: rgba(139,30,45,0.28);
      --success: #4ADE80;
      --success-tint: rgba(22,163,74,0.18);
      --warning: #FBBF24;
      --warning-tint: rgba(217,119,6,0.18);
      --destructive: #FB7185;
      --destructive-tint: rgba(220,38,38,0.18);
      --info: #7DA6FF;
      --info-tint: rgba(37,99,235,0.18);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    body { background: var(--bg); transition: background-color .2s ease; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .dash-spin { animation: spin 0.8s linear infinite; }
    @keyframes cardEntrance {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    button:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .meal-day-card { transition: border-color .15s ease; }
    .meal-print-btn:hover:not(:disabled) { filter: brightness(0.95); }

    @media (max-width: 900px) {
      .dash-main { padding: 20px 16px 48px !important; }
      .meal-schedule-grid { grid-template-columns: repeat(4, 1fr) !important; }
    }
    @media (max-width: 560px) {
      .meal-schedule-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .meal-codes-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }

    @media print {
      body { background: #ffffff !important; color: #000000 !important; }
      body * { visibility: hidden; }
      #meal-card, #meal-card * { visibility: visible; }
      #meal-card {
        position: absolute; top: 0; left: 0; width: 100%;
        border: 1px solid #111 !important;
        background: #fff !important;
        color: #000 !important;
        box-shadow: none !important;
      }
      .hide-on-print { display: none !important; }
    }
  `;
  document.head.appendChild(el);
};

const STATUS_STYLES = {
  active: { label: "ACTIVE", tone: "success" },
  suspended: { label: "SUSPENDED", tone: "warning" },
};
const toneVars = {
  success: { color: "var(--success)", bg: "var(--success-tint)" },
  warning: { color: "var(--warning)", bg: "var(--warning-tint)" },
  destructive: { color: "var(--destructive)", bg: "var(--destructive-tint)" },
};

export default function StudentMealCard() {
  injectStyles();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyCodes, setDailyCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(true);

  // Track whether we've completed the first load of each resource, so
  // the 5s background refresh can update state silently instead of
  // flipping loading back to true and flashing the whole card back to
  // a spinner every poll.
  const hasLoadedCard = useRef(false);
  const hasLoadedCodes = useRef(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;

  useEffect(() => {
    if (!userId) return;
    load();
    loadDailyCodes();

    const interval = setInterval(() => { load(); loadDailyCodes(); }, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const load = async () => {
    try {
      if (!hasLoadedCard.current) setLoading(true);
      const res = await API.get(`/meals/my/${userId}`);
      setCard(res.data || null);
    } catch (err) {
      console.log(err.response?.data || err.message);
      if (!hasLoadedCard.current) setCard(null);
    } finally {
      setLoading(false);
      hasLoadedCard.current = true;
    }
  };

  const loadDailyCodes = async () => {
    try {
      if (!hasLoadedCodes.current) setCodesLoading(true);
      const res = await API.get(`/meals/my/${userId}/daily-codes`);
      setDailyCodes(res.data?.codes || []);
    } catch (err) {
      // No active card yet, or none issued — just show nothing rather
      // than an error; the card-missing state below already covers
      // the "no meal card" case with its own message.
      if (!hasLoadedCodes.current) setDailyCodes([]);
    } finally {
      setCodesLoading(false);
      hasLoadedCodes.current = true;
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <main className="dash-main" style={S.main}>
        <div style={S.loadingState}>
          <Loader2 size={18} className="dash-spin" />
          Loading your meal card…
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="dash-main" style={S.main}>
        <header style={S.pageHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UtensilsCrossed size={20} color="var(--primary)" />
            <div>
              <h1 style={S.pageTitle}>Meal Card</h1>
              <p style={S.pageSub}>Your digital dining credential</p>
            </div>
          </div>
        </header>
        <section style={S.panel}>
          <div style={S.emptyState}>
            <UtensilsCrossed size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            No active meal card has been assigned to your account yet.
          </div>
        </section>
      </main>
    );
  }

  const isActive = card.status === "active";
  const statusMeta = STATUS_STYLES[card.status] || { label: "RESTRICTED", tone: "destructive" };
  const statusTone = toneVars[statusMeta.tone];

  /* ================= EXPIRY CALCULATION ================= */
  const mealsPerDay = 4;
  const createdDate = card.created_at ? new Date(card.created_at) : new Date();
  const totalDays = Math.max(1, Math.ceil(card.meals_remaining / mealsPerDay));
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + totalDays - 1);

  const mealNames = ["Breakfast", "Tea Break", "Lunch", "Supper"];
  const lastMealIndex = (card.meals_remaining % mealsPerDay) || mealsPerDay;
  const lastMeal = mealNames[lastMealIndex - 1];

  const lastMealDate = new Date(createdDate);
  lastMealDate.setDate(lastMealDate.getDate() + totalDays - 1);

  /* ================= WEEKLY MENU ================= */
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const meals = ["Breakfast", "Tea Break", "Lunch", "Supper"];

  return (
    <main className="dash-main" style={S.main}>
      <header style={S.pageHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UtensilsCrossed size={20} color="var(--primary)" />
          <div>
            <h1 style={S.pageTitle}>Meal Card</h1>
            <p style={S.pageSub}>Your digital dining credential</p>
          </div>
        </div>
      </header>

      <div id="meal-card" style={{ ...S.panel, animation: "cardEntrance 0.3s ease both" }}>
        {/* status badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.cardIcon}><CreditCard size={18} color="var(--primary)" /></div>
            <div>
              <div style={S.holderName}>{card.name || "—"}</div>
              <div style={S.holderSub}>{card.admissionNo || "—"} · {card.studentClass || "—"}</div>
            </div>
          </div>
          <span style={{ ...S.statusBadge, color: statusTone.color, background: statusTone.bg }}>
            <span style={{ ...S.statusDot, background: statusTone.color }} />
            {statusMeta.label}
          </span>
        </div>

        <div style={S.matrixPanel}>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Smart Card UID</span>
            <span style={{ ...S.infoValue, fontFamily: "monospace", letterSpacing: "0.5px" }}>{card.card_number || "—"}</span>
          </div>

          <div style={S.splitter}>
            <div>
              <div style={S.infoLabel}>Frequency Rate</div>
              <div style={{ ...S.infoValue, textAlign: "left", marginTop: 4 }}>{card.meals_per_day} meals / day</div>
            </div>
            <div>
              <div style={S.infoLabel}>Balance Remaining</div>
              <div style={{ ...S.infoValue, textAlign: "left", marginTop: 4, color: "var(--success)" }}>{card.meals_remaining} units</div>
            </div>
          </div>

          <div style={S.divider} />

          <div style={S.infoRow}>
            <span style={S.infoLabel}>Issued</span>
            <span style={S.infoValue}>{createdDate.toDateString()}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Expected Expiry</span>
            <span style={S.infoValue}>{expiryDate.toDateString()}</span>
          </div>
          <div style={{ ...S.infoRow, borderBottom: "none" }}>
            <span style={S.infoLabel}>Final Session</span>
            <span style={{ ...S.infoValue, color: "var(--destructive)" }}>
              {lastMeal} <span style={{ fontSize: 11, opacity: 0.75 }}>({lastMealDate.toDateString()})</span>
            </span>
          </div>
        </div>

        {/* weekly schedule */}
        <div style={S.section}>
          <h3 style={S.sectionTitle}><CalendarDays size={15} /> Weekly Dining Schedule</h3>
          <div className="meal-schedule-grid" style={S.scheduleGrid}>
            {days.map((day) => (
              <div key={day} className="meal-day-card" style={S.dayCard}>
                <div style={S.dayHeader}>{day.toUpperCase()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {meals.map((meal) => (
                    <div key={meal} style={S.mealItem}>
                      <span style={S.mealBullet} />
                      {meal}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* daily codes */}
        <div className="hide-on-print" style={S.section}>
          <h3 style={S.sectionTitle}>Today's Meal Verification Codes</h3>
          <p style={S.hint}>Give each code to the kitchen when collecting that meal — every code works once only.</p>
          {codesLoading ? (
            <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Loading codes…</p>
          ) : dailyCodes.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>No codes issued yet — check back once your card is active.</p>
          ) : (
            <div className="meal-codes-grid" style={S.codesGrid}>
              {dailyCodes.map((c) => (
                <div key={c.slot} style={{ ...S.codeCard, opacity: c.used ? 0.55 : 1 }}>
                  <div style={S.codeSlot}>{c.slot.charAt(0).toUpperCase() + c.slot.slice(1)}</div>
                  <div style={S.codeValue}>{c.code || "—"}</div>
                  <div style={{ ...S.codeStatus, color: c.used ? "var(--destructive)" : "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    {c.used ? <Circle size={10} /> : <CheckCircle2 size={11} />}
                    {c.used ? "USED" : "AVAILABLE"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isActive && (
          <div style={S.alertFrame}>
            <ShieldAlert size={17} color="var(--destructive)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={S.alertTitle}>Access Restricted</div>
              <div style={S.alertBody}>This card has been flagged or deactivated. Dining hall access will be denied automatically.</div>
            </div>
          </div>
        )}
      </div>

      <div className="hide-on-print" style={S.footer}>
        <button
          onClick={handlePrint}
          disabled={!isActive}
          className="meal-print-btn"
          style={{ ...S.printBtn, opacity: isActive ? 1 : 0.55, cursor: isActive ? "pointer" : "not-allowed" }}
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>
    </main>
  );
}

/* ================= STYLES ================= */
const S = {
  main: {
    padding: "24px 32px 56px",
    background: "var(--bg)",
    color: "var(--text)",
    minHeight: "100vh",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
    maxWidth: 720,
  },
  pageHeader: { marginBottom: 22 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" },
  pageSub: { margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },

  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "40px 0",
    color: "var(--text-secondary)",
    fontSize: 13.5,
    fontWeight: 600,
  },

  panel: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "22px 24px",
    boxShadow: "var(--shadow-sm)",
  },
  emptyState: {
    padding: "36px 0",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: 13.5,
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  cardIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "var(--primary-tint)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  holderName: { fontSize: 15, fontWeight: 800, color: "var(--text)" },
  holderSub: { fontSize: 12, color: "var(--text-secondary)", marginTop: 1, fontWeight: 600 },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.04em",
  },
  statusDot: { width: 6, height: 6, borderRadius: "50%" },

  matrixPanel: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 16px",
    marginBottom: 20,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 0",
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
    gap: 12,
  },
  infoLabel: { color: "var(--text-secondary)", fontWeight: 700, fontSize: 12.5 },
  infoValue: { color: "var(--text)", fontWeight: 600, textAlign: "right" },
  splitter: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    padding: "10px 0 10px",
    borderBottom: "1px dashed var(--border)",
    marginBottom: 2,
  },
  divider: { height: 1, background: "var(--border)", margin: "2px 0 4px" },

  section: { marginTop: 22 },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 6,
    margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "var(--text)",
  },
  hint: { color: "var(--text-secondary)", fontSize: 12, margin: "0 0 10px" },

  scheduleGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 },
  dayCard: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 4px",
    textAlign: "center",
  },
  dayHeader: {
    color: "var(--primary)",
    fontSize: 11,
    fontWeight: 800,
    borderBottom: "1px solid var(--border)",
    paddingBottom: 4,
    marginBottom: 6,
  },
  mealItem: {
    color: "var(--text-secondary)",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  mealBullet: { width: 3, height: 3, borderRadius: "50%", background: "var(--primary)", opacity: 0.5, flexShrink: 0 },

  codesGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  codeCard: {
    background: "var(--bg)",
    border: "1px solid var(--primary)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 8px",
    textAlign: "center",
  },
  codeSlot: { color: "var(--primary)", fontSize: 11, fontWeight: 800, marginBottom: 6 },
  codeValue: {
    color: "var(--text)",
    fontSize: 20,
    fontWeight: 800,
    fontFamily: "monospace",
    letterSpacing: "2px",
    marginBottom: 6,
  },
  codeStatus: { fontSize: 10, fontWeight: 800, letterSpacing: "0.04em" },

  alertFrame: {
    display: "flex",
    gap: 12,
    background: "var(--destructive-tint)",
    border: "1px solid var(--destructive)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginTop: 20,
  },
  alertTitle: { color: "var(--destructive)", fontSize: 12.5, fontWeight: 800, marginBottom: 2 },
  alertBody: { color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.4 },

  footer: { marginTop: 16, display: "flex" },
  printBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "12px 16px",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontWeight: 700,
    fontSize: 13.5,
    fontFamily: "inherit",
  },
};