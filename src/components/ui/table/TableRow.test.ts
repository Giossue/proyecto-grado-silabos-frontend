import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

describe('TableRow', () => {
    it('solo trata como casilla de la tarjeta a la primera celda con casilla y sin encabezado', async () => {
        const wrapper = mount({
            components: { Table, TableBody, TableCell, TableHead, TableHeader, TableRow },
            template: `
                <Table label="Materias">
                    <TableHeader><TableRow><TableHead /><TableHead>Materia</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell><input type="checkbox" aria-label="Seleccionar la materia"></TableCell>
                            <TableCell>Álgebra Lineal</TableCell>
                            <TableCell data-card-span="full"><input type="checkbox" aria-label="Seleccionar el paralelo">Paralelo A</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            `,
        });
        await nextTick();

        const cells = wrapper.findAll('tbody td');

        expect(cells.map((cell) => cell.attributes('data-card-role'))).toEqual(['select', 'title', 'data']);
        expect(cells[2].attributes('data-card-wide')).toBe('true');
    });

    it('una celda marcada no lleva etiqueta en la tarjeta y las demás conservan su encabezado', async () => {
        const wrapper = mount({
            components: { Table, TableBody, TableCell, TableHead, TableHeader, TableRow },
            template: `
                <Table label="Expedientes">
                    <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Docente</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>Álgebra Lineal</TableCell>
                            <TableCell>Ana Pérez</TableCell>
                            <TableCell data-card-no-label="true">Aprobado</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            `,
        });
        await nextTick();

        expect(wrapper.findAll('tbody td').map((cell) => cell.attributes('data-label'))).toEqual(['', 'Docente', '']);
    });
});
