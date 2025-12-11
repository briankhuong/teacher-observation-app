// src/services/microsoftGraph.ts (RESTORED MSAL CODE)
import { msalInstance } from "../auth/msalInstance";
import { loginRequest } from "../auth/msalConfig";
import ExcelJS from "exceljs";
// Assuming you have these export files
// import { fillTeacherSheet } from "../exportTeacherExcel"; 
import type { TeacherExportModel } from "../exportTeacherModel";

/**
 * Helper: Get a valid Access Token for Graph API using MSAL's silent acquisition.
 */
async function getGraphToken(): Promise<string> {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("No active Microsoft account found.");

  // IMPORTANT: The scopes here must match the scopes requested in msalConfig and AuthContext
  const graphRequest = {
    ...loginRequest,
    scopes: ["User.Read", "Mail.Send", "Files.ReadWrite.All", "Sites.ReadWrite.All"], 
    account,
  };

  const response = await msalInstance.acquireTokenSilent(graphRequest);
  return response.accessToken;
}

// --- EMAIL FEATURE ---
interface EmailPayload { to: string; subject: string; htmlBody: string; }

export async function sendUserEmail({ to, subject, htmlBody }: EmailPayload) {
  const token = await getGraphToken();
  const message = {
    message: {
      subject: subject,
      body: { contentType: "HTML", content: htmlBody },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error("Failed to send email");
  return true;
}

// --- EXCEL SYNC FEATURE ---
async function resolveSharePointLink(url: string, token: string) {
  const base64Value = btoa(url).replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
  const encodedUrl = "u!" + base64Value;
  const endpoint = `https://graph.microsoft.com/v1.0/shares/${encodedUrl}/driveItem`;
  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("SharePoint Link Error");
  return res.json();
}

export async function syncObservationToWorkbook(workbookUrl: string, model: TeacherExportModel) {
  const token = await getGraphToken();
  const driveItem = await resolveSharePointLink(workbookUrl, token);
  const driveId = driveItem.parentReference.driveId;
  const itemId = driveItem.id;

  const downloadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`;
  const dlRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!dlRes.ok) throw new Error("Failed to download remote workbook.");
  const arrayBuffer = await dlRes.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);

  let sheetName = model.fileDate;
  let counter = 1;
  while (wb.getWorksheet(sheetName)) {
    sheetName = `${model.fileDate} (${counter})`;
    counter++;
  }

  const ws = wb.addWorksheet(sheetName);

  // You will need to uncomment and use your fillTeacherSheet function here later
  // fillTeacherSheet(ws, model); 
  ws.getCell("A1").value = `Observation for ${model.teacherName}`;
  
  const updatedBuffer = await wb.xlsx.writeBuffer();
  const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`;
  
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: updatedBuffer,
  });

  if (!upRes.ok) throw new Error("Upload Failed");
  return { success: true, sheetName };
}