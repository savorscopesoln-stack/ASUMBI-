export const exportCSV = (data, filename = "data.csv") => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);

  const rows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(",")
    )
  ];

  const blob = new Blob([rows.join("\n")], {
    type: "text/csv"
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  window.URL.revokeObjectURL(url);
};