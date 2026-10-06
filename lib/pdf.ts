"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { business } from "./config";
import { dateBR, money } from "./format";
import { ServiceOrder, statusLabels } from "./types";

let logoDataUrl: string | null = null;

async function loadLogo() {
  if (logoDataUrl) return logoDataUrl;
  try {
    const response = await fetch("/images/logo-lh.jpeg");
    if (!response.ok) return null;
    const blob = await response.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return logoDataUrl;
  } catch {
    return null;
  }
}

function createdDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function renderOrderPdf(order: ServiceOrder, logo: string | null, compactLevel: number) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const vehicle = order.vehicle;
  const customer = order.customer;
  const items = order.items || [];
  const filename = `${order.order_number}-${vehicle?.plate || "veiculo"}.pdf`;
  const downPayment = Number(order.down_payment || 0);
  const balanceDue = Math.max(Number(order.total) - downPayment, 0);
  const warranty = order.warranty?.trim() || "Não informada";
  const warrantyHighlight = warranty === "Não informada" ? "GARANTIA NÃO INFORMADA" : warranty.toLowerCase().startsWith("sem ") ? warranty.toUpperCase() : `GARANTIA DE ${warranty.toUpperCase()}`;
  const subtotalBeforeDiscount = Number(order.parts_total) + Number(order.labor_total);

  const density = [
    { tableFont: 7.8, pad: 1.5, narrativeFont: 7.5, narrativePad: 1.5, financeH: 32 },
    { tableFont: 6.8, pad: 1.1, narrativeFont: 6.8, narrativePad: 1.1, financeH: 32 },
    { tableFont: 5.9, pad: 0.8, narrativeFont: 6.1, narrativePad: 0.8, financeH: 32 },
  ][Math.min(compactLevel, 2)];

  doc.setFillColor(185, 20, 36);
  doc.rect(0, 0, 210, 4, "F");

  if (logo) {
    try {
      doc.addImage(logo, "JPEG", 14, 8, 30, 20, undefined, "FAST");
    } catch {
      // Mantém o cabeçalho textual caso a imagem falhe.
    }
  }

  doc.setTextColor(17, 24, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ORDEM DE SERVIÇO", 50, 13);
  doc.setFontSize(10.5);
  doc.text(business.name, 50, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(84, 92, 101);
  doc.text(`${business.phone}  •  ${business.email}`, 50, 25);
  doc.text(business.address, 50, 29);

  doc.setTextColor(17, 24, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(order.order_number, 196, 13, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(185, 20, 36);
  doc.text(statusLabels[order.status].toUpperCase(), 196, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(95, 102, 110);
  doc.text(`Criada em ${createdDate(order.created_at)}`, 196, 25, { align: "right" });

  doc.setDrawColor(222, 224, 226);
  doc.line(14, 34, 196, 34);

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14 },
    theme: "grid",
    body: [
      ["CLIENTE", customer?.name || "—", "CPF/CNPJ", customer?.document || "—"],
      ["TELEFONE", customer?.phone || "—", "E-MAIL", customer?.email || "—"],
      ["PLACA", vehicle?.plate || "—", "VEÍCULO", `${vehicle?.brand || ""} ${vehicle?.model || ""}`.trim() || "—"],
      ["ANO / COR", `${vehicle?.year || "—"} / ${vehicle?.color || "—"}`, "QUILOMETRAGEM", `${order.mileage?.toLocaleString("pt-BR") || "—"} km`],
      ["ENTRADA DO VEÍCULO", dateBR(order.entry_date), "PREVISÃO DE ENTREGA", dateBR(order.expected_delivery_date)],
      ["ENDEREÇO", customer?.address || "—", "STATUS", statusLabels[order.status]],
    ],
    styles: {
      fontSize: density.tableFont,
      cellPadding: density.pad,
      textColor: [34, 40, 47],
      lineColor: [225, 227, 229],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 31, fontStyle: "bold", textColor: [105, 112, 120], fillColor: [248, 248, 247] },
      1: { cellWidth: 60 },
      2: { cellWidth: 34, fontStyle: "bold", textColor: [105, 112, 120], fillColor: [248, 248, 247] },
      3: { cellWidth: 57 },
    },
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 76) + 4;
  const narrativeRows: string[][] = [["PROBLEMA RELATADO", order.reported_problem || "—"]];
  if (order.diagnosis) narrativeRows.push(["DIAGNÓSTICO", order.diagnosis]);
  if (order.notes) narrativeRows.push(["OBSERVAÇÕES", order.notes]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    body: narrativeRows,
    styles: {
      fontSize: density.narrativeFont,
      cellPadding: density.narrativePad,
      textColor: [42, 48, 55],
      lineColor: [226, 228, 230],
      lineWidth: 0.2,
      valign: "top",
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 37, fontStyle: "bold", textColor: [92, 99, 107], fillColor: [248, 248, 247] },
      1: { cellWidth: 145 },
    },
  });

  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 4;
  doc.setFillColor(255, 244, 240);
  doc.setDrawColor(238, 205, 197);
  doc.roundedRect(14, y, 182, 9, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(153, 39, 25);
  doc.text(warrantyHighlight, 18, y + 5.8);
  y += 13;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14, bottom: 47 },
    head: [["ITEM / SERVIÇO", "QTD.", "PREÇO", "VALOR"]],
    body: items.length
      ? items.map((item) => [
          item.description,
          Number(item.quantity).toLocaleString("pt-BR"),
          money(item.unit_price),
          money(item.subtotal),
        ])
      : [["Nenhum item lançado", "—", "—", "—"]],
    styles: {
      fontSize: density.tableFont,
      cellPadding: density.pad,
      lineColor: [226, 228, 230],
      lineWidth: 0.2,
      textColor: [35, 41, 47],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [17, 24, 32],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 104 },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
  const financeY = finalY + 4;
  const financeH = density.financeH;

  doc.setFillColor(248, 248, 247);
  doc.setDrawColor(224, 226, 228);
  doc.roundedRect(14, financeY, 86, financeH, 2, 2, "FD");
  doc.roundedRect(104, financeY, 92, financeH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(82, 89, 97);
  doc.text("PAGAMENTO / CONDIÇÕES", 18, financeY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 36, 43);
  doc.text("Entrada paga", 18, financeY + 13);
  doc.text(money(downPayment), 96, financeY + 13, { align: "right" });
  doc.text("Saldo na retirada", 18, financeY + 19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(185, 20, 36);
  doc.text(money(balanceDue), 96, financeY + 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 77, 85);
  doc.setFontSize(7.3);
  doc.text(`Garantia: ${warranty}`, 18, financeY + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(82, 89, 97);
  doc.text("RESUMO FINANCEIRO", 108, financeY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 36, 43);
  doc.text("Serviços / peças", 108, financeY + 12);
  doc.text(money(subtotalBeforeDiscount), 192, financeY + 12, { align: "right" });
  doc.text("Desconto", 108, financeY + 17);
  doc.text(money(order.discount), 192, financeY + 17, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL DA OS", 108, financeY + 23);
  doc.text(money(order.total), 192, financeY + 23, { align: "right" });
  doc.setTextColor(185, 20, 36);
  doc.text("SALDO RESTANTE", 108, financeY + 29);
  doc.text(money(balanceDue), 192, financeY + 29, { align: "right" });

  const signatureY = financeY + financeH + 9;
  if (signatureY < 279) {
    doc.setDrawColor(145, 150, 156);
    doc.line(18, signatureY, 88, signatureY);
    doc.line(122, signatureY, 192, signatureY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(105, 111, 118);
    doc.text("Assinatura do cliente", 53, signatureY + 5, { align: "center" });
    doc.text("Responsável pela oficina", 157, signatureY + 5, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(130, 135, 141);
  doc.text(`Documento gerado em ${new Date().toLocaleString("pt-BR")} • ${business.shortName}`, 105, 292, { align: "center" });

  return { doc, filename };
}

async function buildOrderPdf(order: ServiceOrder) {
  const logo = await loadLogo();
  let rendered = renderOrderPdf(order, logo, 0);
  if (rendered.doc.getNumberOfPages() === 1) return rendered;

  rendered = renderOrderPdf(order, logo, 1);
  if (rendered.doc.getNumberOfPages() === 1) return rendered;

  return renderOrderPdf(order, logo, 2);
}

export async function createOrderPdfFile(order: ServiceOrder) {
  const { doc, filename } = await buildOrderPdf(order);
  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function downloadOrderPdf(order: ServiceOrder) {
  const { doc, filename } = await buildOrderPdf(order);
  doc.save(filename);
}
