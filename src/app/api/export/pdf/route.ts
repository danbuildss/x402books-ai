import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import type { LedgerSummary, CategorySummary, LedgerTransaction } from "@/lib/ledger";

function formatUsdc(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    wallet,
    range,
    summary,
    categories,
    transactions,
    aiSummary,
    generatedAt,
  } = body as {
    wallet: string;
    range: string;
    summary: LedgerSummary;
    categories: CategorySummary[];
    transactions: LedgerTransaction[];
    aiSummary?: string;
    generatedAt?: string;
  };

  const rangeLabel = { "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days" }[range] ?? range;
  const generatedDate = generatedAt ? new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 48, size: "A4" });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on("end", resolve);

    const GREEN = "#4AE8A0";
    const DARK = "#1A1C1A";
    const MUTED = "#6B6960";
    const LINE = "#E2E4E2";
    const W = doc.page.width - 96;

    // Header bar
    doc.rect(0, 0, doc.page.width, 72).fill(DARK);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16).text("Zetta", 48, 22);
    doc.fillColor(GREEN).font("Helvetica").fontSize(10).text("Onchain Ledger Report", 48, 42);
    doc.fillColor("#9CA6A0").fontSize(9).text(`Generated ${generatedDate}`, doc.page.width - 200, 32, { width: 152, align: "right" });

    let y = 90;

    // Wallet + range
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text("Wallet", 48, y);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(wallet, 48, y + 14);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text("Period", 300, y);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(`Last ${rangeLabel}`, 300, y + 14);
    y += 44;

    // Divider
    doc.moveTo(48, y).lineTo(48 + W, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 16;

    // Summary stats — 4 boxes
    const boxW = (W - 18) / 4;
    const stats = [
      { label: "Total Spend", value: `${formatUsdc(summary.totalSpend)} USDC` },
      { label: "Total Income", value: `${formatUsdc(summary.totalIncome)} USDC` },
      { label: "Net Flow", value: `${summary.netFlow >= 0 ? "+" : ""}${formatUsdc(summary.netFlow)} USDC` },
      { label: "Transactions", value: String(summary.transactionCount) },
    ];
    stats.forEach((stat, i) => {
      const bx = 48 + i * (boxW + 6);
      doc.rect(bx, y, boxW, 52).fillColor("#F6F7F5").fill();
      doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(stat.label.toUpperCase(), bx + 10, y + 10);
      const isNegative = stat.label === "Net Flow" && summary.netFlow < 0;
      doc.fillColor(stat.label === "Net Flow" ? (isNegative ? "#B85450" : GREEN) : DARK)
        .font("Helvetica-Bold").fontSize(11)
        .text(stat.value, bx + 10, y + 24, { width: boxW - 20 });
    });
    y += 68;

    // AI Summary
    if (aiSummary) {
      doc.rect(48, y, W, 1).fillColor(LINE).fill();
      y += 12;
      doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(10).text("AI INSIGHT", 48, y);
      y += 14;
      doc.fillColor(DARK).font("Helvetica").fontSize(10)
        .text(aiSummary, 48, y, { width: W, lineGap: 3 });
      y += doc.heightOfString(aiSummary, { width: W }) + 16;
    }

    // Categories
    doc.rect(48, y, W, 1).fillColor(LINE).fill();
    y += 12;
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10).text("CATEGORIES", 48, y);
    y += 14;
    categories.slice(0, 8).forEach((cat) => {
      const pct = summary.totalSpend > 0 ? ((cat.totalUsdc / summary.totalSpend) * 100).toFixed(1) : "0.0";
      const barW = summary.totalSpend > 0 ? Math.max(2, (cat.totalUsdc / summary.totalSpend) * (W - 180)) : 2;
      doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(cat.label, 48, y + 2, { width: 120 });
      doc.rect(175, y + 3, barW, 8).fillColor(GREEN).fill();
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
        .text(`${formatUsdc(cat.totalUsdc)} USDC`, W - 90 + 48, y + 2, { width: 90, align: "right" });
      doc.fillColor(MUTED).font("Helvetica").fontSize(8)
        .text(`${pct}%`, W - 30 + 48, y + 2, { width: 30, align: "right" });
      y += 18;
    });
    y += 8;

    // Transactions table
    if (transactions.length > 0) {
      if (y > doc.page.height - 200) { doc.addPage(); y = 48; }
      doc.rect(48, y, W, 1).fillColor(LINE).fill();
      y += 12;
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10).text("TRANSACTIONS", 48, y);
      y += 14;

      // Header row
      doc.rect(48, y, W, 18).fillColor("#F0F2F0").fill();
      doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8);
      doc.text("DATE", 52, y + 5);
      doc.text("TYPE", 130, y + 5);
      doc.text("CATEGORY", 185, y + 5);
      doc.text("COUNTERPARTY", 290, y + 5);
      doc.text("AMOUNT", W - 30 + 48, y + 5, { width: 70, align: "right" });
      y += 22;

      const txRows = transactions.slice(0, 50);
      txRows.forEach((tx, i) => {
        if (y > doc.page.height - 60) { doc.addPage(); y = 48; }
        if (i % 2 === 0) doc.rect(48, y - 2, W, 16).fillColor("#FAFBFA").fill();
        const date = new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const isIncome = tx.direction === "income";
        doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(date, 52, y + 1);
        doc.fillColor(isIncome ? GREEN : "#B85450").font("Helvetica-Bold").fontSize(8).text(isIncome ? "Income" : "Spend", 130, y + 1);
        doc.fillColor(DARK).font("Helvetica").fontSize(8).text(tx.category ?? "unknown", 185, y + 1, { width: 100 });
        doc.fillColor(MUTED).fontSize(8).text(shortenAddress(tx.counterparty), 290, y + 1, { width: 110 });
        doc.fillColor(isIncome ? GREEN : "#B85450").font("Helvetica-Bold").fontSize(8)
          .text(`${isIncome ? "+" : "-"}${formatUsdc(tx.amountUsdc)}`, W - 30 + 48, y + 1, { width: 70, align: "right" });
        y += 14;
      });

      if (transactions.length > 50) {
        doc.fillColor(MUTED).font("Helvetica").fontSize(8)
          .text(`… and ${transactions.length - 50} more transactions`, 48, y + 6);
      }
    }

    // Footer
    const footerY = doc.page.height - 36;
    doc.rect(0, footerY, doc.page.width, 36).fillColor(DARK).fill();
    doc.fillColor("#9CA6A0").font("Helvetica").fontSize(8)
      .text("Zetta AI · Onchain financial intelligence for Base USDC · zettaai.co", 48, footerY + 14, { width: W, align: "center" });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  const filename = `x402books-${wallet.slice(0, 8)}-${range}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
