import type { ScheduledSubjects, TeacherAssignments } from '@/api/career-academics';

export type ParallelDraft = { code: string; shift: string; teacherId: string };
export type PreparationRow = {
  id: string;
  code: string;
  name: string;
  parallels: ParallelDraft[];
};

export function preparationProblem(rows: PreparationRow[]): string | null {
  for (const row of rows) {
    if (row.parallels.length === 0) return `${row.name}: agregue al menos un paralelo.`;
    if (row.parallels.some((parallel) => !parallel.code.trim())) return `${row.name}: escriba el código de cada paralelo.`;
    if (row.parallels.some((parallel) => !parallel.shift)) return `${row.name}: elija la jornada de cada paralelo.`;
    const codes = row.parallels.map((parallel) => parallel.code.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) return `${row.name}: hay paralelos con el mismo código.`;
  }
  return null;
}

export function nextParallelCode(parallels: ParallelDraft[]): string {
  const used = new Set(parallels.map((parallel) => parallel.code.trim().toUpperCase()));
  for (let index = 0; index < 26; index++) {
    const code = String.fromCharCode(65 + index);
    if (!used.has(code)) return code;
  }
  return '';
}

export function preparationRows(
  periodId: string,
  options: ScheduledSubjects['options'],
  scheduledSubjects: ScheduledSubjects['scheduledSubjects'],
  assignments: TeacherAssignments['teacherAssignments'],
  teacherUsers: TeacherAssignments['options']['teacherUsers'],
): { rows: PreparationRow[]; sourcePeriodCode: string | null } {
  const defaultShift = options.shiftOptions[0]?.value ?? '';
  const target = options.periods.find((period) => period.id === periodId);
  if (!target) return { rows: [], sourcePeriodCode: null };

  const previous = options.periods
    .filter((period) => period.starts_on < target.starts_on)
    .sort((left, right) => right.starts_on.localeCompare(left.starts_on))[0];
  const previousSchedules = new Map(
    scheduledSubjects
      .filter((item) => item.period_id === previous?.id && item.parallels.length > 0)
      .map((item) => [item.subject_id, item]),
  );
  const preparedIds = new Set(scheduledSubjects.filter((item) => item.period_id === periodId && item.parallels.length > 0).map((item) => item.subject_id));
  const availableTeachers = new Set(teacherUsers.map((teacher) => teacher.id));
  const activeAssignments = new Map(assignments.filter((item) => item.active).map((item) => [item.parallel_id, item.user_id]));

  return {
    rows: options.activeSubjects.filter((item) => !preparedIds.has(item.id)).map((item) => {
      const previousParallels = previousSchedules.get(item.id)?.parallels ?? [];
      return {
        id: item.id,
        code: item.codigo_asignatura,
        name: item.nombre,
        parallels: previousParallels.length
          ? previousParallels.map((parallel) => {
            const teacherId = activeAssignments.get(parallel.id) ?? '';
            return {
              code: parallel.code,
              shift: parallel.shift || defaultShift,
              teacherId: availableTeachers.has(teacherId) ? teacherId : '',
            };
          })
          : [{ code: 'A', shift: defaultShift, teacherId: '' }],
      };
    }),
    sourcePeriodCode: previous && previousSchedules.size > 0 ? previous.code : null,
  };
}
