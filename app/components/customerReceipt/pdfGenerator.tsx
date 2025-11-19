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
// PDF Generation Function (Final)
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

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const bodyWidth = pageWidth - 2 * margin;

  // Set initial Y lower to leave space for header block
  let currentY = 55;
  const boxHeight = 7;

  const logoImg = new Image();
  logoImg.src = "/logo.png";

  // --- Logo Placement ---
  doc.addImage(logoImg, "PNG", 15, 5, 40, 40);

  // --- Header Section ---
  let headerY = 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PEARL CITY HOTEL (PVT) LTD", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 6;

  doc.setFontSize(12);
  doc.text("AUTHORIZED FOREIGN MONEY CHANGER", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("17, Bauddhaloka Mawatha, Colombo - 04", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 5;
  doc.text("Tel 011 4523800 (Auto Lines)", pageWidth / 2, headerY, {
    align: "center",
  });
  headerY += 5;
  doc.text(
    "E-mail : moneyexchange@pearlgrouphotels.com - Website : pearlgrouphotels.com",
    pageWidth / 2,
    headerY,
    { align: "center" }
  );

  // --- Permit, Serial, Date ---
  const lineY = currentY - 5;
  const boxWidth = 40;
  const boxX = pageWidth - margin - boxWidth;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  // Permit No.
  doc.text("Permit No. :", margin, currentY);
  const permitNoText = "DFE/RD/6000";
  doc.text(permitNoText, margin + 25, currentY);
  doc.line(margin + 24.5, currentY + 0.5, margin + 60, currentY + 0.5);

  // Serial No.
  doc.text("Serial No", boxX - 25, currentY);
  doc.rect(boxX, lineY, boxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(serialNo || "", boxX + 2, currentY - 1);

  currentY += 8;

  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date", boxX - 25, currentY);
  doc.rect(boxX, lineY + 8, boxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(date, boxX + 2, currentY - 1);

  currentY += 8;

  // --- Customer Info ---
  const labelX = margin;
  const infoBoxX = margin + 55;
  const infoBoxWidth = pageWidth - infoBoxX - margin;
  const lineHeight = 10;

  // Name
  doc.setFont("helvetica", "bold");
  doc.text("NAME OF THE CUSTOMER", labelX, currentY);
  doc.rect(infoBoxX, currentY - 5, infoBoxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(customerName, infoBoxX + 2, currentY - 1);
  currentY += lineHeight;

  // NIC/Passport
  doc.setFont("helvetica", "bold");
  doc.text("NIC/PASSPORT NO", labelX, currentY);
  doc.rect(infoBoxX, currentY - 5, infoBoxWidth, boxHeight);
  doc.setFont("helvetica", "normal");
  doc.text(nicPassport, infoBoxX + 2, currentY - 1);
  currentY += lineHeight;

  // --- Source of Foreign Currency ---
  currentY += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Source of Foreign Currency", labelX, currentY);
  currentY += 5;

  const sourcesText = [
    { key: "Persons return for vacation from foreign employment", label: "a) Persons return for vacation from foreign employment" },
    { key: "Relatives of those employees abroadives", label: "b) Relatives of those employees abroad" },
    { key: "Foreign tourists (directly or through tour guides)", label: "c) Foreign tourists (directly or through tour guides)" },
    { key: "Unutilized foreign currency obtained for travel purpose by residents", label: "d) Unutilized foreign currency obtained for travel purpose by residents" },
    { key: "Other", label: "e) Other" },
  ];

  const checkboxX = pageWidth - margin - 8;
  const checkboxSize = 5;
  const otherBoxWidth = 50;

  doc.setFont("helvetica", "normal");
  sourcesText.forEach((src) => {
    const isChecked = sources.includes(src.key);
    doc.text(src.label, labelX, currentY);

    doc.rect(checkboxX, currentY - 4, checkboxSize, checkboxSize);

    if (isChecked) {
      doc.setFontSize(10);
      doc.text("X", checkboxX + checkboxSize / 2, currentY - 1, {
        align: "center",
      });
      doc.setFontSize(10);
    }

    if (src.key === "Other") {
      doc.rect(labelX + 15, currentY - 4, otherBoxWidth, checkboxSize);
      doc.text(otherSource, labelX + 17, currentY - 1);

      doc.setFontSize(8);
      doc.text(
        "If other specify",
        labelX + 15 + otherBoxWidth + 2,
        currentY - 0.5
      );
      doc.setFontSize(10);
    }

    currentY += 6;
  });

  currentY += 5;

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
    ["Currency Type", "Amount Received in (FCY)", "Rate Offered", "Amount Issued"],
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
      fontSize: 10,
      cellPadding: 2,
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
  currentY = finalY + 30;

  // --- Signature Sections ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const signatureLineY = currentY - 2;
  const signatureLineLength = bodyWidth * 0.45;
  const signatureGap = 5;

  // Customer Signature
  const customerSigX = margin;
  doc.line(
    customerSigX,
    signatureLineY,
    customerSigX + signatureLineLength,
    signatureLineY
  );
  doc.text(
    "Signature of the customer",
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
    "Signature & the stamp of the money changer",
    changerSigX + 5,
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
