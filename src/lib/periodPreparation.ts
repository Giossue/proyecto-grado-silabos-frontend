import type { ScheduledSubjects, TeacherAssignments } from '@/api/career-academics';

export type ParallelDraft = { code: string; shift: string; teacherId: string };
export type PreparationRow = {
  id: string;
  code: string;
  name: string;
  parallels: ParallelDraft[];
};

export function preparationRows(
  periodId: string,
  options: ScheduledSubjects['options'],
  scheduledSubjects: ScheduledSubjects['scheduledSubjects'],
  assignments: TeacherAssignments['teacherAssignments'],
  teacherUsers: TeacherAssignments['options']['teacherUsers'],
): { rows: PreparationRow[]; sourcePeriodCode: string | null } {
  const target = options.periods.find((period) => period.id === periodId);
  if (!target) return { rows: [], sourcePeriodCode: null };

  const previous = options.periods
    .filter((period) => period.starts_on < target.starts_on)
    .sort((left, right) => right.starts_on.localeCompare(left.starts_on))[0];
  const previousSchedules = new Map(
    scheduledSubjects
      .filter((item) => item.period_id === previous?.id && item.active)
      .map((item) => [item.subject_id, item]),
  );
  const preparedIds = new Set(scheduledSubjects.filter((item) => item.period_id === periodId && item.active).map((item) => item.subject_id));
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
              shift: parallel.shift ?? '',
              teacherId: availableTeachers.has(teacherId) ? teacherId : '',
            };
          })
          : [{ code: 'A', shift: '', teacherId: '' }],
      };
    }),
    sourcePeriodCode: previous && previousSchedules.size > 0 ? previous.code : null,
  };
}
