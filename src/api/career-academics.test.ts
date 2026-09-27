import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  api,
}));

import { ApiError } from '@/api/client';
import { PURGE_CANCELLED_MESSAGE, updateCurriculumConfiguration } from '@/api/career-academics';
import { usePurgeConfirmation } from '@/composables/usePurgeConfirmation';

const purgeError = () => new ApiError('purga', 422, {
  purge_required: ['Este cambio reemplazará 1 sílabo.'],
  purge_count: ['1'],
});

describe('career academics API purge confirmation', () => {
  beforeEach(() => api.mockReset());

  it('asks for confirmation and resends the same change with confirm_purge', async () => {
    api.mockRejectedValueOnce(purgeError()).mockResolvedValueOnce({ message: 'ok' });
    const dialog = usePurgeConfirmation();

    const result = updateCurriculumConfiguration('career-1', { cycle_count: 9 });
    await vi.waitFor(() => expect(dialog.open.value).toBe(true));
    expect(dialog.message.value).toBe('Este cambio reemplazará 1 sílabo.');
    await dialog.confirm();

    await expect(result).resolves.toEqual({ message: 'ok' });
    expect(api).toHaveBeenLastCalledWith('/coordination/academic/curriculum/career-1/configuration', {
      method: 'PATCH',
      body: JSON.stringify({ cycle_count: 9, confirm_purge: true }),
    });
  });

  it('rejects without resending when the coordinator cancels', async () => {
    api.mockRejectedValueOnce(purgeError());
    const dialog = usePurgeConfirmation();

    const result = updateCurriculumConfiguration('career-1', { cycle_count: 9 });
    await vi.waitFor(() => expect(dialog.open.value).toBe(true));
    dialog.cancel();

    await expect(result).rejects.toThrow(PURGE_CANCELLED_MESSAGE);
    expect(api).toHaveBeenCalledTimes(1);
  });

});
