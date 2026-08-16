import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function MealAdmin() {
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
    if (status === "active") return "#22c55e";
    if (status === "suspended") return "#f59e0b";
    if (status === "inactive") return "#ef4444";
    return "#94a3b8";
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
            <h3>⚙️ Meal Assignment Settings</h3>

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
    /><div style={styles.field}>
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
            <h3>
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
            <h3>
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

/* ================= STYLES ================= */

const styles = {
  layout: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#0f0f0f 0%, #1b0a0a 45%, #090909 100%)",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
  },
  deleteAllBtn: {
    padding: "14px 20px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#7f1d1d,#ef4444)",
    boxShadow: "0 8px 20px rgba(239,68,68,0.28)",
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
    fontSize: 38,
    fontWeight: 800,
  },

  subtitle: {
    color: "#9ca3af",
    marginTop: 8,
    fontSize: 15,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  search: {
    width: 340,
    padding: 15,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
    backdropFilter: "blur(12px)",
  },

  backBtn: {
    marginTop: 18,
    padding: "12px 18px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#991b1b,#dc2626)",
    boxShadow: "0 8px 20px rgba(220,38,38,0.25)",
  },

  /* ================= ANALYTICS ================= */

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: 20,
    marginBottom: 28,
  },

  analyticsCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 24,
    display: "flex",
    alignItems: "center",
    gap: 18,
    backdropFilter: "blur(14px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },

  analyticsIcon: {
    width: 65,
    height: 65,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    background:
      "linear-gradient(135deg,#991b1b,#ef4444)",
    boxShadow: "0 10px 25px rgba(239,68,68,0.25)",
  },

  analyticsLabel: {
    margin: 0,
    color: "#9ca3af",
    fontSize: 14,
  },

  analyticsValue: {
    margin: "8px 0 0",
    fontSize: 30,
    fontWeight: 800,
  },

  /* ================= CARDS ================= */

  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    marginBottom: 24,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },

  badge: {
    background: "rgba(220,38,38,0.15)",
    color: "#fca5a5",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },

  toggleBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    background:
      "linear-gradient(135deg,#1e293b,#334155)",
    color: "#fff",
  },

  /* ================= FORM ================= */

  settingsRow: {
    display: "flex",
    gap: 20,
    alignItems: "end",
    flexWrap: "wrap",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  label: {
    fontSize: 13,
    color: "#cbd5e1",
    fontWeight: 600,
  },

  input: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    outline: "none",
    minWidth: 120,
    fontSize: 14,
  },

  /* ================= BUTTONS ================= */

  primaryBtn: {
    padding: "14px 20px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#991b1b,#dc2626)",
    boxShadow: "0 8px 20px rgba(220,38,38,0.25)",
  },

  blueBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#1d4ed8,#2563eb)",
  },

  orangeBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#c2410c,#f59e0b)",
  },

  redBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#991b1b,#ef4444)",
  },

  greenBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
    background:
      "linear-gradient(135deg,#15803d,#22c55e)",
  },

  assignBtn: {
    marginTop: 16,
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    background:
      "linear-gradient(135deg,#991b1b,#dc2626)",
    color: "#fff",
  },

  /* ================= GRID ================= */

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(320px,1fr))",
    gap: 20,
  },

  /* ================= STUDENTS ================= */

  studentCard: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 22,
    padding: 22,
  },

  studentTop: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#991b1b,#ef4444)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 800,
    fontSize: 20,
    boxShadow: "0 8px 18px rgba(239,68,68,0.3)",
  },

  studentName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },

  studentMeta: {
    margin: "4px 0",
    color: "#9ca3af",
    fontSize: 13,
  },

  /* ================= CARD BOX ================= */

  cardBox: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 22,
    padding: 22,
    transition: "0.3s",
  },

  inactiveCard: {
    opacity: 0.45,
    filter: "grayscale(100%)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  cardName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },

  cardMeta: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 6,
  },

  statusBadge: {
    padding: "10px 16px",
    borderRadius: 999,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 700,
    background: "rgba(255,255,255,0.03)",
    height: "fit-content",
  },

  cardStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 20,
  },

  statBox: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#d1d5db",
  },

  btnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 20,
  },

  /* ================= EMPTY ================= */

  emptyState: {
    padding: 30,
    textAlign: "center",
    color: "#9ca3af",
    borderRadius: 18,
    background: "rgba(0,0,0,0.25)",
  },
};