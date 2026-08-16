import React, { useEffect, useMemo, useState, useRef } from "react";
import API from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useNavigate } from "react-router-dom";

/* ================= GRADUATION PAGE ================= */
export default function Graduation() {
  const navigate = useNavigate();

  const [graduated, setGraduated] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);

  const [classFilter, setClassFilter] = useState([]);
  const [yearFilter, setYearFilter] = useState([]);

  const [classOpen, setClassOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const [selectAll, setSelectAll] = useState(false);

  const PAGE_SIZE = 20;
  const classRef = useRef();
  const yearRef = useRef();

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchGraduated = async () => {
      try {
        const res = await API.get("/graduations");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setGraduated(data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchGraduated();
  }, []);

  /* ================= CLOSE DROPDOWNS ================= */
  useEffect(() => {
    const handleClick = (e) => {
      if (classRef.current && !classRef.current.contains(e.target)) {
        setClassOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ================= FILTER OPTIONS ================= */
  const allClasses = useMemo(
    () => [...new Set(graduated.map((g) => g.studentClass))],
    [graduated]
  );

  const allYears = useMemo(
    () => [...new Set(graduated.map((g) => g.graduationYear))],
    [graduated]
  );

  /* ================= FILTER LOGIC ================= */
  const filtered = useMemo(() => {
    return graduated
      .filter((g) =>
        (g.name || "").toLowerCase().includes(search.toLowerCase())
      )
      .filter((g) =>
        classFilter.length ? classFilter.includes(g.studentClass) : true
      )
      .filter((g) =>
        yearFilter.length ? yearFilter.includes(g.graduationYear) : true
      );
  }, [graduated, search, classFilter, yearFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* ================= STATS ================= */
  const totalGraduates = graduated.length;
  const activeFilteredCount = filtered.length;

  const byYear = useMemo(() => {
    const map = {};
    graduated.forEach((g) => {
      const y = g.graduationYear || "Unknown";
      map[y] = (map[y] || 0) + 1;
    });

    return Object.keys(map).map((k) => ({
      year: k,
      count: map[k],
    }));
  }, [graduated]);

  /* ================= SELECT ================= */
  const toggle = (g) => {
    const id = g.id || g._id;

    if (selected.some((x) => (x.id || x._id) === id)) {
      setSelected(selected.filter((x) => (x.id || x._id) !== id));
    } else {
      setSelected([...selected, g]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected([]);
      setSelectAll(false);
    } else {
      setSelected(filtered);
      setSelectAll(true);
    }
  };

  /* ================= LETTER ================= */
  const buildLetter = (g) => `
    <html>
    <head>
      <style>
        @page { size: A4 portrait; margin: 18mm; }
        body { font-family: "Times New Roman"; }

        .page { padding: 25px 40px; }

        .header {
          text-align: center;
          border-bottom: 2px solid #800000;
          margin-bottom: 20px;
        }

        .content {
          font-size: 15px;
          line-height: 1.9;
          text-align: justify;
        }

        .footer {
          margin-top: 40px;
          text-align: right;
        }
      </style>
    </head>

    <body>
      <div class="page">

        <div class="header">
          <h1>ASUMBI TEACHERS TRAINING COLLEGE</h1>
          <h3>OFFICIAL COMPLETION LETTER</h3>
        </div>

        <div class="content">
          <p>Dear <b>${g.name}</b>,</p>

          <p>This is to formally certify that you were a registered student at Asumbi Teachers Training College during your period of study under the approved academic programme.</p>

          <p>You successfully completed all required academic units, teaching practice, and institutional assessments as prescribed by the college curriculum.</p>

          <p>Throughout your training, you demonstrated discipline, commitment, and satisfactory academic performance consistent with institutional standards.</p>

          <p>This confirms your completion in the year <b>${g.graduationYear}</b> upon fulfilling all academic and administrative requirements.</p>

          <p>The college congratulates you on this achievement and wishes you success in your future academic and professional journey.</p>
        </div>

        <div class="footer">
          <p><b>Principal</b></p>
          <p>_____________________</p>
        </div>

      </div>
    </body>
    </html>
  `;

  /* ================= PRINT ================= */
  const printLetter = (g) => {
    const win = window.open("", "_blank");
    if (!win) return alert("Enable popups");
    win.document.write(buildLetter(g));
    win.document.close();
    win.print();
  };

  const printAllSelected = () => {
    if (selected.length === 0) return alert("No students selected");

    const win = window.open("", "_blank");
    if (!win) return alert("Enable popups");

    win.document.write(`
      <html>
      <head>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          body { font-family: "Times New Roman"; }

          .page {
            page-break-after: always;
            padding: 25px 40px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #800000;
            margin-bottom: 20px;
          }

          .content {
            font-size: 15px;
            line-height: 1.9;
            text-align: justify;
          }

          .footer {
            margin-top: 40px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        ${selected.map(buildLetter).join("")}
      </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {/* HEADER (BACK BUTTON ADDED ONLY) */}
      <div style={styles.header}>

        <button
          onClick={() => navigate(-1)}
          style={styles.backBtn}
        >
          ← Back
        </button>

        <h1>🎓 Graduation Dashboard</h1>

        <input
          style={styles.search}
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* FILTERS */}
      <div style={styles.filterRow}>

        <button onClick={handleSelectAll} style={styles.btn}>
          {selectAll ? "Deselect All" : "Select All"}
        </button>

        {/* CLASS */}
        <div ref={classRef} style={styles.dropdown}>
          <button onClick={() => setClassOpen(!classOpen)} style={styles.btn}>
            Class ({classFilter.length})
          </button>

          {classOpen && (
            <div style={styles.menu}>
              {allClasses.map((c) => (
                <label key={c} style={styles.label}>
                  <input
                    type="checkbox"
                    checked={classFilter.includes(c)}
                    onChange={() =>
                      setClassFilter((p) =>
                        p.includes(c)
                          ? p.filter(x => x !== c)
                          : [...p, c]
                      )
                    }
                  />
                  {" "}{c}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* YEAR */}
        <div ref={yearRef} style={styles.dropdown}>
          <button onClick={() => setYearOpen(!yearOpen)} style={styles.btn}>
            Year ({yearFilter.length})
          </button>

          {yearOpen && (
            <div style={styles.menu}>
              {allYears.map((y) => (
                <label key={y} style={styles.label}>
                  <input
                    type="checkbox"
                    checked={yearFilter.includes(y)}
                    onChange={() =>
                      setYearFilter((p) =>
                        p.includes(y)
                          ? p.filter(x => x !== y)
                          : [...p, y]
                      )
                    }
                  />
                  {" "}{y}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={printAllSelected} style={styles.printBtn}>
          🖨 Mass Print
        </button>
      </div>

      {/* STATS */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <h2>{totalGraduates}</h2>
          <p>Total Graduates</p>
        </div>

        <div style={styles.statCard}>
          <h2>{activeFilteredCount}</h2>
          <p>Filtered Results</p>
        </div>

        <div style={styles.statCard}>
          <h2>{selected.length}</h2>
          <p>Selected Students</p>
        </div>
      </div>

      {/* GRID */}
      <div style={styles.grid}>
        {paginated.map((g) => (
          <div key={g.id || g._id} style={styles.card}>
            <h3>{g.name}</h3>
            <p>{g.studentClass}</p>
            <p>{g.graduationYear}</p>

            <button onClick={() => toggle(g)}>Select</button>
            <button onClick={() => printLetter(g)}>Print</button>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: { padding: 20, background: "#0b0000", color: "white", minHeight: "100vh" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  search: { padding: 10, borderRadius: 8 },

  backBtn: {
    padding: "10px 15px",
    background: "#222",
    color: "white",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
  },

  filterRow: { display: "flex", gap: 10, marginTop: 15, flexWrap: "wrap" },

  btn: { padding: 10, background: "#333", color: "white", borderRadius: 8 },
  printBtn: { padding: 10, background: "#800000", color: "white", borderRadius: 8 },

  dropdown: { position: "relative" },

  menu: {
    position: "absolute",
    background: "#111",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    zIndex: 1000,
  },

  label: { display: "block", marginBottom: 5 },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 15,
    marginTop: 15,
  },

  statCard: {
    background: "#111",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
    marginTop: 20,
  },

  card: { background: "#111", padding: 15, borderRadius: 12 },
};