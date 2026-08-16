import React from "react";

export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "marks", label: "Marks", icon: "📊", color: "#3b82f6" },
    { key: "analytics", label: "Analytics", icon: "📈", color: "#10b981" },
    { key: "results", label: "Results", icon: "🏆", color: "#f59e0b" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        padding: "6px",
        borderRadius: "14px",
        background: "#f3f4f6",
        width: "fit-content",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              transition: "all 0.25s ease",
              background: isActive
                ? `linear-gradient(135deg, ${tab.color}, #111827)`
                : "transparent",
              color: isActive ? "white" : "#374151",
              boxShadow: isActive
                ? "0 4px 12px rgba(0,0,0,0.15)"
                : "none",
              transform: isActive ? "translateY(-1px)" : "none",
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "#e5e7eb";
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ fontSize: "14px" }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}