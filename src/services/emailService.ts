// src/services/emailService.ts
import { getGraphAccessToken } from "./graphToken";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export interface EmailRecipient {
    emailAddress: {
        address: string;
    };
}

export async function sendObservationEmail(
    subject: string,
    bodyHtml: string,
    toRecipients: EmailRecipient[],
): Promise<void> {
    const accessToken = await getGraphAccessToken();

    const endpoint = `${GRAPH_API_BASE}/me/sendMail`;

    const emailPayload = {
        message: {
            subject: subject,
            body: {
                contentType: "html",
                content: bodyHtml,
            },
            toRecipients: toRecipients,
        },
        saveToSentItems: true, // Recommended: save a copy in the trainer's Sent Items folder
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
    });

    if (response.status !== 202) { // 202 Accepted means email is queued for sending
        console.error("Graph API Email Error Response:", await response.text());
        throw new Error(`Failed to send email: ${response.statusText}`);
    }

    console.log(`Successfully queued email: ${subject}`);
}