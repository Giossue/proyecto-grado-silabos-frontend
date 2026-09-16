import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/api/client', () => ({ api }));

import {
  deleteAcademicRecord,
  replaceCareerCoordinator,
  setAcademicRecordStatus,
  updateAcademicRecord,
} from '@/api/academic';

describe('academic API', () => {
  beforeEach(() => api.mockReset());

  it('uses the academic record mutation contract', async () => {
    api.mockResolvedValue({ message: 'ok' });

    await updateAcademicRecord('carrera', 'career-1', { nombre: 'Software' });
    await setAcademicRecordStatus('campus', 'campus-1', false);
    await deleteAcademicRecord('periodo', 'period-1');

    expect(api).toHaveBeenNthCalledWith(1, '/admin/academic/carrera/career-1', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Software' }),
    });
    expect(api).toHaveBeenNthCalledWith(2, '/admin/academic/campus/campus-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
    expect(api).toHaveBeenNthCalledWith(3, '/admin/academic/periodo/period-1', {
      method: 'DELETE',
    });
  });

  it('uses the dedicated coordinator replacement endpoint', async () => {
    api.mockResolvedValue({ message: 'ok' });

    await replaceCareerCoordinator('career-1', 'user-2', true);

    expect(api).toHaveBeenCalledWith('/admin/academic/careers/career-1/coordinator', {
      method: 'POST',
      body: JSON.stringify({ incoming_user_id: 'user-2', deactivate_outgoing: true }),
    });
  });
});
