import React from "react";

export default function FiltersBar({
  classes = [],
  subjects = [],
  terms = [],
  years = [],
  filters,
  setFilters,
}) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>🎛️ Data Controls</div>

      <div style={styles.row}>
        {/* CLASS */}
        <select
          value={filters.class}
          onChange={(e) =>
            setFilters({ ...filters, class: e.target.value })
          }
          style={styles.select}
        >
          <option value="">All Classes</option>
          {classes.map((c, i) => (
            <option key={i}>{c}</option>
          ))}
        </select>

        {/* SUBJECT */}
        <select
          value={filters.subject}
          onChange={(e) =>
            setFilters({ ...filters, subject: e.target.value })
          }
          style={styles.select}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* TERM */}
        <select
          value={filters.term}
          onChange={(e) =>
            setFilters({ ...filters, term: e.target.value })
          }
          style={styles.select}
        >
          <option value="">All Terms</option>
          {terms.map((t, i) => (
            <option key={i}>{t}</option>
          ))}
        </select>

        {/* YEAR */}
        <select
          value={filters.year}
          onChange={(e) =>
            setFilters({ ...filters, year: e.target.value })
          }
          style={styles.select}
        >
          <option value="">All Years</option>
          {years.map((y, i) => (
            <option key={i}>{y}</option>
          ))}
        </select>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      <div style={styles.chips}>
        {Object.entries(filters).map(([key, value]) =>
          value ? (
            <div key={key} style={styles.chip}>
              {key}: {value}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}