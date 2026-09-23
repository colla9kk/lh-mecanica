import type { SupabaseClient } from "@supabase/supabase-js";

export type DeletableRecord = "order" | "vehicle" | "customer";

export async function deleteWorkshopRecord(
  client: Pick<SupabaseClient, "rpc">,
  type: DeletableRecord,
  id: string,
): Promise<void> {
  const { data, error } = await client.rpc("delete_workshop_record", {
    p_record_type: type,
    p_record_id: id,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error("A atualização do banco ainda não foi aplicada. Peça ao responsável pelo site para concluir a configuração das exclusões.");
    }
    if (error.code === "23503" || error.code === "23001") {
      throw new Error(type === "customer"
        ? "Este cliente ainda possui ordens de serviço. Exclua as OS vinculadas na aba Ordens de serviço; depois, exclua o cliente. Os veículos sem histórico serão removidos junto com o cadastro."
        : "Este veículo ainda possui ordens de serviço. Exclua as OS vinculadas na aba Ordens de serviço e tente novamente. Não é necessário excluir o cliente.");
    }
    if (error.code === "42501" || error.code === "PGRST301" || error.code === "PGRST303") {
      throw new Error("Seu acesso não permitiu a exclusão. Entre novamente no painel e tente outra vez.");
    }
    if (error.code === "P0002") {
      throw new Error("O registro não foi excluído: ele não está mais disponível ou o banco bloqueou a operação. Atualize a lista antes de tentar novamente.");
    }
    throw new Error("Não foi possível excluir. Atualize a lista e confira sua conexão antes de tentar novamente.");
  }
  if (data?.deleted !== true || data.id !== id || data.type !== type) {
    throw new Error("O banco não confirmou a exclusão. Atualize a lista antes de tentar novamente.");
  }
}

export function deletionErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "A conexão foi interrompida. Atualize a lista para conferir se o registro foi excluído.";
}
