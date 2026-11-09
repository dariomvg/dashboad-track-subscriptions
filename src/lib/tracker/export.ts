import { dashboardContent, exportContent } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import { getMonthStart, getNextChargeDate } from "./dates";
import { computeTotals } from "./totals";
import type { Service } from "./types";

function buildRows(services: Service[], today: string): string[][] {
  const monthStart = getMonthStart(today);

  return services.map((service) => [
    service.title,
    service.category,
    service.amount.toFixed(2),
    service.currency,
    dashboardContent.cycleLabels[service.billingCycle],
    getNextChargeDate(service.nextBillingDate, service.billingCycle, today),
    dashboardContent.statusLabels[service.status],
    service.lastPaidMonth === monthStart ? exportContent.yes : exportContent.no,
  ]);
}

/** Quotes the cell and neutralizes spreadsheet formulas (CSV injection). */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileName(today: string, extension: string): string {
  return `${exportContent.filePrefix}-${today.slice(0, 7)}.${extension}`;
}

export function exportServicesCsv(services: Service[], today: string): void {
  const rows = [[...exportContent.headers], ...buildRows(services, today)];
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName(today, "csv"));
}

export async function exportServicesPdf(services: Service[], today: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(`${exportContent.pdfTitle} (${today.slice(0, 7)})`, 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [[...exportContent.headers]],
    body: buildRows(services, today),
    styles: { fontSize: 9 },
  });

  const totals = computeTotals(services, getMonthStart(today));
  if (totals.length > 0) {
    const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    autoTable(doc, {
      startY: (lastTable?.finalY ?? 22) + 10,
      head: [[...exportContent.totalsHeaders]],
      body: totals.map((total) => [
        total.currency,
        formatMoney(total.total, total.currency),
        formatMoney(total.paid, total.currency),
        String(total.count),
      ]),
      styles: { fontSize: 9 },
    });
  }

  doc.save(fileName(today, "pdf"));
}
