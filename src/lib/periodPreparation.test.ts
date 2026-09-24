import { describe, expect, it } from 'vitest';
import type { ScheduledSubjects, TeacherAssignments } from '@/api/career-academics';
import { preparationRows } from './periodPreparation';

const options: ScheduledSubjects['options'] = {
  periods: [
    { id: 'old', code: '2025-A', starts_on: '2025-01-01', ends_on: '2025-06-30', status: 'finalizado', status_label: 'Finalizado', planning_enabled: false },
    { id: 'recent', code: '2025-B', starts_on: '2025-07-01', ends_on: '2025-12-31', status: 'finalizado', status_label: 'Finalizado', planning_enabled: false },
    { id: 'target', code: '2026-A', starts_on: '2026-01-01', ends_on: '2026-06-30', status: 'en_curso', status_label: 'En curso', planning_enabled: true },
  ],
  activeSubjects: [
    { id: 'subject-a', codigo_asignatura: 'SW-1', nombre: 'Materia A', ciclo: 1 },
    { id: 'subject-b', codigo_asignatura: 'SW-2', nombre: 'Materia B', ciclo: 1 },
  ],
  scheduledSubjects: [],
};
const schedule = (id: string, subjectId: string, periodId: string, parallels: Array<{ id: string; code: string; shift: string | null }>): ScheduledSubjects['scheduledSubjects'][number] => ({
  id, subject_id: subjectId, period_id: periodId, label: 'Materia', subject_code: 'SW-1', subject_name: 'Materia', subject_cycle: 1,
  period_starts_on: '2025-07-01', period_ends_on: '2025-12-31', period_status: 'finalizado', period_status_label: 'Finalizado', period_planning_enabled: false,
  campus_name: 'Matriz', modality_name: 'Presencial', parallels, active: true, editable: false,
});
const assignment = (parallelId: string, userId: string): TeacherAssignments['teacherAssignments'][number] => ({
  id: `assignment-${parallelId}`, user_id: userId, parallel_id: parallelId, user_name: 'Docente', user_email: 'docente@example.test',
  parallel_code: 'A', subject_name: 'Materia A', period_name: '2025-B', period_status: 'finalizado', period_planning_enabled: false, active: true, editable: false,
});

describe('preparationRows', () => {
  it('includes every pending subject and copies the latest prior parallels and eligible teachers', () => {
    const result = preparationRows('target', options, [
      schedule('old-a', 'subject-a', 'old', [{ id: 'old-parallel', code: 'C', shift: 'nocturna' }]),
      schedule('recent-a', 'subject-a', 'recent', [
        { id: 'parallel-a', code: 'A', shift: 'matutina' },
        { id: 'parallel-b', code: 'B', shift: null },
      ]),
    ], [assignment('parallel-a', 'teacher-1'), assignment('parallel-b', 'inactive-teacher')], [
      { id: 'teacher-1', name: 'Docente activo', email: 'activo@example.test' },
    ]);

    expect(result.sourcePeriodCode).toBe('2025-B');
    expect(result.rows).toEqual([
      { id: 'subject-a', code: 'SW-1', name: 'Materia A', parallels: [
        { code: 'A', shift: 'matutina', teacherId: 'teacher-1' },
        { code: 'B', shift: '', teacherId: '' },
      ] },
      { id: 'subject-b', code: 'SW-2', name: 'Materia B', parallels: [{ code: 'A', shift: '', teacherId: '' }] },
    ]);
  });

  it('does not offer a subject already prepared for the target period', () => {
    const result = preparationRows('target', options, [
      schedule('target-a', 'subject-a', 'target', [{ id: 'target-parallel', code: 'A', shift: null }]),
    ], [], []);
    expect(result.rows.map((row) => row.id)).toEqual(['subject-b']);
  });
});
