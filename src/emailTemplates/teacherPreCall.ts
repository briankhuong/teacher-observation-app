// src/emailTemplates/teacherPreCall.ts

export interface TeacherPreCallTemplateParams {
  teacherName: string;
  schoolName?: string | null;
  campus?: string | null;
  trainerName: string;
  bookingUrl?: string;
  teacherWorkbookUrl?: string | null; // optional for now
}

export function buildTeacherPreCallHtml({
  teacherName,
  schoolName,
  campus,
  trainerName,
  bookingUrl = "https://outlook.office.com/bookwithme/user/4934be01038a468f96e53d4680caf11d@grapeseed.com/meetingtype/wxCeX3Ld6kmEZYhHNBBmGg2?anonymous&ismsaljsauthenabled&ep=mlink",
  teacherWorkbookUrl,
}: TeacherPreCallTemplateParams): string {
  const contextLine =
    schoolName || campus
      ? `<p style="margin:0 0 8px 0;color:#64748b;font-size:14px;">
           <strong>${schoolName ?? ""}</strong>${schoolName && campus ? " – " : ""}${
          campus ?? ""
        }
         </p>`
      : "";

  const workbookBlock = teacherWorkbookUrl
    ? `
      <tr>
        <td style="padding:16px 24px 0 24px;">
          <p style="margin:0 0 8px 0;color:#0f172a;font-size:14px;">
            You can review the latest support notes here:
          </p>
          <p style="margin:0;">
            <a href="${teacherWorkbookUrl}" style="color:#2563eb;text-decoration:none;">
              Open teacher workbook
            </a>
          </p>
        </td>
      </tr>
    `
    : "";

  return `<!DOCTYPE html> ... </html>`; // (keep your existing HTML body)
}