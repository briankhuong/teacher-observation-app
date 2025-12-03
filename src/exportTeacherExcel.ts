// src/exportTeacherExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { TeacherExportModel } from "./exportTeacherModel";

/** Ensure file name parts contain only safe characters. */
function sanitizeFilePart(part: string): string {
  return part.replace(/[\\/:*?"<>|]/g, "").trim() || "Untitled";
}

/** Some characters are not allowed in Excel sheet names. */
function sanitizeSheetName(name: string): string {
  // Remove characters Excel doesn't like and trim to 31 chars
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet1";
}

// Strip internal OCR markers like "[OCR]" before writing to Excel
function cleanOcrText(text?: string | null): string {
  if (!text) return "";

  let cleaned = text;

  // Remove the [OCR] label (any case) plus any spaces/newlines right after it
  cleaned = cleaned.replace(/\[OCR\]\s*/gi, "");

  // Collapse 3+ blank lines into just 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/** Build and download the Teacher Excel workbook from the export model. */
export async function exportTeacherExcel(model: TeacherExportModel) {
  const wb = new ExcelJS.Workbook();
  const sheetName = sanitizeSheetName(model.sheetName);
  const ws = wb.addWorksheet(sheetName);

  // ---- Column widths ----
  ws.columns = [
    { key: "area", width: 4 },        // A
    { key: "indicator", width: 28 },  // B
    { key: "explanation", width: 42 },// C
    { key: "checklist", width: 12 },  // D (checkbox-ish)
    { key: "status", width: 14 },     // E (Done / Pending via formula)
    { key: "strengths", width: 40 },  // F
    { key: "growths", width: 40 },    // G
    { key: "nextsteps", width: 40 },  // H
  ];

  // ---- Row 1: header block (A1:H1 merged) ----
  ws.mergeCells("A1:H1");
  const a1 = ws.getCell("A1");
  a1.value = model.headerBlock;
  a1.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  a1.font = { size: 11, bold: false };
  a1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E5E5" }, // neutral light grey
  };

  // ---- Row 2: Section headers ----
  // A2–C2: GUIDE block (FFC599)
  ws.mergeCells("A2:C2");
  const guideCell = ws.getCell("A2");
  guideCell.value = "GUIDE TO TEACHING GRAPESEED";
  guideCell.font = { bold: true };
  guideCell.alignment = { vertical: "middle", horizontal: "center" };
  guideCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC599" }, // FFC599
  };

  // D2–G2: Trainer's comments (keep merged as before, but now yellow)
  ws.mergeCells("D2:G2");
  const trainerCell = ws.getCell("D2");
  trainerCell.value = "TRAINER'S COMMENTS";
  trainerCell.font = { bold: true };
  trainerCell.alignment = { vertical: "middle", horizontal: "center" };
  trainerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" }, // FFFF00
  };

  // H2: NEXT STEPS header (keep as separate block, red-ish)
  const nextStepsHeader = ws.getCell("H2");
  nextStepsHeader.value = "NEXT STEPS";
  nextStepsHeader.font = { bold: true };
  nextStepsHeader.alignment = { vertical: "middle", horizontal: "center" };
  nextStepsHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC7CE" }, // light red
  };

  // ---- Row 3: Table headers ----
  const headerRow = ws.getRow(3);
  headerRow.values = [
    "Area",
    "Indicator",
    "Further Explanation",
    "Checklist",
    "Status",
    "Teacher's Strengths",
    "Teacher's Growth Areas",
    "", // H is Next Steps overall (header already in row 2)
  ];
  headerRow.font = { bold: true };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  // Colors row 3:
  // A–C: same as A2–C2 → FFC599
  ["A3", "B3", "C3"].forEach((addr) => {
    ws.getCell(addr).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC599" },
    };
  });

  // D–G: same yellow as trainer block (approx for "G–J" in your template)
  ["D3", "E3", "F3", "G3"].forEach((addr) => {
    ws.getCell(addr).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };
  });

  // H3: same as H2 (Next Steps header area) → light red
  ws.getCell("H3").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC7CE" },
  };

  // ---- Area labels in column A (vertical text) ----
  ws.getColumn("A").width = 4;

  // LEARNING ENVIRONMENT: rows 4–6, merged A4:A6, color D1F1DA
  ws.mergeCells("A4:A6");
  const area1 = ws.getCell("A4");
  area1.value = "LEARNING ENVIRONMENT";
  area1.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
    textRotation: 90,
  };
  area1.font = { bold: true };
  area1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD1F1DA" }, // D1F1DA
  };

  // PREPARATION & REFLECTION & INSTRUCTIONAL DELIVERY: rows 7–21, A7:A21, FFCCFF
  ws.mergeCells("A7:A21");
  const area2 = ws.getCell("A7");
  area2.value = "PREPARATION AND REFLECTION & INSTRUCTIONAL DELIVERY";
  area2.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
    textRotation: 90,
  };
  area2.font = { bold: true };
  area2.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFCCFF" }, // FFCCFF
  };

  // ---- Next steps area: H4:H21 merged ----
  ws.mergeCells("H4:H21");
  const nextStepsCell = ws.getCell("H4");
  nextStepsCell.value = ""; // you can fill later if you like
  nextStepsCell.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };

  // ---- Body rows (4–21) from model.rows ----
  model.rows.forEach((row) => {
    const r = ws.getRow(row.rowIndex);
    r.getCell("B").value = row.indicatorLabel;
    r.getCell("C").value = row.description;

    // D: "checkbox" via dropdown (✓ or blank)
    const dCell = r.getCell("D");
    const isDone = row.status === "Done";
    dCell.value = isDone ? "✓" : "";
    dCell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    dCell.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"✓,"'], // options: "✓" and empty
      showInputMessage: true,
      promptTitle: "Checklist",
      prompt: 'Choose "✓" if this indicator is complete.',
    };

    // E: Done/Pending driven by D
    const eCell = r.getCell("E");
    const rowNum = row.rowIndex;
    eCell.value = {
      formula: `IF(D${rowNum}="✓","Done","Pending")`,
      result: isDone ? "Done" : "Pending",
    };
    eCell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    // F & G: strengths/growths (cleaned OCR, but no [OCR] tag)
    r.getCell("F").value = cleanOcrText(row.strengths) || "";
    r.getCell("G").value = cleanOcrText(row.growths) || "";

    ["F", "G"].forEach((col) => {
      const cell = r.getCell(col);
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: true,
      };
    });

    // Basic alignment for B, C as well
    ["B", "C"].forEach((col) => {
      const cell = r.getCell(col);
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: true,
      };
    });
  });

  // ---- Light borders for the table (A3:G21) ----
  for (let row = 3; row <= 21; row++) {
    for (const col of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      const cell = ws.getCell(`${col}${row}`);
      cell.border = {
        top: { style: "thin", color: { argb: "FFAAAAAA" } },
        left: { style: "thin", color: { argb: "FFAAAAAA" } },
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
        right: { style: "thin", color: { argb: "FFAAAAAA" } },
      };
    }
  }

  // ---- Highlight Status when Done (CC66FF) ----
  for (let rowNum = 4; rowNum <= 21; rowNum++) {
    const eCell = ws.getCell(`E${rowNum}`);
    const current = (eCell.value as any)?.result ?? eCell.value;

    if (current === "Done") {
      eCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCC66FF" }, // CC66FF
      };
    }
  }

  // Freeze header row (row 3)
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

  // Header heights
  ws.getRow(1).height = 60;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 28;

  // Body rows
  for (let r = 4; r <= 21; r++) {
    ws.getRow(r).height = 110;
  }
  // Very long row (3.3 + 6.1 + 7.2) if needed
  ws.getRow(12).height = 140;

  // ---- Generate file & download ----
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const teacher = sanitizeFilePart(model.teacherName);
  const school = sanitizeFilePart(model.schoolName);
  const dateLabel = model.fileDate; // "YYYY.MM.DD"

  const filename = `${teacher} - ${school} - ${dateLabel}.xlsx`;
  saveAs(blob, filename);
}