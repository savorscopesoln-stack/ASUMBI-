import React, { useEffect, useState, useRef } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

/* Shares the single design-token stylesheet (CSS variables on
   :root / [data-theme='dark']) that Dashboard owns, instead of this
   page's old hardcoded dark maroon palette. injectDesignTokens() is
   idempotent (guarded by the "dash-tokens" id) so it's safe to call
   again here in case this page is the first one mounted. */
const injectDesignTokens = () => {
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
  `;
  document.head.appendChild(el);
};

export default function MealAdmin() {
  const { theme, toggleTheme } = useTheme();

  const [students, setStudents] = useState([]);
  const [cards, setCards] = useState([]);
  const [meals, setMeals] = useState(3);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [days, setDays] = useState(1);

  const [showStudents, setShowStudents] = useState(true);
  const [showCards, setShowCards] = useState(true);

  const [cardMealInputs, setCardMealInputs] = useState({});

  const intervalRef = useRef(null);

  /* ================= THEME TOKENS ================= */
  useEffect(() => {
    injectDesignTokens();
  }, []);

  /* ================= LOAD ================= */
  useEffect(() => {
    loadStudents();
    loadCards();

    intervalRef.current = setInterval(() => {
      loadStudents();
      loadCards();
    }, 999999);

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      loadStudents();
      loadCards();
    }, 1);

    return () => clearTimeout(delay);
  }, [search]);

  /* ================= STUDENTS ================= */
  const loadStudents = async () => {
    try {
      const url = search
        ? `/meals/students/search?q=${search}`
        : `/meals/students/active`;

      const res = await API.get(url);

      let data = res.data || [];

      if (search) {
        const q = search.toLowerCase();

        data = data.filter(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.admissionNo?.toLowerCase().includes(q) ||
            s.studentClass?.toLowerCase().includes(q)
        );
      }

      setStudents(data);
    } catch (err) {
      console.log("Student load error:", err.response?.data || err.message);
    }
  };

  /* ================= CARDS ================= */
  const loadCards = async () => {
    try {
      const res = await API.get("/meals/all");

      let data = res.data || [];

      if (search) {
        const q = search.toLowerCase();

        data = data.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.card_number?.toLowerCase().includes(q) ||
            c.status?.toLowerCase().includes(q)
        );
      }

      setCards(data);
    } catch (err) {
      console.log("Card load error:", err.response?.data || err.message);
    }
  };

  /* ================= TOTAL ================= */
  const totalMeals = cards.reduce(
    (sum, c) => sum + (c.meals_remaining || 0),
    0
  );

  const activeCards = cards.filter(
    (c) => c.status === "active"
  ).length;

  const suspendedCards = cards.filter(
    (c) => c.status === "suspended"
  ).length;

  const inactiveCards = cards.filter(
    (c) => c.status === "inactive"
  ).length;

  /* ================= ASSIGN ================= */
  const assign = async (student_id) => {
    try {
      setLoading(true);

      const totalMeals =
        Number(meals) * Number(days);

      await API.post("/meals/assign", {
        student_id,

        meals_per_day: Number(meals),

        number_of_days: Number(days),

        meals_remaining: totalMeals,
      });

      await loadStudents();
      await loadCards();

    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Assignment failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const assignAll = async () => {
    try {
      setLoading(true);

      const totalMeals =
        Number(meals) * Number(days);

      const results = await Promise.allSettled(
        students.map((s) =>
          API.post("/meals/assign", {
            student_id: s.id,

            meals_per_day: Number(meals),

            number_of_days: Number(days),

            meals_remaining: totalMeals,
          })
        )
      );

      console.log("Bulk results:", results);

      await loadStudents();
      await loadCards();

    } catch (err) {
      alert("Bulk assign failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIONS ================= */
  const suspend = async (id) => {
    await API.put(`/meals/suspend/${id}`);
    loadCards();
  };

  const disable = async (id) => {
    await API.put(`/meals/disable/${id}`);
    loadCards();
  };

  const activate = async (id) => {
    await API.put(`/meals/activate/${id}`);
    loadCards();
  };

  const update = async (card) => {
    const mealsValue =
      cardMealInputs[card.id] ?? card.meals_per_day;

    await API.put(`/meals/update/${card.id}`, {
      meals_per_day: Number(mealsValue),
      meals_remaining: Number(mealsValue),
      status: card.status,
    });

    loadCards();
  };

  const statusColor = (status) => {
    if (status === "active") return "var(--success)";
    if (status === "suspended") return "var(--warning)";
    if (status === "inactive") return "var(--destructive)";
    return "var(--text-muted)";
  };

  const deleteAllCards = async () => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete ALL meal cards?"
      );

      if (!confirmDelete) return;

      setLoading(true);

      await API.delete("/meals/delete-all");

      setCards([]);

      await loadStudents();
      await loadCards();

      alert("All meal cards deleted successfully");
    } catch (err) {
      console.log(err);

      alert(
        err.response?.data?.message ||
          "Failed to delete meal cards"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div style={styles.layout}>
      <div style={styles.main}>
        {/* ================= HEADER ================= */}

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              Meal Card Administration
            </h1>

            <p style={styles.subtitle}>
              Assign, monitor and manage institutional meal cards.
            </p>

            <button
              onClick={() => window.history.back()}
              style={styles.backBtn}
            >
              ← Back
            </button>
          </div>

          <div style={styles.headerRight}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search student, admission or card..."
              style={styles.search}
            />

            <button
              onClick={toggleTheme}
              style={styles.themeToggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
          </div>
        </div>

        {/* ================= ANALYTICS ================= */}

        <div style={styles.analyticsGrid}>
          <div style={styles.analyticsCard}>
            <div style={styles.analyticsIcon}>🍽️</div>

            <div>
              <p style={styles.analyticsLabel}>
                Total Meals Remaining
              </p>

              <h2 style={styles.analyticsValue}>
                {totalMeals}
              </h2>
            </div>
          </div>

          <div style={styles.analyticsCard}>
            <div style={styles.analyticsIcon}>✅</div>

            <div>
              <p style={styles.analyticsLabel}>
                Active Cards
              </p>

              <h2 style={styles.analyticsValue}>
                {activeCards}
              </h2>
            </div>
          </div>

          <div style={styles.analyticsCard}>
            <div style={styles.analyticsIcon}>⏸️</div>

            <div>
              <p style={styles.analyticsLabel}>
                Suspended Cards
              </p>

              <h2 style={styles.analyticsValue}>
                {suspendedCards}
              </h2>
            </div>
          </div>

          <div style={styles.analyticsCard}>
            <div style={styles.analyticsIcon}>❌</div>

            <div>
              <p style={styles.analyticsLabel}>
                Disabled Cards
              </p>

              <h2 style={styles.analyticsValue}>
                {inactiveCards}
              </h2>
            </div>
          </div>
        </div>

        {/* ================= SETTINGS ================= */}

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardHeaderTitle}>⚙️ Meal Assignment Settings</h3>

            <div style={styles.badge}>
              {students.length} Students
            </div>
          </div>

          <div style={styles.settingsRow}>
    <div style={styles.field}>
      <label style={styles.label}>
        Meals Per Day
      </label>

      <input
        type="number"
        value={meals}
        onChange={(e) =>
          setMeals(Number(e.target.value))
        }
        style={styles.input}
      />
    </div>
    <div style={styles.field}>
      <label style={styles.label}>
        Number Of Days
      </label>

      <input
        type="number"
        value={days}
        onChange={(e) =>
          setDays(Number(e.target.value))
        }
        style={styles.input}
      />
    </div>

    <button
      onClick={assignAll}
      disabled={loading}
      style={styles.primaryBtn}
    >
      {loading
        ? "Processing..."
        : "⚡ Assign All Cards"}
    </button>

    {/* DELETE ALL BUTTON */}
    <button
      onClick={deleteAllCards}
      disabled={loading}
      style={styles.deleteAllBtn}
    >
      🗑️ Delete All Cards
    </button>
  </div>
        </div>

        {/* ================= STUDENTS ================= */}

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardHeaderTitle}>
              👤 Active Students ({students.length})
            </h3>

            <button
              onClick={() =>
                setShowStudents(!showStudents)
              }
              style={styles.toggleBtn}
            >
              {showStudents ? "Hide" : "Show"}
            </button>
          </div>

          {showStudents &&
            (students.length === 0 ? (
              <div style={styles.emptyState}>
                No active students found
              </div>
            ) : (
              <div style={styles.grid}>
                {students.map((s) => (
                  <div
                    key={s.id}
                    style={styles.studentCard}
                  >
                    <div style={styles.studentTop}>
                      <div style={styles.avatar}>
                        {s.name?.charAt(0)?.toUpperCase()}
                      </div>

                      <div>
                        <h4 style={styles.studentName}>
                          {s.name}
                        </h4>

                        <p style={styles.studentMeta}>
                          {s.admissionNo}
                        </p>

                        <p style={styles.studentMeta}>
                          {s.studentClass || "No Class"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => assign(s.id)}
                      disabled={loading}
                      style={styles.assignBtn}
                    >
                      ➕ Assign Meal Card
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* ================= CARDS ================= */}

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardHeaderTitle}>
              🍽️ Assigned Meal Cards ({cards.length})
            </h3>

            <button
              onClick={() => setShowCards(!showCards)}
              style={styles.toggleBtn}
            >
              {showCards ? "Hide" : "Show"}
            </button>
          </div>

          {showCards &&
            (cards.length === 0 ? (
              <div style={styles.emptyState}>
                No meal cards available
              </div>
            ) : (
              <div style={styles.grid}>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      ...styles.cardBox,

                      ...(c.status === "inactive"
                        ? styles.inactiveCard
                        : {}),
                    }}
                  >
                    {/* TOP */}
                    <div style={styles.cardTop}>
                      <div>
                        <h4 style={styles.cardName}>
                          {c.name}
                        </h4>

                        <p style={styles.cardMeta}>
                          Card No: {c.card_number}
                        </p>
                      </div>

                      <div
                        style={{
                          ...styles.statusBadge,
                          color: statusColor(c.status),
                          border: `1px solid ${statusColor(
                            c.status
                          )}`,
                        }}
                      >
                        {c.status}
                      </div>
                    </div>

                    {/* STATS */}
                    <div style={styles.cardStats}>
                      <div style={styles.statBox}>
                        <span>Meals / Day</span>

                        <strong>
                          {c.meals_per_day}
                        </strong>
                      </div>

                      <div style={styles.statBox}>
                        <span>Remaining</span>

                        <strong>
                          {c.meals_remaining}
                        </strong>
                      </div>
                    </div>

                    {/* UPDATE */}
                    <div style={styles.field}>
                      <label style={styles.label}>
                        Update Meals
                      </label>

                      <input
                        type="number"
                        value={
                          cardMealInputs[c.id] ??
                          c.meals_per_day
                        }
                        onChange={(e) =>
                          setCardMealInputs({
                            ...cardMealInputs,
                            [c.id]: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>

                    {/* ACTIONS */}
                    <div style={styles.btnGrid}>
                      <button
                        onClick={() => update(c)}
                        style={styles.blueBtn}
                      >
                        Update
                      </button>

                      <button
                        onClick={() => suspend(c.id)}
                        style={styles.orangeBtn}
                      >
                        Suspend
                      </button>

                      <button
                        onClick={() => disable(c.id)}
                        style={styles.redBtn}
                      >
                        Disable
                      </button>

                      <button
                        onClick={() => activate(c.id)}
                        style={styles.greenBtn}
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES =================
   All colors reference the shared design-token CSS variables, so this
   page follows the same light/dark palette as Dashboard, Practicum,
   and Users. */

const styles = {
  layout: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  deleteAllBtn: {
    padding: "14px 20px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--destructive)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--destructive)",
    boxShadow: "var(--shadow-sm)",
  },
  main: {
    padding: 35,
  },

  /* ================= HEADER ================= */

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 30,
  },

  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: "var(--text)",
  },

  subtitle: {
    color: "var(--text-secondary)",
    marginTop: 8,
    fontSize: 14,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  search: {
    width: 320,
    padding: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    outline: "none",
    fontSize: 13.5,
  },

  themeToggle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    width: 40,
    height: 40,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 15,
  },

  backBtn: {
    marginTop: 18,
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    fontWeight: 700,
    color: "var(--text)",
    background: "var(--card)",
  },

  /* ================= ANALYTICS ================= */

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: 16,
    marginBottom: 24,
  },

  analyticsCard: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxShadow: "var(--shadow-sm)",
  },

  analyticsIcon: {
    width: 52,
    height: 52,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    background: "var(--primary-tint)",
  },

  analyticsLabel: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: 12.5,
    fontWeight: 600,
  },

  analyticsValue: {
    margin: "6px 0 0",
    fontSize: 26,
    fontWeight: 800,
    color: "var(--text)",
  },

  /* ================= CARDS ================= */

  card: {
    background: "var(--card)",
    borderRadius: "var(--radius)",
    padding: 22,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
    marginBottom: 20,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },

  cardHeaderTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: "var(--text)",
  },

  badge: {
    background: "var(--primary-tint)",
    color: "var(--primary)",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  toggleBtn: {
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    fontWeight: 700,
    background: "var(--card-elevated)",
    color: "var(--text)",
  },

  /* ================= FORM ================= */

  settingsRow: {
    display: "flex",
    gap: 16,
    alignItems: "end",
    flexWrap: "wrap",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 12,
    color: "var(--text-secondary)",
    fontWeight: 700,
  },

  input: {
    padding: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    outline: "none",
    minWidth: 120,
    fontSize: 13.5,
  },

  /* ================= BUTTONS ================= */

  primaryBtn: {
    padding: "12px 18px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--primary)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--primary)",
    boxShadow: "var(--shadow-sm)",
  },

  blueBtn: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--info)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--info)",
  },

  orangeBtn: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--warning)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--warning)",
  },

  redBtn: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--destructive)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--destructive)",
  },

  greenBtn: {
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--success)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background: "var(--success)",
  },

  assignBtn: {
    marginTop: 14,
    width: "100%",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--primary)",
    cursor: "pointer",
    fontWeight: 700,
    background: "var(--primary)",
    color: "#fff",
  },

  /* ================= GRID ================= */

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(300px,1fr))",
    gap: 16,
  },

  /* ================= STUDENTS ================= */

  studentCard: {
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 18,
  },

  studentTop: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "var(--primary)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 800,
    fontSize: 18,
    color: "#fff",
  },

  studentName: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text)",
  },

  studentMeta: {
    margin: "4px 0",
    color: "var(--text-muted)",
    fontSize: 12.5,
  },

  /* ================= CARD BOX ================= */

  cardBox: {
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 18,
    transition: "opacity 0.2s ease",
  },

  inactiveCard: {
    opacity: 0.5,
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },

  cardName: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text)",
  },

  cardMeta: {
    color: "var(--text-muted)",
    fontSize: 12.5,
    marginTop: 6,
  },

  statusBadge: {
    padding: "6px 12px",
    borderRadius: 999,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: 700,
    background: "var(--card)",
    height: "fit-content",
  },

  cardStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },

  statBox: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "var(--text-secondary)",
    fontSize: 12.5,
  },

  btnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 16,
  },

  /* ================= EMPTY ================= */

  emptyState: {
    padding: 28,
    textAlign: "center",
    color: "var(--text-muted)",
    borderRadius: "var(--radius-sm)",
    background: "var(--card-elevated)",
    border: "1px solid var(--border)",
  },
};