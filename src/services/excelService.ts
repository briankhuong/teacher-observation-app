// src/services/excelService.ts
import { getGraphAccessToken } from "./graphToken";

// Base URL for the Microsoft Graph API
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Appends a row of data (the observation notes) to a specific Excel sheet.
 * @param workbookUrl The OneDrive/SharePoint URL or path to the workbook.
 * @param sheetName The name of the worksheet (e.g., "Notes Log").
 * @param rowData An array of strings/numbers representing the new row.
 */
export async function appendRowToWorkbook(
    workbookUrl: string, 
    sheetName: string, 
    rowData: (string | number | Date)[]
): Promise<void> {
    const accessToken = await getGraphAccessToken();

    // ⚠️ You must convert the workbook URL/path into a Graph API endpoint.
    // This is often the hardest part: /drives/{drive-id}/items/{item-id}/workbook/worksheets/{sheetName}/tables/{tableName}/rows/add
    // For simplicity, let's assume workbookUrl is actually the item-id or drive item path.
    // Example endpoint for adding a row: 
    // /me/drive/root:/path/to/workbook.xlsx:/workbook/worksheets('Sheet1')/tables('Table1')/rows
    
    // --- Simplified Endpoint (Adjust as needed for your specific workbook location) ---
    // Assuming workbookUrl is a standard link to the item, use the /shares endpoint or /drive/items
    const itemId = workbookUrl; // Replace with logic to extract Item ID

    const endpoint = `${GRAPH_API_BASE}/me/drive/items/${itemId}/workbook/worksheets('${sheetName}')/tables('ObservationData')/rows`;
    // ---------------------------------------------------------------------------------

    const payload = {
        values: [rowData], // array of rows to append
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        console.error("Graph API Excel Error Response:", await response.text());
        throw new Error(`Failed to append row to Excel: ${response.statusText}`);
    }

    console.log(`Successfully appended row to ${sheetName} in workbook.`);
}