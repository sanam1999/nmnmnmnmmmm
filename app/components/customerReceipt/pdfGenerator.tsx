import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "../../hooks/use-toast";

export interface CurrencyRow {
  id: string;
  currencyType: string;
  amountReceived: string;
  rate: string;
  amountIssued: string;
}

export interface PDFData {
  serialNo: string;
  date: string;
  customerName: string;
  nicPassport: string;
  sources: string[];
  otherSource: string;
  rows: CurrencyRow[];
}

// ================================
// PDF Generation Function (A5 Size)
// ================================
export const generatePDF = (
  {
    serialNo,
    date,
    customerName,
    nicPassport,
    sources,
    otherSource,
    rows,
  }: PDFData,
  downloadOnClient: boolean = false
): string | undefined => {
  // Input validation
  if (!customerName || !nicPassport || sources.length === 0) {
    toast({
      title: "Missing Information",
      description:
        "Please fill in all required customer details and source of currency.",
      variant: "destructive",
    });
    return;
  }

  // Change to A5 size (148 x 210 mm) - portrait orientation
  const doc = new jsPDF("p", "mm", "a5");
  const pageWidth = doc.internal.pageSize.getWidth(); // 148 mm for A5
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm for A5
  const margin = 10; // Reduced margin for smaller paper
  const bodyWidth = pageWidth - 2 * margin;

  // Set initial Y position
  let currentY = 45; // Adjusted for smaller paper
  const boxHeight = 6; // Slightly smaller boxes

  const logoImg = new Image();
  logoImg.src = "/logo.png";

  // --- Logo Placement (smaller) ---
  doc.addImage(logoImg, "PNG", margin, 5, 30, 30); // Smaller logo

  // --- Header Section (adjusted font sizes) ---
  let headerY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12); // Reduced from 14
  doc.text("PEARL CITY HOTEL (PVT) LTD", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 5;

  doc.setFontSize(10); // Reduced from 12
  doc.text("AUTHORIZED FOREIGN MONEY CHANGER", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8); // Reduced from 10
  doc.text("17, Bauddhaloka Mawatha, Colombo - 04", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 4;
  doc.text("Tel 011 4523800 (Auto Lines)", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 4;
  
  // Split long text into two lines
  const emailText = "E-mail : moneyexchange@pearlgrouphotels.com";
  const websiteText = "Website : pearlgrouphotels.com";
  doc.text(emailText, pageWidth / 2, headerY, { align: "center" });
  headerY += 4;
  doc.text(websiteText, pageWidth / 2, headerY, { align: "center" });

  // --- Permit, Serial, Date ---
  const lineY = currentY - 4;
  const boxWidth = 35; // Smaller boxes
  const boxX = pageWidth - margin - boxWidth;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9); // Slightly smaller font

  // Permit No.
  doc.text("Permit No. :", margin, currentY);
  const permitNoText = "DFE/RD/6000";
  doc.text(permitNoText, margin + 22, currentY);
  doc.line(margin + 21.5, currentY + 0.5, margin + 50, currentY + 0.5);

  // Serial No.
  doc.text("Serial No", boxX - 20, currentY);
  doc.rect(boxX, lineY, boxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(serialNo || "", boxX + 2, currentY - 1);

  currentY += 7;

  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date", boxX - 20, currentY);
  doc.rect(boxX, lineY + 7, boxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(date, boxX + 2, currentY - 1);

  currentY += 7;

  // --- Customer Info ---
  const labelX = margin;
  const infoBoxX = margin + 45; // Adjusted for smaller paper
  const infoBoxWidth = pageWidth - infoBoxX - margin;
  const lineHeight = 8; // Reduced line height

  // Name
  doc.setFont("helvetica", "bold");
  doc.text("NAME OF THE CUSTOMER", labelX, currentY);
  doc.rect(infoBoxX, currentY - 4, infoBoxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(customerName, infoBoxX + 2, currentY - 1);
  currentY += lineHeight;

  // NIC/Passport
  doc.setFont("helvetica", "bold");
  doc.text("NIC/PASSPORT NO", labelX, currentY);
  doc.rect(infoBoxX, currentY - 4, infoBoxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(nicPassport, infoBoxX + 2, currentY - 1);
  currentY += lineHeight;

  // --- Source of Foreign Currency ---
  currentY += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Source of Foreign Currency", labelX, currentY);
  currentY += 4;

  const sourcesText = [
    { key: "Persons return for vacation from foreign employment", label: "a) Persons return for vacation from foreign employment" },
    { key: "Relatives of those employees abroad", label: "b) Relatives of those employees abroad" },
    { key: "Foreign tourists (Directly or through tour guides)", label: "c) Foreign tourists (Directly or through tour guides)" },
    { key: "Unutilized foreign currency obtained for travel purpose by residents", label: "d) Unutilized foreign currency obtained for travel purpose by residents" },
    { key: "Other", label: "e) Other" },
  ];

  const checkboxX = pageWidth - margin - 6;
  const checkboxSize = 4;
  const otherBoxWidth = 40;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8); // Smaller font for options
  sourcesText.forEach((src) => {
    const isChecked = sources.includes(src.key);
    doc.text(src.label, labelX, currentY);

    doc.rect(checkboxX, currentY - 3, checkboxSize, checkboxSize);

    if (isChecked) {
      doc.setFontSize(8);
      doc.text("X", checkboxX + checkboxSize / 2, currentY - 0.5, {
        align: "center",
      });
    }

    if (src.key === "Other") {
      doc.rect(labelX + 12, currentY - 3, otherBoxWidth, checkboxSize);
      doc.text(otherSource, labelX + 14, currentY - 0.5);

      doc.setFontSize(6);
      doc.text(
        "If other specify",
        labelX + 12 + otherBoxWidth + 2,
        currentY - 0.2
      );
    }

    currentY += 5;
  });

  currentY += 4;

  // --- Helper: Number Formatter ---
  const formatAmount = (val: string | number | undefined): string => {
    if (val === undefined || val === null || val === "") return "";
    const num = Number(val);
    if (isNaN(num)) return val.toString();
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // --- Currency Table ---
  const tableHeaders = [
    ["Currency Type", "Amount Received", "Rate", "Amount Issued"],
  ];

  const tableData = rows.map((r) => [
    r.currencyType || "",
    formatAmount(r.amountReceived),
    formatAmount(r.rate),
    formatAmount(r.amountIssued),
  ]);

  for (let i = tableData.length; i < 3; i++) {
    tableData.push(["", "", "", ""]);
  }

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableData.slice(0, 3),
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8, // Smaller font for table
      cellPadding: 1.5, // Less padding
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      halign: "center",
      fontStyle: "normal",
    },
    bodyStyles: {
      textColor: 0,
    },
    columnStyles: {
      0: { cellWidth: bodyWidth * 0.25, halign: "left" },
      1: { cellWidth: bodyWidth * 0.25, halign: "right" },
      2: { cellWidth: bodyWidth * 0.25, halign: "right" },
      3: { cellWidth: bodyWidth * 0.25, halign: "right" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY;
  currentY = finalY + 20;

  // --- Signature Sections ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const signatureLineY = currentY - 2;
  const signatureLineLength = bodyWidth * 0.4;
  const signatureGap = 4;

  // Customer Signature
  const customerSigX = margin;
  doc.line(
    customerSigX,
    signatureLineY,
    customerSigX + signatureLineLength,
    signatureLineY
  );
  doc.text(
    "Customer Signature",
    customerSigX + 5,
    signatureLineY + signatureGap
  );

  // Money Changer Signature
  const changerSigX = pageWidth - margin - signatureLineLength;
  doc.line(
    changerSigX,
    signatureLineY,
    changerSigX + signatureLineLength,
    signatureLineY
  );
  doc.text(
    "Money Changer Signature & Stamp",
    changerSigX + 2,
    signatureLineY + signatureGap
  );

  // --- Return Base64 or initiate client download ---
  if (downloadOnClient) {
    doc.save(`Receipt-${serialNo || Date.now()}.pdf`);
    toast({
      title: "PDF Generated",
      description: `Receipt downloaded for ${customerName}`,
    });
    return undefined;
  }

  // Return Base64 string for server storage
  return doc.output("datauristring").split("base64,")[1];
};