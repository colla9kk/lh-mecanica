import test from "node:test";
import assert from "node:assert/strict";
import { deleteWorkshopRecord, deletionErrorMessage } from "../lib/deletions.ts";

const id = "00000000-0000-4000-8000-000000000001";
const client = (result) => ({ rpc: async () => result });

test("uses the authenticated RPC and accepts only a matching deletion receipt", async () => {
  for (const type of ["order", "vehicle", "customer"]) {
    await deleteWorkshopRecord({ rpc: async (name, args) => {
      assert.equal(name, "delete_workshop_record");
      assert.deepEqual(args, { p_record_type: type, p_record_id: id });
      return { data: { deleted: true, id, type }, error: null };
    } }, type, id);
  }
});

test("never reports success for a missing, false or mismatched receipt", async () => {
  for (const data of [null, [], {}, { deleted: false, id, type: "order" }, { deleted: true, id: "wrong", type: "order" }, { deleted: true, id, type: "customer" }]) {
    await assert.rejects(deleteWorkshopRecord(client({ data, error: null }), "order", id), /não confirmou/);
  }
});

test("explains a database migration that has not been applied", async () => {
  for (const code of ["PGRST202", "42883"]) {
    await assert.rejects(deleteWorkshopRecord(client({ error: { code } }), "order", id), /atualização do banco ainda não foi aplicada/);
  }
});

test("foreign keys give a usable order-first instruction without a customer/vehicle loop", async () => {
  await assert.rejects(deleteWorkshopRecord(client({ error: { code: "23503" } }), "vehicle", id), /Não é necessário excluir o cliente/);
  await assert.rejects(deleteWorkshopRecord(client({ error: { code: "23001" } }), "vehicle", id), /Não é necessário excluir o cliente/);
  await assert.rejects(deleteWorkshopRecord(client({ error: { code: "23503" } }), "customer", id), /Exclua as OS vinculadas/);
});

test("denied, missing and network errors cannot turn into success", async () => {
  await assert.rejects(deleteWorkshopRecord(client({ error: { code: "42501" } }), "order", id), /Entre novamente/);
  await assert.rejects(deleteWorkshopRecord(client({ error: { code: "P0002" } }), "order", id), /registro não foi excluído/);
  await assert.rejects(deleteWorkshopRecord({ rpc: async () => { throw new Error("offline"); } }, "order", id), /offline/);
  assert.match(deletionErrorMessage(null), /conexão foi interrompida/);
});
