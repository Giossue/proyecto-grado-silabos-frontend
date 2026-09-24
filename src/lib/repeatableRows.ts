import type { RepeatableRow } from "@/api/syllabi";

/**
 * Tras guardar filas repetibles solo se adoptan los identificadores que asignó el
 * servidor; el contenido y el orden siguen siendo los del editor. Así una fila
 * recién agregada (aunque esté vacía) no desaparece, y lo que el docente escribió
 * mientras viajaba el guardado no se pisa con la respuesta.
 *
 * Las filas nuevas se emparejan por orden: la k-ésima fila sin id enviada recibe
 * el id de la fila que ocupó su posición en la respuesta, y la k-ésima fila sin
 * id que sigue en pantalla recibe ese mismo id.
 */
export const reconcileSavedRows = (
  current: RepeatableRow[],
  sent: RepeatableRow[],
  saved: Array<Pick<RepeatableRow, "id">>,
): RepeatableRow[] => {
  const newIds = sent.map((row, index) => (row.id ? undefined : saved[index]?.id)).filter((id, index) => !sent[index]!.id);
  let next = 0;

  return current.map((row, index) => {
    if (row.id) return { ...row, position: index + 1 };
    const id = newIds[next++];

    return { ...row, id, position: index + 1 };
  });
};
