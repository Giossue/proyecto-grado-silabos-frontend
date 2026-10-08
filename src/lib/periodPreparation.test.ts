import { describe, expect, it } from 'vitest';
import type { ScheduledSubjects, TeacherAssignments } from '@/api/career-academics';
import { groupByCycle, nextParallelCode, preparationProblem, preparationRows } from './periodPreparation';

const options: ScheduledSubjects['options'] = {
  shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],
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
  subject_id: subjectId, period_id: periodId, label: 'Materia', subject_code: 'SW-1', subject_name: 'Materia', subject_cycle: 1,
  period_starts_on: '2025-07-01', period_ends_on: '2025-12-31', period_status: 'finalizado', period_status_label: 'Finalizado', period_planning_enabled: false,
  campus_name: 'Matriz', modality_name: 'Presencial', parallels, editable: false,
});
const assignment = (parallelId: string, userId: string): TeacherAssignments['teacherAssignments'][number] => ({
  id: `assignment-${parallelId}`, user_id: userId, parallel_id: parallelId, user_name: 'Docente', user_email: 'docente@example.test',
  parallel_code: 'A', subject_name: 'Materia A', period_name: '2025-B', period_status: 'finalizado', period_planning_enabled: false, active: true, editable: false,
});

describe('preparationRows', () => {
  it('groups pending subjects by cycle in ascending order', () => {
    const rows = preparationRows('target', options, [], [], []).rows;
    const groups = groupByCycle([...rows].reverse());
    expect(groups.map((group) => group.cycle)).toEqual([...new Set(rows.map((row) => row.cycle))].sort((a, b) => a - b));
    expect(groups.flatMap((group) => group.rows)).toHaveLength(rows.length);
  });
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
      { id: 'subject-a', code: 'SW-1', name: 'Materia A', cycle: 1, parallels: [
        { code: 'A', shift: 'matutina', teacherId: 'teacher-1' },
        { code: 'B', shift: 'matutina', teacherId: '' },
      ] },
      { id: 'subject-b', code: 'SW-2', name: 'Materia B', cycle: 1, parallels: [{ code: 'A', shift: 'matutina', teacherId: '' }] },
    ]);
  });

  it('does not offer a subject already prepared for the target period', () => {
    const result = preparationRows('target', options, [
      schedule('target-a', 'subject-a', 'target', [{ id: 'target-parallel', code: 'A', shift: null }]),
    ], [], []);
    expect(result.rows.map((row) => row.id)).toEqual(['subject-b']);
  });

  it('proposes paralelo A with the first shift supplied by the server', () => {
    const result = preparationRows('target', options, [], [], []);
    expect(result.rows.every((row) => row.parallels.length === 1 && row.parallels[0].code === 'A' && row.parallels[0].shift === 'matutina')).toBe(true);
    const alternative = preparationRows('target', { ...options, shiftOptions: [{ value: 'nocturna', label: 'Nocturna' }] }, [], [], []);
    expect(alternative.rows.every((row) => row.parallels[0]?.shift === 'nocturna')).toBe(true);
  });
});

describe('preparationProblem', () => {
  const row = (parallels: Array<{ code: string; shift: string }>) => ({ id: 'x', code: 'SW-1', name: 'Materia A', cycle: 1, parallels: parallels.map((item) => ({ ...item, teacherId: '' })) });

  it('accepts rows where every parallel has code and shift', () => {
    expect(preparationProblem([row([{ code: 'A', shift: 'matutina' }, { code: 'B', shift: 'nocturna' }])])).toBeNull();
  });

  it('explains simply what is missing', () => {
    expect(preparationProblem([row([{ code: ' ', shift: 'matutina' }])])).toBe('Materia A: escriba el código de cada paralelo.');
    expect(preparationProblem([row([{ code: 'A', shift: '' }])])).toBe('Materia A: elija la jornada de cada paralelo.');
    expect(preparationProblem([row([{ code: 'a', shift: 'matutina' }, { code: 'A ', shift: 'matutina' }])])).toBe('Materia A: hay paralelos con el mismo código.');
    expect(preparationProblem([row([])])).toBe('Materia A: agregue al menos un paralelo.');
  });

  it('suggests the next free letter', () => {
    expect(nextParallelCode([{ code: 'A', shift: 'matutina', teacherId: '' }])).toBe('B');
  });
});
