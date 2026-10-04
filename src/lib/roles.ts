import type { ActiveRole, RoleCode } from '@/api/session';

const labels: Record<RoleCode, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  bibliotecario: 'Bibliotecario',
  decano: 'Decano',
};

export const LIBRARY_SCOPE = 'Biblioteca · toda la universidad';

export const roleLabel = (code: string): string =>
  Object.hasOwn(labels, code) ? labels[code as RoleCode] : code;

export const roleNeedsCareer = (code: string): boolean =>
  code === 'coordinador' || code === 'docente';

// El decano actúa sobre una facultad (I-173).
export const roleNeedsFaculty = (code: string): boolean => code === 'decano';

export const scopeTitle = (role: Pick<ActiveRole, 'code' | 'career_name' | 'faculty_name'>): string => {
  if (role.code === 'bibliotecario') return LIBRARY_SCOPE;
  if (role.code === 'decano') return `Decanato · ${role.faculty_name ?? 'facultad asignada'}`;
  if (role.code === 'docente' && role.career_name) return `Docente · ${role.career_name}`;
  return role.career_name ?? roleLabel(role.code);
};
