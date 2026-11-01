<script setup lang="ts">
import { Search } from '@lucide/vue';
import { ref, watch } from 'vue';
import { searchLibraryCatalog, type CatalogBook, type CatalogSearchField } from '@/api/libraryCatalog';
import { catalogErrorMessage } from '@/lib/blocks/catalog';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PaginationMeta } from '@/types/pagination';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ pick: [book: CatalogBook] }>();
const open = ref(false);
const field = ref<CatalogSearchField>('any');
const text = ref('');
const results = ref<CatalogBook[] | null>(null);
const meta = ref<PaginationMeta | null>(null);
const searched = ref<{ field: CatalogSearchField; text: string } | null>(null);
const added = ref<Set<string>>(new Set());
const busy = ref(false);
const error = ref<string | null>(null);

watch(open, (isOpen) => {
    if (isOpen) return;
    text.value = '';
    results.value = null;
    meta.value = null;
    searched.value = null;
    added.value = new Set();
    error.value = null;
});

const load = async (query: { field: CatalogSearchField; text: string }, page: number): Promise<void> => {
    busy.value = true;
    error.value = null;
    try {
        const found = await searchLibraryCatalog(query.field, query.text, page);
        results.value = found.data;
        meta.value = found.meta;
        searched.value = query;
    } catch (reason) {
        results.value = null;
        meta.value = null;
        error.value = catalogErrorMessage(reason);
    } finally {
        busy.value = false;
    }
};
const search = async (): Promise<void> => {
    if (text.value.trim().length < 2 || busy.value) return;
    await load({ field: field.value, text: text.value.trim() }, 1);
};
const goTo = async (page: number): Promise<void> => {
    if (searched.value && !busy.value) await load(searched.value, page);
};
const pick = (book: CatalogBook): void => {
    emit('pick', book);
    added.value = new Set(added.value).add(book.id);
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child>
            <Button type="button" variant="outline" size="sm" class="w-fit" :disabled="props.disabled">
                <Search data-icon="inline-start" aria-hidden="true" />
                Buscar en la biblioteca
            </Button>
        </DialogTrigger>
        <DialogContent class="flex max-h-(--overlay-max-height) flex-col gap-3 overflow-hidden sm:max-w-6xl">
            <DialogHeader>
                <DialogTitle>Buscar en la biblioteca</DialogTitle>
                <DialogDescription>Elija un libro para agregarlo a la tabla</DialogDescription>
            </DialogHeader>
            <form class="flex flex-wrap gap-2" @submit.prevent="search">
                <NativeSelect v-model="field" aria-label="Buscar por">
                    <NativeSelectOption value="any">Todo</NativeSelectOption>
                    <NativeSelectOption value="title">Título</NativeSelectOption>
                    <NativeSelectOption value="author">Autor</NativeSelectOption>
                    <NativeSelectOption value="isbn">ISBN</NativeSelectOption>
                </NativeSelect>
                <Input v-model="text" class="min-w-40 flex-1" maxlength="120" placeholder="Texto a buscar" aria-label="Texto a buscar" />
                <Button type="submit" :disabled="busy || text.trim().length < 2">
                    <Spinner v-if="busy" data-icon="inline-start" />
                    Buscar
                </Button>
            </form>
            <FeedbackAlert v-if="error" :message="error" />
            <div v-else-if="results !== null" class="min-h-0 flex-1 overflow-y-auto">
                <Table label="Libros de la biblioteca" :cards="false">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Autor</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead class="text-center">Año</TableHead>
                            <TableHead>Ciudad</TableHead>
                            <TableHead>Editorial</TableHead>
                            <TableHead>ISBN</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead class="w-24"><span class="sr-only">Agregar</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableEmpty v-if="results.length === 0" :colspan="8">No hay resultados</TableEmpty>
                        <TableRow v-for="book in results" v-else :key="book.id">
                            <TableCell class="whitespace-normal">{{ book.author }}</TableCell>
                            <TableCell class="whitespace-normal font-medium">{{ book.title }}</TableCell>
                            <TableCell class="text-center">{{ book.year }}</TableCell>
                            <TableCell class="whitespace-normal">{{ book.place }}</TableCell>
                            <TableCell class="whitespace-normal">{{ book.publisher }}</TableCell>
                            <TableCell>{{ book.isbn }}</TableCell>
                            <TableCell class="whitespace-normal">{{ book.call_number }}</TableCell>
                            <TableCell>
                                <Button type="button" size="sm" :variant="added.has(book.id) ? 'outline' : 'default'" :disabled="added.has(book.id)" :aria-label="`Agregar ${book.title}`" @click="pick(book)">
                                    {{ added.has(book.id) ? 'Agregado' : 'Agregar' }}
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <TablePagination v-if="meta && meta.total > 0 && !error" class="shrink-0" :meta="meta" label="Paginación de los libros" @update:page="goTo" />
            <DialogFooter class="shrink-0">
                <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
