<script setup lang="ts">
import { Search } from '@lucide/vue';
import { ref, watch } from 'vue';
import { searchLibraryCatalog, type CatalogBook, type CatalogSearchField } from '@/api/libraryCatalog';
import { catalogErrorMessage } from '@/lib/blocks/catalog';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ pick: [book: CatalogBook] }>();
const open = ref(false);
const field = ref<CatalogSearchField>('any');
const text = ref('');
const results = ref<CatalogBook[] | null>(null);
const added = ref<Set<string>>(new Set());
const busy = ref(false);
const error = ref<string | null>(null);

watch(open, (isOpen) => {
    if (isOpen) return;
    text.value = '';
    results.value = null;
    added.value = new Set();
    error.value = null;
});

const search = async (): Promise<void> => {
    if (text.value.trim().length < 2 || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        results.value = await searchLibraryCatalog(field.value, text.value.trim());
    } catch (reason) {
        results.value = null;
        error.value = catalogErrorMessage(reason);
    } finally {
        busy.value = false;
    }
};
const pick = (book: CatalogBook): void => {
    emit('pick', book);
    added.value = new Set(added.value).add(book.id);
};
const details = (book: CatalogBook): string => [book.author, book.year, book.publisher, book.isbn && `ISBN ${book.isbn}`].filter(Boolean).join(' · ');
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child>
            <Button type="button" variant="outline" size="sm" class="w-fit" :disabled="props.disabled">
                <Search data-icon="inline-start" aria-hidden="true" />
                Buscar en la biblioteca
            </Button>
        </DialogTrigger>
        <DialogContent class="flex max-h-(--overlay-max-height) flex-col gap-3 overflow-hidden sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Buscar en la biblioteca</DialogTitle>
                <DialogDescription>Elija un libro para agregarlo a la tabla.</DialogDescription>
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
            <p v-else-if="results !== null && results.length === 0" class="text-sm text-muted-foreground">No hay resultados.</p>
            <ScrollArea v-if="results !== null && results.length > 0" class="min-h-0 flex-1">
                <ul class="flex flex-col gap-2 pr-3">
                    <li v-for="book in results" :key="book.id" class="flex items-start justify-between gap-3 rounded-md border p-2">
                        <div class="min-w-0">
                            <p class="font-medium">{{ book.title }}</p>
                            <p class="text-sm text-muted-foreground">{{ details(book) }}</p>
                        </div>
                        <Button type="button" size="sm" :variant="added.has(book.id) ? 'outline' : 'default'" :disabled="added.has(book.id)" @click="pick(book)">
                            {{ added.has(book.id) ? 'Agregado' : 'Agregar' }}
                        </Button>
                    </li>
                </ul>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</template>
