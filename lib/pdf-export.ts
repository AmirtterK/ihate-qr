// Client-side A4 Print Sheet PDF Generator

export interface PrintSheetOptions {
  codeSizeMm: number;    // default 60
  columns: number;       // default 3
  count: number;         // default 12
  includeCutLines: boolean;
  qrPngDataUrl: string;
  label?: string;
}

export async function exportToA4Pdf(options: PrintSheetOptions): Promise<void> {
  const { codeSizeMm, columns, count, includeCutLines, qrPngDataUrl, label = '' } = options;

  // Dynamically load jsPDF or check window.jspdf
  let jsPDFClass: any;
  if (typeof window !== 'undefined' && (window as any).jspdf) {
    jsPDFClass = (window as any).jspdf.jsPDF;
  } else {
    try {
      const jspdfModule = await import('jspdf');
      jsPDFClass = jspdfModule.jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default;
    } catch {
      throw new Error('jsPDF library could not be loaded. Please ensure internet access or script tag is available.');
    }
  }

  const doc = new jsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginY = 15;

  const printableWidth = pageWidth - 2 * marginX;
  const printableHeight = pageHeight - 2 * marginY;

  // Compute spacing
  const colGap = columns > 1 ? (printableWidth - columns * codeSizeMm) / (columns - 1) : 0;
  // Calculate rows per page based on codeSize + label
  const itemHeight = codeSizeMm + (label ? 8 : 4);
  const rowsPerPage = Math.max(1, Math.floor(printableHeight / itemHeight));
  const rowGap = rowsPerPage > 1 ? (printableHeight - rowsPerPage * itemHeight) / (rowsPerPage - 1) : 6;

  const itemsPerPage = columns * rowsPerPage;

  let currentItem = 0;
  let pageNum = 1;

  while (currentItem < count) {
    if (pageNum > 1) {
      doc.addPage();
    }

    // Header on top
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Mixed Palette QR Studio — A4 Print Sheet (Page ${pageNum})`, marginX, 8);

    const startIndex = currentItem;
    const pageItems = Math.min(itemsPerPage, count - startIndex);

    for (let i = 0; i < pageItems; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;

      const x = marginX + col * (codeSizeMm + colGap);
      const y = marginY + row * (itemHeight + rowGap);

      // Draw QR Image
      doc.addImage(qrPngDataUrl, 'PNG', x, y, codeSizeMm, codeSizeMm);

      // Optional Cut Guidelines
      if (includeCutLines) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineDashPattern([1, 2], 0);
        doc.rect(x - 1, y - 1, codeSizeMm + 2, itemHeight);

        // Subtle corner markers
        const markerLen = 2.5;
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([], 0);
        // Top-left
        doc.line(x - 2, y - 2, x - 2 + markerLen, y - 2);
        doc.line(x - 2, y - 2, x - 2, y - 2 + markerLen);
        // Top-right
        doc.line(x + codeSizeMm + 2, y - 2, x + codeSizeMm + 2 - markerLen, y - 2);
        doc.line(x + codeSizeMm + 2, y - 2, x + codeSizeMm + 2, y - 2 + markerLen);
        // Bottom-left
        doc.line(x - 2, y + itemHeight, x - 2 + markerLen, y + itemHeight);
        doc.line(x - 2, y + itemHeight, x - 2, y + itemHeight - markerLen);
        // Bottom-right
        doc.line(x + codeSizeMm + 2, y + itemHeight, x + codeSizeMm + 2 - markerLen, y + itemHeight);
        doc.line(x + codeSizeMm + 2, y + itemHeight, x + codeSizeMm + 2, y + itemHeight - markerLen);
      }

      // Optional text label under code
      if (label) {
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        const truncatedLabel = label.length > 32 ? label.substring(0, 30) + '...' : label;
        doc.text(truncatedLabel, x + codeSizeMm / 2, y + codeSizeMm + 4, { align: 'center' });
      }

      currentItem++;
    }

    pageNum++;
  }

  doc.save(`qr-print-sheet-a4-${count}codes.pdf`);
}
