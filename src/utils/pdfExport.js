import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSchoolInfo, drawSchoolHeader } from "./schoolInfo";

const BRAND = [139, 30, 45]; // matches --primary

const fmtStamp = (d = new Date()) =>
  d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * Build a PDF made of one or more titled tables and download it.
 * sections: [{ heading?, note?, head: string[], body: (string|number)[][] }]
 */
export async function downloadTablesPdf({
  title, subtitle, sections, filename, orientation = "landscape", schoolName,
}) {
  const school = await getSchoolInfo();
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  // school details (logo, name, address, contacts) on top of every report
  const schoolInfo = schoolName && !school.name ? { ...school, name: schoolName } : school;
  const top = drawSchoolHeader(doc, schoolInfo, { margin, top: 24, color: BRAND });

  // title band
  doc.setFillColor(...BRAND);
  doc.rect(0, top, pageW, 46, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, margin, top + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [subtitle, `Generated ${fmtStamp()}`].filter(Boolean).join("  ·  ");
  doc.text(sub, margin, top + 36);

  let y = top + 64;
  (sections || []).forEach((sec) => {
    if (sec.heading) {
      if (y > pageH - 90) { doc.addPage(); y = margin; }
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(String(sec.heading), margin, y);
      y += 6;
      if (sec.note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        y += 10;
        doc.text(String(sec.note), margin, y);
      }
      y += 8;
    }
    autoTable(doc, {
      startY: y,
      head: [sec.head],
      body: sec.body.length ? sec.body : [[{ content: "No data", colSpan: sec.head.length, styles: { halign: "center", textColor: 120 } }]],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: BRAND, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 245, 246] },
    });
    y = doc.lastAutoTable.finalY + 22;
  });

  // footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 16, { align: "right" });
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
