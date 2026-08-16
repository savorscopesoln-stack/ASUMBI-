import React from "react";

export default function Card({ title, desc, icon, onClick, status }) {
  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer overflow-hidden rounded-2xl p-5
                 bg-gradient-to-br from-white/10 to-white/5
                 border border-white/10 backdrop-blur-md
                 hover:scale-[1.03] hover:shadow-2xl
                 transition-all duration-300 group"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 blur-xl" />

      {/* Top Row */}
      <div className="flex justify-between items-start relative z-10">
        <div className="text-4xl drop-shadow">{icon}</div>

        {status && (
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold
            ${
              status === "Active"
                ? "bg-green-500/20 text-green-300"
                : status === "Expired"
                ? "bg-red-500/20 text-red-300"
                : status === "Scheduled"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-gray-500/20 text-gray-300"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {/* Content */}
      <h2 className="text-lg font-bold mt-3 relative z-10">{title}</h2>

      <p className="text-white/60 text-sm mt-1 relative z-10 line-clamp-2">
        {desc}
      </p>

      {/* Bottom Accent Bar */}
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
}