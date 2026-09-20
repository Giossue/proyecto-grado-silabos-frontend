import { describe, expect, it, vi } from 'vitest';
import { apiRouter, visitApi } from '@/lib/apiVisit';

describe('apiRouter before visit', () => {
    it('permite cancelar una visita antes de realizar la petición', async () => {
        const onFinish = vi.fn();
        const stop = apiRouter.on('before', (event) => {
            expect(event.detail.visit.method).toBe('GET');
            expect(event.detail.visit.url).toBe('/ruta-protegida');
            event.preventDefault();
        });

        await visitApi('/ruta-protegida', { onFinish });
        stop();

        expect(onFinish).toHaveBeenCalledOnce();
    });
});
