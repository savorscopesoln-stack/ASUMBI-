import React, { useEffect, useState } from "react";
import API from "../api";

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFees = async () => {
      try {
        const res = await API.get("/fees");
        setFees(res.data || []);
      } catch (err) {
        console.log("Fees error:", err);
        setFees([]);
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">

      <h1 className="text-2xl font-bold mb-4">💰 Fees</h1>

      {loading ? (
        <p className="text-white/60">Loading fees...</p>
      ) : fees.length === 0 ? (
        <p className="text-white/60">No fee records found.</p>
      ) : (
        <div className="space-y-3">
          {fees.map((fee, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 p-4 rounded-lg"
            >
              <p>Student: {fee.student || "N/A"}</p>
              <p>Amount: {fee.amount || 0}</p>
              <p>Status: {fee.status || "pending"}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}