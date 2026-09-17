import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/lib/toast';

const sonner = vi.hoisted(() => ({
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
}));

vi.mock('vue-sonner', () => ({ toast: sonner }));

describe('toast', () => {
    beforeEach(() => {
        Object.values(sonner).forEach((method) => method.mockReset());
    });

    it('elimina el punto final de cualquier tipo de aviso', () => {
        toast.success('Cambios guardados.');
        toast.info('Proceso en cola.   ');
        toast.warning('Revisa el campo');
        toast.error('No se pudo guardar.');
        toast.loading('Cargando');

        expect(sonner.success).toHaveBeenCalledWith('Cambios guardados', undefined);
        expect(sonner.info).toHaveBeenCalledWith('Proceso en cola', undefined);
        expect(sonner.warning).toHaveBeenCalledWith('Revisa el campo', undefined);
        expect(sonner.error).toHaveBeenCalledWith('No se pudo guardar', undefined);
        expect(sonner.loading).toHaveBeenCalledWith('Cargando', undefined);
    });
});
