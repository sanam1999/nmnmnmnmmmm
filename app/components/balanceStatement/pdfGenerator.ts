import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Re-using the interfaces from BalanceStatement.tsx
interface CurrencyBalance {
  currencyType: string;
  openingBalance: string;
  purchases: string;
  exchangeBuy: string;
  exchangeSell: string;
  sales: string;
  deposits: string;
  closingBalance: string;
}

export interface BalanceStatementPDFData {
  fromDate: string;
  toDate: string;
  balances: CurrencyBalance[];
}

/**
 * Generates and downloads the Balance Statement PDF report.
 * @param data The data object containing dates and balance rows.
 */
export const generateBalanceStatementPDF = (data: BalanceStatementPDFData) => {
  // Use 'l' for landscape mode and 'mm' units
  const doc = new jsPDF("l", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Refined Margins (15mm on all sides for a cleaner border)
  const margin = 15;

  // Calculate a reduced table width (80% of the page width) and center it
  const tablePercentage = 0.80;
  const tableWidth = pageWidth * tablePercentage;
  // This calculates the margin needed on the left and right to center the table
  const tableStartX = (pageWidth - tableWidth) / 2;

  // Start the content draw slightly inside the margin for visual clearance
  // The first line of text should start a few mm below the top margin line.
  let currentY = margin + 20; 
  const subHeaderFontSize = 10;
  const tableFontSize = 9;

  // --- Header Section ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  // Ensure header text is drawn within the margins
  doc.text("PEARL CITY HOTEL (PVT) LTD", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 6;

  doc.setFontSize(12);
  doc.text("AUTHORIZED FOREIGN MONEY CHANGER", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("17, Bauddhaloka Mawatha, Colombo - 04", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 5;
  doc.text("Tel 011 4523800 (Auto Lines)", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 5;
  doc.text(
    "E-mail : moneyexchange@pearlgrouphotels.com - Website : pearlgrouphotels.com",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  currentY += 25; // Space after header block

  // Date Range
  doc.setFont("helvetica", "normal");
  doc.setFontSize(subHeaderFontSize);
  const dateText = `Balance Statement from ${data.fromDate} to ${data.toDate}`;

  // Align the date text to the left at the table's starting X position (tableStartX)
  doc.text(dateText, tableStartX, currentY, {
    align: "left",
  });
  currentY += 10;

  // --- Table Data Setup ---

  const finalHeaders = [
    [
      "Currency Type",
      `Opening Balance\n(a)`,
      `Purchases\n(b)`,
      `Exchange-Buy\n(c)`,
      `Exchange-Sell\n(d)`,
      `Sales\n(e)`,
      `Deposits/Sales to the Authorized Dealer\n(f)`,
      `Closing Balance\n(a)+(b)+(c)-(d)-(e)-(f)`,
    ],
  ];

  const tableBody = data.balances.map((b) => [
    b.currencyType,
    b.openingBalance,
    b.purchases,
    b.exchangeBuy,
    b.exchangeSell,
    b.sales,
    b.deposits,
    b.closingBalance,
  ]);

  // --- Generate Table ---
  autoTable(doc, {
    startY: currentY,
    head: finalHeaders,
    body: tableBody,
    theme: "grid",

    // Apply reduced width and centering
    tableWidth: tableWidth,
    margin: { left: tableStartX, right: tableStartX },

    // Global Styles
    styles: {
      fontSize: tableFontSize,
      cellPadding: 1.5,
      lineWidth: 0.1,
      lineColor: [100, 100, 100],
      valign: "middle",
    },

    // Header Specific Styles
    headStyles: {
      fillColor: [210, 210, 210],
      textColor: 0,
      fontStyle: "bold",
      minCellHeight: 14,
      halign: "center",
    },

    // Body Specific Styles
    bodyStyles: {
      textColor: 0,
      halign: "right", // Default alignment to right for numeric data
    },

    // Column Specific Styles (Reduces unnecessary width in numeric columns)
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 'auto' },
    },
  });

  // --- 2. Draw Page Border (FIX: Moved to the end to enclose all content) ---
  // Set the border style
  doc.setDrawColor(0); // Black color for the border
  doc.setLineWidth(0.5); // Thin line width (0.5mm)
  // Draw a rectangle from (margin, margin) to (pageWidth - margin, pageHeight - margin)
  doc.rect(
    margin,
    margin,
    pageWidth - 2 * margin, // Width of the rectangle
    pageHeight - 2 * margin // Height of the rectangle
  );

  // --- Final Download ---
  const fileName = `Balance-Statement-${data.fromDate}-to-${data.toDate}.pdf`;
  doc.save(fileName);
};