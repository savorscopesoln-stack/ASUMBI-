import React from "react";

export default function BulkActions() {
  return (
    <div className="flex gap-3 mt-6">
      <button className="bg-green-600 text-white px-4 py-2 rounded">
        Save All
      </button>

      <button className="bg-black text-white px-4 py-2 rounded">
        Export
      </button>
    </div>
  );
}