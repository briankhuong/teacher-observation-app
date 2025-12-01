// exportAdminExcel.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { AdminExportModel } from "./exportAdminModel";

export async function exportAdminExcel(model: AdminExportModel) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Admin");

  // Column widths
  ws.columns = [
    { key: "mainCategory", width: 18 },
    { key: "aspect", width: 28 },
    { key: "classroomSigns", width: 70 },
    { key: "trainerRating", width: 14 },
    { key: "trainerNotes", width: 70 },
  ];

  // -------------------------------
  // HEADER BLOCKS (A1–C2, D1–E2)
  // -------------------------------
  ws.mergeCells("A1:C2");
  const headerLeft = ws.getCell("A1");
  headerLeft.value = model.headerLeft;
  headerLeft.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  headerLeft.font = { name: "Calibri", size: 11 };

  ws.mergeCells("D1:E2");
  const headerRight = ws.getCell("D1");
  headerRight.value = model.headerRight;
  headerRight.alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  headerRight.font = { name: "Calibri", size: 10, bold: true };

  // light orange background for the "Lưu ý" block
  headerRight.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFDE9D9" },
  };

  // -------------------------------
  // TITLE ROW (A3–E3)
  // -------------------------------
  ws.mergeCells("A3:E3");
  const titleCell = ws.getCell("A3");
  titleCell.value =
    "HƯỚNG DẪN CÁC KHÍA CẠNH GIẢNG DẠY GRAPESEED HIỆU QUẢ";
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  titleCell.font = { name: "Calibri", size: 11, bold: true };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9EAD3" }, // soft green
  };

  // -------------------------------
  // COLUMN HEADERS (ROW 4)
  // -------------------------------
  const headerRow = ws.getRow(4);
  headerRow.values = [
    "Mục chính",
    "Khía cạnh",
    "Biểu hiện lớp học",
    "Đánh giá của Trainer",
    "Các điểm GV cần áp dụng / Lưu ý dành cho trường học/ trung tâm",
  ];
  headerRow.font = { name: "Calibri", size: 10, bold: true };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" }, // light purple/blue
  };

  // thin borders for header row
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // -------------------------------
  // DATA ROWS
  // -------------------------------
  const startRow = 5;
  const categoryFirstRow: Record<string, number> = {};
  const categoryLastRow: Record<string, number> = {};

  let excelRowIndex = startRow;

  for (const r of model.rows) {
    const row = ws.getRow(excelRowIndex);
    row.values = [
      r.mainCategory,      // will later be merged & rotated
      r.aspect,
      r.classroomSigns,
      r.trainerRating,
      r.trainerNotes,
    ];

    row.font = { name: "Calibri", size: 10 };
    row.alignment = {
      vertical: "top",
      horizontal: "left",
      wrapText: true,
    };

    // borders
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // track first/last row per mainCategory for merging later
    if (!(r.mainCategory in categoryFirstRow)) {
      categoryFirstRow[r.mainCategory] = excelRowIndex;
    }
    categoryLastRow[r.mainCategory] = excelRowIndex;

    excelRowIndex++;
  }

  // -------------------------------
  // MERGE & VERTICAL TEXT FOR MAIN CATEGORIES (COLUMN A)
  // -------------------------------
  const CATEGORY_COLORS: Record<string, string> = {
    "Môi trường lớp học": "FFCFE2F3", // light blue
    "Phương pháp giảng dạy": "FFF4CEF7", // light pink
    "Tương tác & khuyến khích học sinh": "FFFDE9D9", // light peach
  };

  Object.keys(categoryFirstRow).forEach((cat) => {
    const r1 = categoryFirstRow[cat];
    const r2 = categoryLastRow[cat];
    if (r1 > r2) return;

    // merge A[r1]:A[r2]
    ws.mergeCells(r1, 1, r2, 1);
    const cell = ws.getCell(r1, 1);
    cell.value = cat;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      textRotation: 90, // vertical text
      wrapText: true,
    };
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: CATEGORY_COLORS[cat] ?? "FFE5E5E5" },
    };
  });

  // -------------------------------
  // FILE NAME & SAVE
  // -------------------------------
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `Admin - ${model.schoolName} - ${model.fileDate}.xlsx`;
  saveAs(blob, filename);
}
