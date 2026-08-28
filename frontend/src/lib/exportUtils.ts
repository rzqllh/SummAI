"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import { jsPDF } from "jspdf";

/**
 * Downloads a Blob as a file in the browser
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a structured Word (.docx) document from Markdown meeting summary
 */
export async function exportToDocx(title: string, markdownContent: string) {
  const cleanTitle = (title || "Meeting_Summary").replace(/[/\\?%*:|"<>]/g, "_");
  const lines = markdownContent.split("\n");

  const docChildren: (Paragraph | Table)[] = [];

  // Header Title
  docChildren.push(
    new Paragraph({
      text: cleanTitle.replace(/_/g, " "),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  let currentTableRows: TableRow[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      if (inTable && currentTableRows.length > 0) {
        docChildren.push(
          new Table({
            rows: currentTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
        currentTableRows = [];
        inTable = false;
      }
      docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    // Markdown Table Row
    if (rawLine.startsWith("|") && rawLine.endsWith("|")) {
      // Ignore separator rows like |---|---|
      if (/^\|[-:\s|]+\|$/.test(rawLine)) {
        continue;
      }
      inTable = true;
      const cells = rawLine
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      const isHeader = currentTableRows.length === 0;

      const tableCells = cells.map(
        (cellText) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText.replace(/\*\*/g, ""),
                    bold: isHeader || cellText.startsWith("**"),
                    size: isHeader ? 22 : 20,
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            },
            shading: isHeader ? { fill: "F1F5F9" } : undefined,
          })
      );

      currentTableRows.push(new TableRow({ children: tableCells }));
      continue;
    }

    if (inTable && currentTableRows.length > 0) {
      docChildren.push(
        new Table({
          rows: currentTableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      currentTableRows = [];
      inTable = false;
    }

    // Headings
    if (rawLine.startsWith("# ")) {
      docChildren.push(
        new Paragraph({
          text: rawLine.replace(/^#\s+/, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (rawLine.startsWith("## ")) {
      docChildren.push(
        new Paragraph({
          text: rawLine.replace(/^##\s+/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (rawLine.startsWith("### ")) {
      docChildren.push(
        new Paragraph({
          text: rawLine.replace(/^###\s+/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
      docChildren.push(
        new Paragraph({
          text: rawLine.replace(/^[-*]\s+/, ""),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else if (/^\d+\.\s+/.test(rawLine)) {
      docChildren.push(
        new Paragraph({
          text: rawLine.replace(/^\d+\.\s+/, ""),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 60 },
        })
      );
    } else {
      // Normal Paragraph
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: rawLine.replace(/\*\*/g, ""),
              size: 22,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  if (inTable && currentTableRows.length > 0) {
    docChildren.push(
      new Table({
        rows: currentTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${cleanTitle}.docx`);
}

/**
 * Generates and downloads a styled PDF document from Markdown content
 */
export function exportToPdf(title: string, markdownContent: string) {
  const cleanTitle = (title || "Meeting_Summary").replace(/[/\\?%*:|"<>]/g, "_");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMAI • EXECUTIVE MEETING INTELLIGENCE", margin, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const displayTitle = cleanTitle.replace(/_/g, " ").slice(0, 45);
  doc.text(displayTitle, margin, 20);

  y = 38;
  doc.setTextColor(30, 41, 59); // slate-800

  const lines = markdownContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();

    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    if (!raw) {
      y += 4;
      continue;
    }

    if (raw.startsWith("# ")) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      y += 4;
      doc.text(raw.replace(/^#\s+/, ""), margin, y);
      y += 7;
    } else if (raw.startsWith("## ")) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // emerald-600
      y += 3;
      doc.text(raw.replace(/^##\s+/, ""), margin, y);
      y += 6;
    } else if (raw.startsWith("### ")) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      y += 2;
      doc.text(raw.replace(/^###\s+/, ""), margin, y);
      y += 5;
    } else if (raw.startsWith("- ") || raw.startsWith("* ")) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const text = "• " + raw.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
      const splitText = doc.splitTextToSize(text, contentWidth - 4);
      doc.text(splitText, margin + 3, y);
      y += splitText.length * 4.5;
    } else if (raw.startsWith("|") && raw.endsWith("|")) {
      if (/^\|[-:\s|]+\|$/.test(raw)) continue;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      const rowClean = raw
        .slice(1, -1)
        .split("|")
        .map((s) => s.trim().replace(/\*\*/g, ""))
        .join("  |  ");
      const splitRow = doc.splitTextToSize(rowClean, contentWidth);
      doc.text(splitRow, margin, y);
      y += splitRow.length * 4.5;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const textClean = raw.replace(/\*\*/g, "");
      const splitText = doc.splitTextToSize(textClean, contentWidth);
      doc.text(splitText, margin, y);
      y += splitText.length * 4.5;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by SummAI • 100% Local Privacy • Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 8
    );
  }

  doc.save(`${cleanTitle}.pdf`);
}
