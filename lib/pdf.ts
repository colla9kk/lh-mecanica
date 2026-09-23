"use client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { business } from "./config";
import { dateBR, money } from "./format";
import { ServiceOrder, statusLabels } from "./types";

function buildOrderPdf(order: ServiceOrder) {
  const doc = new jsPDF();
  const vehicle = order.vehicle;
  const customer = order.customer;
  const items = order.items || [];
  const filename = `${order.order_number}-${vehicle?.plate || "veiculo"}.pdf`;

  doc.setFillColor(14, 19, 27); doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text(business.name, 14, 15);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${business.phone} • ${business.address}`, 14, 23);
  doc.text(`ORDEM DE SERVIÇO ${order.order_number}`, 196, 15, { align: "right" });
  doc.text(statusLabels[order.status].toUpperCase(), 196, 23, { align: "right" });

  doc.setTextColor(24); doc.setFontSize(10);
  doc.text(`Entrada: ${dateBR(order.entry_date)}`, 14, 45);
  doc.text(`Previsão: ${dateBR(order.expected_delivery_date)}`, 74, 45);
  doc.text(`Quilometragem: ${order.mileage?.toLocaleString("pt-BR") || "—"} km`, 140, 45);

  doc.setFont("helvetica", "bold"); doc.text("CLIENTE", 14, 56);
  doc.setFont("helvetica", "normal"); doc.text(customer?.name || "—", 14, 63); doc.text(customer?.phone || "—", 14, 69);

  doc.setFont("helvetica", "bold"); doc.text("VEÍCULO", 105, 56);
  doc.setFont("helvetica", "normal"); doc.text(`${vehicle?.brand || ""} ${vehicle?.model || ""} • ${vehicle?.plate || "—"}`, 105, 63);
  doc.text(`Ano: ${vehicle?.year || "—"} • Cor: ${vehicle?.color || "—"}`, 105, 69);

  doc.setFont("helvetica", "bold"); doc.text("PROBLEMA RELATADO", 14, 82);
  doc.setFont("helvetica", "normal");
  const problemLines = doc.splitTextToSize(order.reported_problem || "—", 182);
  doc.text(problemLines, 14, 89);
  let startY = 89 + problemLines.length * 5 + 5;

  if (order.diagnosis) {
    doc.setFont("helvetica", "bold"); doc.text("DIAGNÓSTICO", 14, startY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(order.diagnosis, 182);
    doc.text(lines, 14, startY + 7);
    startY += lines.length * 5 + 14;
  }

  autoTable(doc, {
    startY,
    head: [["Tipo", "Descrição", "Qtd.", "Unitário", "Subtotal"]],
    body: items.map((item) => [
      item.type === "peca" ? "Peça" : item.type === "mao_de_obra" ? "Mão de obra" : "Serviço",
      item.description,
      item.quantity.toLocaleString("pt-BR"),
      money(item.unit_price),
      money(item.subtotal),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [232, 80, 42], textColor: 255 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || startY;
  const y = finalY + 9;
  doc.text(`Peças: ${money(order.parts_total)}`, 196, y, { align: "right" });
  doc.text(`Mão de obra/serviços: ${money(order.labor_total)}`, 196, y + 6, { align: "right" });
  doc.text(`Desconto: ${money(order.discount)}`, 196, y + 12, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`TOTAL: ${money(order.total)}`, 196, y + 21, { align: "right" });

  const signatureY = Math.max(y + 46, 250);
  if (signatureY < 283) {
    doc.setDrawColor(130);
    doc.line(18, signatureY, 88, signatureY);
    doc.line(122, signatureY, 192, signatureY);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Assinatura do cliente", 53, signatureY + 6, { align: "center" });
    doc.text("Responsável pela oficina", 157, signatureY + 6, { align: "center" });
  }

  return { doc, filename };
}

export function createOrderPdfFile(order: ServiceOrder) {
  const { doc, filename } = buildOrderPdf(order);
  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}

export function downloadOrderPdf(order: ServiceOrder) {
  const { doc, filename } = buildOrderPdf(order);
  doc.save(filename);
}
