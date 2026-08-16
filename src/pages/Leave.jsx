import { useState } from "react";
import API from "../api";

export default function Leave() {
  const [reason, setReason] = useState("");

  const submit = async () => {
    await API.post("/leave", {
      studentId: 1,
      reason,
    });

    alert("Leave request sent");
    setReason("");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">

      <h1 className="text-2xl font-bold mb-4">📝 Leave Request</h1>

      <textarea
        className="w-full p-3 bg-white/5 border border-white/10 rounded"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter reason..."
      />

      <button
        onClick={submit}
        className="mt-3 px-4 py-2 bg-indigo-500 rounded"
      >
        Submit
      </button>

    </div>
  );
}