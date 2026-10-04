<script setup lang="ts">
import { computed } from 'vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/composables/useInitials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

type Props = {
    user: User;
    showEmail?: boolean;
    showFullName?: boolean;
    subtitle?: string | null;
};

const props = withDefaults(defineProps<Props>(), {
    showEmail: false,
    showFullName: false,
});

const { getInitials } = useInitials();

const showAvatar = computed(
    () => props.user.avatar && props.user.avatar !== '',
);
</script>

<template>
    <Avatar class="size-8 overflow-hidden">
        <AvatarImage v-if="showAvatar" :src="user.avatar!" :alt="user.nombre" />
        <AvatarFallback class="border border-border bg-muted text-muted-foreground">
            {{ getInitials(user.nombre) }}
        </AvatarFallback>
    </Avatar>

    <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span :class="cn('font-medium', showFullName ? 'whitespace-normal wrap-break-word' : 'truncate')">{{ user.nombre }}</span>
        <span
            v-if="subtitle || showEmail"
            class="truncate text-xs text-muted-foreground"
        >
            {{ subtitle ?? user.correo_electronico }}
        </span>
    </div>
</template>
