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
  AlignmentType,
  ShadingType,
  Footer,
  PageNumber,
} from "docx";
import { jsPDF } from "jspdf";

// ==========================================
// 1. NORMALIZED MEETING DOCUMENT AST SCHEMA
// ==========================================

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type DocNode =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; spans: InlineSpan[] }
  | { type: "bullet_item"; spans: InlineSpan[]; depth: number }
  | { type: "numbered_item"; num: number; spans: InlineSpan[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; text: string; kind?: "info" | "warning" | "decision" };

export interface MeetingDocMetadata {
  date?: string;
  generatedAt?: string;
  sourceFile?: string;
  provider?: string;
  duration?: string;
}

export interface MeetingDocument {
  title: string;
  subtitle?: string;
  metadata?: MeetingDocMetadata;
  nodes: DocNode[];
}

// ==========================================
// 2. MARKDOWN TO AST PARSER COMPILER
// ==========================================

export function parseInlineSpans(raw: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Tokenize bold (**text**), code (`text`), and plain
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = raw.split(tokenRegex);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      spans.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      spans.push({ text: part.slice(1, -1), code: true });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      spans.push({ text: part.slice(1, -1), italic: true });
    } else {
      spans.push({ text: part });
    }
  }

  return spans.length > 0 ? spans : [{ text: raw }];
}

export function parseMarkdownToMeetingDocument(
  title: string,
  markdown: string,
  metadata?: MeetingDocMetadata
): MeetingDocument {
  const cleanTitle = (title || "Executive Meeting Summary").trim();
  const lines = markdown.split("\n");
  const nodes: DocNode[] = [];

  let tableHeader: string[] | null = null;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableHeader && tableHeader.length > 0) {
      nodes.push({
        type: "table",
        headers: tableHeader,
        rows: tableRows,
      });
    }
    tableHeader = null;
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    // Table processing
    if (rawLine.startsWith("|") && rawLine.endsWith("|")) {
      if (/^\|[-:\s|]+\|$/.test(rawLine)) {
        // Table separator row
        continue;
      }
      const cells = rawLine
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim().replace(/\*\*/g, ""));

      if (!tableHeader) {
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (tableHeader) {
      flushTable();
    }

    if (!rawLine) {
      continue;
    }

    // Headings
    if (rawLine.startsWith("# ")) {
      nodes.push({
        type: "heading",
        level: 1,
        text: rawLine.replace(/^#\s+/, "").trim(),
      });
    } else if (rawLine.startsWith("## ")) {
      nodes.push({
        type: "heading",
        level: 2,
        text: rawLine.replace(/^##\s+/, "").trim(),
      });
    } else if (rawLine.startsWith("### ")) {
      nodes.push({
        type: "heading",
        level: 3,
        text: rawLine.replace(/^###\s+/, "").trim(),
      });
    } else if (rawLine.startsWith("> ")) {
      // Callout / Blockquote
      nodes.push({
        type: "callout",
        text: rawLine.replace(/^>\s+/, "").trim(),
        kind: rawLine.toLowerCase().includes("decision") ? "decision" : "info",
      });
    } else if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
      // Bullet list item
      const text = rawLine.replace(/^[-*]\s+/, "");
      nodes.push({
        type: "bullet_item",
        spans: parseInlineSpans(text),
        depth: 0,
      });
    } else if (/^\d+\.\s+/.test(rawLine)) {
      // Numbered list item
      const match = rawLine.match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        nodes.push({
          type: "numbered_item",
          num: parseInt(match[1], 10),
          spans: parseInlineSpans(match[2]),
        });
      }
    } else {
      // Regular paragraph
      nodes.push({
        type: "paragraph",
        spans: parseInlineSpans(rawLine),
      });
    }
  }

  // Final table flush if document ended with table
  if (tableHeader) {
    flushTable();
  }

  return {
    title: cleanTitle,
    subtitle: "Executive Meeting Intelligence & Action Report",
    metadata: metadata || {
      generatedAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      provider: "SummAI Intelligence Engine",
    },
    nodes,
  };
}

// ==========================================
// 3. DOCX RENDERER (AST -> Word Document)
// ==========================================

export async function renderDocxFromAst(doc: MeetingDocument): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Title Banner
  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
    })
  );

  if (doc.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: doc.subtitle,
            italics: true,
            color: "059669", // Emerald
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Metadata Subheader
  if (doc.metadata) {
    const metaParts = [];
    if (doc.metadata.generatedAt) metaParts.push(`Date: ${doc.metadata.generatedAt}`);
    if (doc.metadata.provider) metaParts.push(`Engine: ${doc.metadata.provider}`);
    if (doc.metadata.sourceFile) metaParts.push(`Source: ${doc.metadata.sourceFile}`);

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metaParts.join("   |   "),
            size: 18,
            color: "64748B",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Node Traversal
  for (const node of doc.nodes) {
    if (node.type === "heading") {
      const headingLevel =
        node.level === 1
          ? HeadingLevel.HEADING_1
          : node.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;

      children.push(
        new Paragraph({
          text: node.text,
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (node.type === "paragraph") {
      children.push(
        new Paragraph({
          children: node.spans.map(
            (s) =>
              new TextRun({
                text: s.text,
                bold: s.bold,
                italics: s.italic,
                size: 22,
                color: "1E293B",
              })
          ),
          spacing: { after: 140 },
        })
      );
    } else if (node.type === "bullet_item") {
      children.push(
        new Paragraph({
          bullet: { level: node.depth },
          children: node.spans.map(
            (s) =>
              new TextRun({
                text: s.text,
                bold: s.bold,
                italics: s.italic,
                size: 22,
                color: "1E293B",
              })
          ),
          spacing: { after: 80 },
        })
      );
    } else if (node.type === "numbered_item") {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${node.num}. `, bold: true, size: 22 }),
            ...node.spans.map(
              (s) =>
                new TextRun({
                  text: s.text,
                  bold: s.bold,
                  italics: s.italic,
                  size: 22,
                  color: "1E293B",
                })
            ),
          ],
          spacing: { after: 80 },
        })
      );
    } else if (node.type === "callout") {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `“ ${node.text} ”`,
              italics: true,
              color: "0F766E",
              size: 22,
            }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: "F0FDFA", // Soft teal tint
          },
          spacing: { before: 120, after: 160 },
          indent: { left: 400, right: 400 },
        })
      );
    } else if (node.type === "table") {
      const rows: TableRow[] = [];

      // Header Row
      rows.push(
        new TableRow({
          tableHeader: true,
          children: node.headers.map(
            (h) =>
              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        color: "FFFFFF",
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              })
          ),
        })
      );

      // Data Rows
      node.rows.forEach((r, rowIdx) => {
        const isAlt = rowIdx % 2 === 1;
        rows.push(
          new TableRow({
            children: r.map(
              (c) =>
                new TableCell({
                  shading: isAlt
                    ? { type: ShadingType.CLEAR, fill: "F8FAFC" }
                    : undefined,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: c,
                          size: 20,
                          color: "334155",
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
        );
      });

      children.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      children.push(new Paragraph({ text: "", spacing: { after: 180 } }));
    }
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Generated by SummAI • Confidential • Page ",
                    size: 18,
                    color: "94A3B8",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: "94A3B8",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(wordDoc);
}

// ==========================================
// 4. PDF RENDERER (AST -> PDF Document)
// ==========================================

export function renderPdfFromAst(doc: MeetingDocument): jsPDF {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // Slate-900
  pdf.rect(0, 0, pageWidth, 28, "F");

  pdf.setTextColor(52, 211, 153); // Emerald-400
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("SUMMAI • EXECUTIVE MEETING INTELLIGENCE", margin, 11);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  const displayTitle = doc.title.slice(0, 48);
  pdf.text(displayTitle, margin, 20);

  y = 38;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      pdf.addPage();
      y = 22;
    }
  };

  // Node Traversal
  for (const node of doc.nodes) {
    if (node.type === "heading") {
      if (node.level === 1) {
        checkPageBreak(12);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        y += 3;
        pdf.text(node.text, margin, y);
        y += 7;
      } else if (node.level === 2) {
        checkPageBreak(10);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(5, 150, 105); // Emerald-600
        y += 3;
        pdf.text(node.text, margin, y);
        y += 6;
      } else {
        checkPageBreak(8);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 41, 59);
        y += 2;
        pdf.text(node.text, margin, y);
        y += 5;
      }
    } else if (node.type === "paragraph") {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      const text = node.spans.map((s) => s.text).join("");
      const splitText = pdf.splitTextToSize(text, contentWidth);
      checkPageBreak(splitText.length * 4.5);
      pdf.text(splitText, margin, y);
      y += splitText.length * 4.5 + 2;
    } else if (node.type === "bullet_item") {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      const text = "• " + node.spans.map((s) => s.text).join("");
      const splitText = pdf.splitTextToSize(text, contentWidth - 4);
      checkPageBreak(splitText.length * 4.5);
      pdf.text(splitText, margin + 2, y);
      y += splitText.length * 4.5 + 1;
    } else if (node.type === "numbered_item") {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      const text = `${node.num}. ` + node.spans.map((s) => s.text).join("");
      const splitText = pdf.splitTextToSize(text, contentWidth - 4);
      checkPageBreak(splitText.length * 4.5);
      pdf.text(splitText, margin + 2, y);
      y += splitText.length * 4.5 + 1;
    } else if (node.type === "callout") {
      checkPageBreak(12);
      pdf.setFillColor(240, 253, 250);
      pdf.roundedRect(margin, y - 3, contentWidth, 10, 2, 2, "F");
      pdf.setFillColor(13, 148, 136); // Teal accent bar
      pdf.rect(margin, y - 3, 2, 10, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(15, 118, 110);
      pdf.text(node.text.slice(0, 95), margin + 5, y + 3);
      y += 12;
    } else if (node.type === "table") {
      checkPageBreak(16);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);

      // Header line
      const headerStr = node.headers.join("   |   ");
      const splitH = pdf.splitTextToSize(headerStr, contentWidth);
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y - 3, contentWidth, splitH.length * 4.5 + 2, "F");
      pdf.text(splitH, margin + 2, y + 1);
      y += splitH.length * 4.5 + 4;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);

      for (const row of node.rows) {
        const rowStr = row.join("   |   ");
        const splitR = pdf.splitTextToSize(rowStr, contentWidth);
        checkPageBreak(splitR.length * 4.5);
        pdf.text(splitR, margin + 2, y);
        y += splitR.length * 4.5 + 2;
      }
      y += 3;
    }
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Generated by SummAI • 100% Local Privacy • Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 8
    );
  }

  return pdf;
}

// ==========================================
// 5. PUBLIC EXPORT APIS
// ==========================================

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

export async function exportToDocx(
  title: string,
  markdownContent: string,
  metadata?: MeetingDocMetadata
) {
  const cleanTitle = (title || "Meeting_Summary").replace(/[/\\?%*:|"<>]/g, "_");
  const doc = parseMarkdownToMeetingDocument(title, markdownContent, metadata);
  const blob = await renderDocxFromAst(doc);
  downloadBlob(blob, `${cleanTitle}.docx`);
}

export function exportToPdf(
  title: string,
  markdownContent: string,
  metadata?: MeetingDocMetadata
) {
  const cleanTitle = (title || "Meeting_Summary").replace(/[/\\?%*:|"<>]/g, "_");
  const doc = parseMarkdownToMeetingDocument(title, markdownContent, metadata);
  const pdf = renderPdfFromAst(doc);
  pdf.save(`${cleanTitle}.pdf`);
}
