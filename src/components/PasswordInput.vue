<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Eye, EyeOff } from '@lucide/vue';
import { ref } from 'vue';
import type { HTMLAttributes } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
defineOptions({ inheritAttrs: false });
const props = defineProps<{ class?: HTMLAttributes['class']; modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const showPassword = ref(false);
</script>
<template>
  <div class="relative">
    <Input :model-value="props.modelValue" :type="showPassword ? 'text' : 'password'" :class="cn('pr-10', props.class)" v-bind="$attrs" @update:model-value="emit('update:modelValue', String($event))" />
    <IconTooltip :label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"><Button type="button" variant="ghost" size="icon" :class="cn('absolute inset-y-px right-px h-auto rounded-l-none rounded-r-md px-3 text-muted-foreground hover:bg-transparent hover:text-foreground')" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
      <EyeOff v-if="showPassword" class="size-4" /><Eye v-else class="size-4" />
    </Button></IconTooltip>
  </div>
</template>
