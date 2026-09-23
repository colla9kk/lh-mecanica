export type Customer = {
  id: string; name: string; document: string | null; phone: string;
  whatsapp: string | null; email: string | null; address: string | null;
  notes: string | null; created_at: string; updated_at: string;
};

export type Vehicle = {
  id: string; customer_id: string; plate: string; brand: string; model: string;
  year: number | null; color: string | null; mileage: number | null;
  fuel: string | null; chassis: string | null; notes: string | null;
  created_at: string; updated_at: string; customer?: Customer;
};

export type ServiceItem = {
  id?: string; service_order_id?: string;
  type: "servico" | "mao_de_obra" | "peca"; description: string;
  quantity: number; unit_price: number; subtotal: number;
};

export type OrderStatus = "aberta" | "aguardando_aprovacao" | "aprovada" |
  "em_andamento" | "concluida" | "entregue" | "cancelada";

export type ServiceOrder = {
  id: string; order_number: string; customer_id: string; vehicle_id: string;
  entry_date: string; expected_delivery_date: string | null; completed_at: string | null;
  mileage: number | null; reported_problem: string; diagnosis: string | null;
  notes: string | null; status: OrderStatus; labor_total: number; parts_total: number;
  discount: number; total: number; created_at: string; updated_at: string;
  customer?: Customer; vehicle?: Vehicle; items?: ServiceItem[];
};

export const statusLabels: Record<OrderStatus, string> = {
  aberta: "Aberta", aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada", em_andamento: "Em andamento", concluida: "Concluída",
  entregue: "Entregue", cancelada: "Cancelada",
};
