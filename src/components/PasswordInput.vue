<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue';
import { ref } from 'vue';
import type { HTMLAttributes } from 'vue';
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
    <button type="button" :class="cn('absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none')" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
      <EyeOff v-if="showPassword" class="size-4" /><Eye v-else class="size-4" />
    </button>
  </div>
</template>
