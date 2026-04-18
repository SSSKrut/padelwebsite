import { toast } from "sonner";
import { parseFileNameFromContentDisposition, triggerBlobDownload } from "@/lib/downloadFile";

export async function exportEventCsv(eventId: string): Promise<void> {
  const response = await fetch(
    `/.netlify/functions/admin-db-export-csv?eventId=${encodeURIComponent(eventId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    let message = "Failed to export event data";
    try {
      const body = await response.json();
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep fallback message for non-JSON error responses.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const fileName = parseFileNameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    "event_export.xlsx",
  );
  triggerBlobDownload(blob, fileName);
  toast.success("Event export started");
}
