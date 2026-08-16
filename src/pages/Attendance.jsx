import { useEffect, useState } from "react";
import API from "../api";

export default function Attendance() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await API.get("/attendance");
      setData(res.data);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">

      <h1 className="text-2xl font-bold mb-4">📊 Attendance</h1>

      {data.map((a, i) => (
        <div key={i} className="bg-white/5 p-3 rounded mb-2">
          {a.status} - {a.count}
        </div>
      ))}

    </div>
  );
}