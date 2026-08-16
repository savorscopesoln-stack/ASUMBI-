import React, { useEffect, useState } from "react";
import API from "../../api";

export default function StudentMealCard() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;

  useEffect(() => {
    if (!userId) return;
    load();

    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/meals/my/${userId}`);
      setCard(res.data || null);
    } catch (err) {
      console.log(err.response?.data || err.message);
      setCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.spinner}></div>
        <p style={styles.stateText}>Synchronizing secure credentials...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ ...styles.cardContainer, animation: "cardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        <div style={styles.errorHeader}>
          <span style={styles.errorIcon}>🍽</span>
          <h2 style={styles.errorTitle}>Meal Account Profile</h2>
        </div>
        <div style={styles.errorDivider}></div>
        <p style={styles.errorText}>No active digital meal card has been assigned to this student account profile yet.</p>
      </div>
    );
  }

  const isActive = card.status === "active";

  /* ================= EXPIRY CALCULATION ================= */
  const mealsPerDay = 4;

  const createdDate = card.created_at ? new Date(card.created_at) : new Date();

  const totalDays = Math.max(1, Math.ceil(card.meals_remaining / mealsPerDay));

  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + totalDays - 1);

  const mealNames = ["Breakfast", "Tea Break", "Lunch", "Supper"];

  const lastMealIndex = (card.meals_remaining % mealsPerDay) || mealsPerDay;
  const lastMeal = mealNames[lastMealIndex - 1];

  /* ================= LAST MEAL DATE FIX ================= */
  const lastMealDate = new Date(createdDate);
  lastMealDate.setDate(lastMealDate.getDate() + totalDays - 1);

  /* ================= WEEKLY MENU ================= */
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const meals = ["Breakfast", "Tea Break", "Lunch", "Supper"];

  // Resolve dynamically glowing badge status parameters based on core values
  const getStatusConfiguration = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { text: "SYSTEM ACTIVE", color: "#34d399", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" };
      case "suspended":
        return { text: "SUSPENDED", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)" };
      default:
        return { text: "ACCESS RESTRICTED", color: "#f87171", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" };
    }
  };

  const statusConfig = getStatusConfiguration(card.status);

  return (
    <div style={styles.pageContext}>
      
      {/* GLOBAL ENCAPSULATED STYLES FOR ANIMATIONS AND IFRAME OVERRIDES */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cardEntrance {
          0% { opacity: 0; transform: translateY(15px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rotateSpinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .interactive-row-card {
          transition: transform 0.2s ease, background-color 0.2s ease !important;
        }
        .interactive-row-card:hover {
          transform: translateY(-2px);
          background-color: rgba(203, 180, 148, 0.08) !important;
        }
        .print-trigger-button {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .print-trigger-button:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px rgba(203, 180, 148, 0.25) !important;
          filter: brightness(1.1);
        }
        @media print {
          body { background-color: #ffffff !important; color: #000000 !important; font-family: Arial, sans-serif; }
          body * { visibility: hidden; }
          #meal-card, #meal-card * { visibility: visible; }
          #meal-card {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            border: 1px solid #111111 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            transform: none !important;
          }
          .hide-on-print { display: none !important; }
          .print-lighten-text { color: #111111 !important; }
          .print-border-adjust { border-color: #222222 !important; }
          .print-bg-adjust { background: transparent !important; border: 1px solid #333 !important; color: #000 !important; }
        }
      `}} />

      {/* ================= MAIN SMART CARD CONTAINER ================= */}
      <div 
        id="meal-card" 
        style={{
          ...styles.cardContainer,
          animation: "cardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        {/* PREMIUM GOLD CORNER DECORATIVE ACCENTS */}
        <div style={styles.topAccentLine} />

        {/* CAMPUS SMART CARD HEADER */}
        <div style={styles.cardHeader}>
          <div style={styles.logoBadge}>🏛</div>
          <div>
            <h2 style={styles.institutionTitle}>ASUMBI SMART CAMPUS</h2>
            <p style={styles.institutionSubtitle}>OFFICIAL MEAL ACCESS CREDENTIAL</p>
          </div>
        </div>

        {/* STATUS GLOWING INDICATOR */}
        <div
          style={{
            ...styles.statusIndicator,
            backgroundColor: statusConfig.bg,
            color: statusConfig.color,
            borderColor: statusConfig.border,
          }}
        >
          <span style={{...styles.statusDot, backgroundColor: statusConfig.color}} />
          {statusConfig.text}
        </div>

        {/* STUDENT MATRIX DATA PANEL */}
        <div style={styles.profileMatrixPanel}>
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Student Holder</span>
            <span style={{ ...styles.matrixValue, color: "#ffffff", fontWeight: "600" }}>{card.name || "—"}</span>
          </div>
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Admission Number</span>
            <span style={styles.matrixValue}>{card.admissionNo || "—"}</span>
          </div>
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Class Stream</span>
            <span style={styles.matrixValue}>{card.studentClass || "—"}</span>
          </div>
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Smart Card UID</span>
            <span style={{...styles.matrixValue, fontFamily: "monospace", letterSpacing: "0.5px", color: "#cbb494"}}>{card.card_number || "—"}</span>
          </div>
          
          <div style={styles.matrixGridSplitter}>
            <div style={styles.splitBlock}>
              <span style={styles.matrixLabel}>Frequency Rate</span>
              <span style={styles.matrixValue}>{card.meals_per_day} Meals / Day</span>
            </div>
            <div style={styles.splitBlock}>
              <span style={styles.matrixLabel}>Balance Remaining</span>
              <span style={{ ...styles.matrixValue, color: "#34d399", fontWeight: "600" }}>{card.meals_remaining} Units</span>
            </div>
          </div>

          <div style={styles.matrixDivider} className="print-border-adjust"></div>

          {/* CHRONOLOGY METRIC GROUPINGS */}
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Issue Timestamp</span>
            <span style={styles.matrixValue}>{createdDate.toDateString()}</span>
          </div>
          <div style={styles.matrixRow}>
            <span style={styles.matrixLabel}>Calculated Terminus</span>
            <span style={styles.matrixValue}>{expiryDate.toDateString()}</span>
          </div>
          <div style={{ ...styles.matrixRow, marginBottom: 0 }}>
            <span style={styles.matrixLabel}>Final Active Session</span>
            <span style={{ ...styles.matrixValue, color: "#fca5a5" }}>
              {lastMeal} <span style={styles.dateSubtext}>({lastMealDate.toDateString()})</span>
            </span>
          </div>
        </div>

        {/* DYNAMIC CALENDAR ALLOCATION GRID */}
        <div style={styles.scheduleSection}>
          <h3 style={styles.scheduleTitle}>📅 Weekly Dining Matrix Allocation</h3>
          <div style={styles.scheduleGrid}>
            {days.map((day) => (
              <div key={day} style={styles.dayColumnCard} className="interactive-row-card print-bg-adjust">
                <div style={styles.dayColumnHeader}>{day.toUpperCase()}</div>
                <div style={styles.mealRowsContainer}>
                  {meals.map((meal) => (
                    <div key={meal} style={styles.mealRowItem}>
                      <span style={styles.mealIndicatorBullet} />
                      {meal}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM WARNING BANNER */}
        {!isActive && (
          <div style={styles.restrictionAlertFrame} className="print-bg-adjust">
            <span style={styles.alertIcon}>⚠</span>
            <div>
              <div style={styles.alertTitle}>Hardware Access Restricted</div>
              <div style={styles.alertBody}>This credential card has been flagged or de-registered. Digital turnstiles will deny entry automatically.</div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT SYSTEM ACTION INVOCATION FOOTER */}
      <div style={styles.actionControlFooter} className="hide-on-print">
        <button
          onClick={handlePrint}
          disabled={!isActive}
          className="print-trigger-button"
          style={{
            ...styles.printActionBtn,
            backgroundColor: isActive ? "#cbb494" : "#222733",
            color: isActive ? "#11141c" : "#64748b",
            border: isActive ? "none" : "1px solid #3a4257",
            cursor: isActive ? "pointer" : "not-allowed",
          }}
        >
          <span style={{ marginRight: "8px", fontSize: "15px" }}>🖨</span> Generate Formal Card Document / PDF
        </button>
      </div>

    </div>
  );
}

/* ================= COMPONENT PRODUCTION STYLING ENGINE ================= */
const styles = {
  pageContext: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    backgroundColor: "transparent",
  },

  stateWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 40px",
    textAlign: "center",
  },

  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(203, 180, 148, 0.15)",
    borderTop: "3px solid #cbb494",
    borderRadius: "50%",
    animation: "rotateSpinner 0.8s linear infinite",
    marginBottom: "16px",
  },

  stateText: {
    color: "#94a3b8",
    fontSize: "14px",
    letterSpacing: "0.2px",
    margin: 0,
  },

  /* Card Structural Base Framework */
  cardContainer: {
    width: "100%",
    maxWidth: "70%",
height: "70%",
maxHeight: "90%",
    backgroundColor: "#161a24", 
    borderRadius: "16px",
    border: "1px solid #cbb494", // Match core system gold finish parameters
    padding: "2px 24px",
    boxSizing: "border-box",
    boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.45)",
   
    overflow: "hidden",
  },

  topAccentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #cbb494 0%, #edd9bc 50%, #cbb494 100%)",
  },

  /* Card Header Elements */
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
  },

  logoBadge: {
    width: "44px",
    height: "44px",
    backgroundColor: "rgba(203, 180, 148, 0.1)",
    border: "1px solid rgba(203, 180, 148, 0.25)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: "#cbb494",
  },

  institutionTitle: {
    color: "#cbb494",
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
    letterSpacing: "0.5px",
  },

  institutionSubtitle: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "500",
    margin: "2px 0 0 0",
    letterSpacing: "0.75px",
  },

  /* Glowing Account Badging */
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "25px",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    border: "1px solid transparent",
    marginBottom: "20px",
  },

  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },

  /* Information Display Layer Matrix */
  profileMatrixPanel: {
    backgroundColor: "#11141c",
    borderRadius: "12px",
    padding: "16px 18px",
    border: "1px solid #232a38",
    marginBottom: "24px",
  },

  matrixRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 0",
    fontSize: "13px",
  },

  matrixLabel: {
    color: "#64748b",
    fontWeight: "500",
  },

  matrixValue: {
    color: "#e2e8f0",
    fontWeight: "500",
    textAlign: "right",
  },

  matrixGridSplitter: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    padding: "12px 0 4px 0",
    marginTop: "4px",
    borderTop: "1px dashed #232a38",
  },

  splitBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  matrixDivider: {
    height: "1px",
    backgroundColor: "#232a38",
    margin: "8px 0",
    width: "100%",
  },

  dateSubtext: {
    fontSize: "11px",
    opacity: 0.75,
  },

  /* Calendar Scheduling Module Components */
  scheduleSection: {
    marginTop: "20px",
  },

  scheduleTitle: {
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    margin: "0 0 12px 0",
    letterSpacing: "0.2px",
  },

  scheduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "6px",
  },

  dayColumnCard: {
    backgroundColor: "#11141c",
    border: "1px solid #232a38",
    borderRadius: "8px",
    padding: "8px 4px",
    textAlign: "center",
    boxSizing: "border-box",
  },

  dayColumnHeader: {
    color: "#cbb494",
    fontSize: "11px",
    fontWeight: "700",
    borderBottom: "1px solid #232a38",
    paddingBottom: "4px",
    marginBottom: "6px",
    letterSpacing: "0.2px",
  },

  mealRowsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  mealRowItem: {
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: "400",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  mealIndicatorBullet: {
    width: "3px",
    height: "3px",
    borderRadius: "50%",
    backgroundColor: "rgba(203, 180, 148, 0.4)",
    display: "inline-block",
  },

  /* System Warnings & Flags Frames */
  restrictionAlertFrame: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    borderRadius: "8px",
    padding: "12px 14px",
    marginTop: "20px",
  },

  alertIcon: {
    color: "#ef4444",
    fontSize: "16px",
    lineHeight: "1",
  },

  alertTitle: {
    color: "#f87171",
    fontSize: "12px",
    fontWeight: "600",
    margin: "0 0 2px 0",
  },

  alertBody: {
    color: "#fca5a5",
    fontSize: "11px",
    lineHeight: "1.4",
    margin: 0,
  },

  /* Empty/Missing Matrix States Elements */
  errorHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },

  errorIcon: {
    fontSize: "24px",
  },

  errorTitle: {
    color: "#cbb494",
    fontSize: "16px",
    fontWeight: "600",
    margin: 0,
  },

  errorDivider: {
    height: "1px",
    backgroundColor: "#cbb494",
    opacity: 0.3,
    marginBottom: "14px",
  },

  errorText: {
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: "1.5",
    margin: 0,
  },

  /* Global Actions Call Footer UI */
  actionControlFooter: {
    marginTop: "20px",
    width: "100%",
    maxWidth: "520px",
    display: "flex",
  },

  printActionBtn: {
    width: "100%",
    padding: "13px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "0.2px",
    outline: "none",
  },
};