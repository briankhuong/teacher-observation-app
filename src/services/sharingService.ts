// src/services/sharingService.ts

// Assuming you have these types/functions available in your codebase:
import { saveObservationToDb, type ObservationRecord } from "../db/observations"; 
import { appendRowToWorkbook } from "./excelService"; 
import type { EmailRecipient } from "./emailService"; // Import the type from the correct file
import { sendObservationEmail } from "./emailService"; 
import { buildAdminExportModel } from "../exportAdminModel"; // Reusing your export logic
import type { TeacherRow } from "../db/teachers"; // Need this type

// Helper function to flatten the notes/indicators for a single row insertion into Excel
function formatForExcelRow(
    obs: ObservationRecord,
    trainerName: string
): (string | number | Date)[] {
    
    // Use the logic already present in your app to build the Admin Export Model, 
    // as it seems to contain all the required data points.
    const adminExportModel = buildAdminExportModel(obs.meta as any, obs.indicators as any);
    
    // We want to combine the core metadata + the trainer summary into one row.
    
    return [
        obs.meta.date,          // Column 1: Observation Date
        obs.id,                 // Column 2: Observation ID
        trainerName,            // Column 3: Trainer Name
        obs.meta.teacherName,   // Column 4: Teacher Name
        obs.meta.schoolName,    // Column 5: School
        obs.meta.campus,        // Column 6: Campus
        obs.meta.unit,          // Column 7: Unit
        obs.meta.lesson,        // Column 8: Lesson
        obs.meta.supportType,   // Column 9: Support Type
        obs.status,             // Column 10: Status
        // Column 11: Trainer Summary (the aggregated notes marked for admin)
        adminExportModel.trainerSummary || "No trainer summary provided." 
        // You can add more columns here if your Admin Excel sheet has them.
    ];
}

/**
 * Coordinated function to save the latest notes, push data to the Admin Excel Log,
 * and optionally send an email.
 */
export async function finalizeAndShareObservation(
    obs: ObservationRecord, // The full observation object including indicators
    trainerProfile: { fullName: string; email: string },
    teacherDetails: TeacherRow, // Details needed for teacher communication
): Promise<void> {
    
    // 1. Mark as 'saved' and save the latest notes to Supabase (uses existing logic)
    await saveObservationToDb({
        id: obs.id,
        meta: obs.meta,
        indicators: obs.indicators,
        status: "saved", 
    });

    // 2. Push data to the Admin's Excel Workbook (requires a valid Admin Workbook URL)
    // NOTE: This URL should be retrieved from a database query, 
    // e.g., from the School record or a central config.
    const adminWorkbookUrl = teacherDetails.worksheet_url; // ⚠️ Placeholder: Assume the teacher's URL is the admin log URL for now, or fetch the Admin's master list URL.
    
    if (!adminWorkbookUrl) {
        throw new Error("Cannot share to Excel: Admin Workbook URL is missing.");
    }

    const excelRow = formatForExcelRow(obs, trainerProfile.fullName);

    console.log(`Attempting to update Admin Excel at: ${adminWorkbookUrl}`);
    await appendRowToWorkbook(
        adminWorkbookUrl,
        "Master Log", // ⚠️ Check the exact sheet name for the master log
        excelRow
    );

    // 3. Send Notification Email to the Teacher (uses existing logic)
    if (teacherDetails.email) {
        const recipients: EmailRecipient[] = [
            { emailAddress: { address: teacherDetails.email } },
            { emailAddress: { address: trainerProfile.email } }, // CC the trainer
        ];
        
        const subject = `Observation Feedback: ${obs.meta.teacherName} (${obs.meta.date})`;
        // You should generate a full HTML report body here, perhaps reusing model data.
        const body = `
            <p>Dear ${obs.meta.teacherName},</p>
            <p>Your observation notes from ${obs.meta.date} have been completed by ${trainerProfile.fullName}.</p>
            <p>Please check your main observation report (you can fetch it via the "Export (teacher)" button).</p>
        `;

        await sendObservationEmail(subject, body, recipients);
    }

    console.log("Observation successfully finalized, logged to Excel, and shared.");
}