export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export const dateBR = (value: string | null | undefined) => {
  if (!value) return "—";
  const normalized = value.length === 10 ? `${value}T12:00:00` : value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(normalized));
};

export const normalizePlate = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);

export const today = () => new Date().toISOString().slice(0, 10);
