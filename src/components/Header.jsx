export default function Header({ user, onLogout }) {
  return (
    <div style={styles.header}>
      {/* LEFT */}
      <div>
        <h2 style={styles.title}>AI Analytics Dashboard</h2>
        <p style={styles.subtitle}>
          Welcome back, <span style={{ color: "#facc15" }}>{user?.username}</span>
        </p>
      </div>

      {/* RIGHT */}
      <div style={styles.actions}>
        {/* LIVE STATUS */}
        <div style={styles.live}>
          <span style={styles.dot}></span>
          LIVE
        </div>

        {/* USER */}
        <div style={styles.user}>
          👤 {user?.username}
        </div>

        {/* LOGOUT */}
        <button onClick={onLogout} style={styles.button}>
          Logout
        </button>
      </div>
    </div>
  );
}