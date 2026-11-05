import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TimeEntryWithProject } from '@/lib/database.types';
import { formatMinutes, minutesToHours } from '@/lib/utils';

interface ReportOptions {
  projectName: string;
  from: string; // YYYY-MM-DD (empty string = no lower bound)
  to: string; // YYYY-MM-DD (empty string = no upper bound)
  entries: TimeEntryWithProject[];
}

function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeOnly(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

// Builds a per-project time report PDF (overall hours + one row per task) and
// triggers a browser download. Runs entirely client-side.
export function generateProjectReportPdf({ projectName, from, to, entries }: ReportOptions): void {
  const doc = new jsPDF();
  const marginX = 14;

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const rangeLabel =
    from || to ? `${from || '…'}  to  ${to || '…'}` : 'All time';

  doc.setFontSize(18);
  doc.text('Time Report', marginX, 20);

  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`Project: ${projectName}`, marginX, 30);
  doc.text(`Period: ${rangeLabel}`, marginX, 37);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(
    `Total: ${formatMinutes(totalMinutes)} (${minutesToHours(totalMinutes)} hours) across ${entries.length} task${
      entries.length === 1 ? '' : 's'
    }`,
    marginX,
    46,
  );

  autoTable(doc, {
    startY: 52,
    head: [['Date', 'Task', 'Description', 'Start', 'End', 'Duration']],
    body: entries.map((e) => [
      dateOnly(e.started_at),
      e.title,
      e.description ?? '',
      timeOnly(e.started_at),
      timeOnly(e.ended_at),
      formatMinutes(e.duration_minutes ?? 0),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 2: { cellWidth: 50 } },
  });

  const fromPart = from || 'start';
  const toPart = to || 'end';
  doc.save(`${slugify(projectName)}-time-report-${fromPart}_${toPart}.pdf`);
}
