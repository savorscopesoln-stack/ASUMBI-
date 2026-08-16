import { useState } from "react";
import * as XLSX from "xlsx";
import API from "../api";

export default function UserManagement() {
  const [file, setFile] = useState(null);

  // =========================
  // 📥 DOWNLOAD TEMPLATE
  // =========================
  const downloadTemplate = () => {
    const templateData = [
      { username: "student1", password: "1234", role: "student" },
      { username: "teacher1", password: "1234", role: "teacher" },
      { username: "admin1", password: "1234", role: "admin" },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Users");

    XLSX.writeFile(wb, "asumbi_users_template.xlsx");
  };

  // =========================
  // 📤 UPLOAD EXCEL FILE
  // =========================
  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await API.post("/users/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Users uploaded successfully 🚀");
      setFile(null);

    } catch (err) {
      console.log(err);
      alert("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">👥 User Management</h1>
        <p className="text-white/60 text-sm">
          Upload, download and manage system users
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mb-6">

        <button
          onClick={downloadTemplate}
          className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition"
        >
          📥 Download Template
        </button>

      </div>

      {/* UPLOAD BOX */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl">

        <h2 className="text-lg font-semibold mb-3">
          📤 Upload Users (Excel File)
        </h2>

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <br />

        <button
          onClick={uploadFile}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition"
        >
          Upload Users
        </button>

      </div>

    </div>
  );
}