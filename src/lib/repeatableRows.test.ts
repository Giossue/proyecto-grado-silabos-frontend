import { describe, expect, it } from "vitest";
import { reconcileSavedRows } from "@/lib/repeatableRows";

describe("reconcileSavedRows", () => {
  it("conserva una fila vacía recién agregada y le asigna el id del servidor", () => {
    const sent = [{ data: { texto: "" }, position: 1 }];
    const rows = reconcileSavedRows(sent, sent, [{ id: "row-1" }]);

    expect(rows).toEqual([{ id: "row-1", data: { texto: "" }, position: 1 }]);
  });

  it("no pisa lo escrito mientras viajaba el guardado", () => {
    const sent = [{ id: "row-1", data: { texto: "a" }, position: 1 }, { data: { texto: "" }, position: 2 }];
    const current = [
      { id: "row-1", data: { texto: "a" }, position: 1 },
      { data: { texto: "escrito después" }, position: 2 },
      { data: { texto: "" }, position: 3 },
    ];
    const rows = reconcileSavedRows(current, sent, [{ id: "row-1" }, { id: "row-2" }]);

    expect(rows.map((row) => row.id)).toEqual(["row-1", "row-2", undefined]);
    expect(rows[1]!.data.texto).toBe("escrito después");
  });
});
