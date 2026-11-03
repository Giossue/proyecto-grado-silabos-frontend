<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

withDefaults(defineProps<{
    section?: 'profile' | 'security' | 'system' | 'email';
    readonly?: boolean;
    rows?: number;
    formation?: boolean;
}>(), {
    section: 'security',
    readonly: false,
    rows: 4,
    formation: false,
});
</script>

<template>
    <div v-if="section === 'system'" class="-mt-2 flex min-w-0 flex-col" data-settings-section="system">
        <div v-for="item in 3" :key="item" data-skeleton="settings-accordion-item" class="border-b last:border-b-0">
            <div class="flex items-start justify-between gap-4 py-4">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton class="size-4 shrink-0" />
                    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex h-5 items-center"><Skeleton :class="cn('h-4 max-w-full', item === 3 ? 'w-36' : 'w-28')" /></div>
                        <div class="flex h-5 items-center"><Skeleton :class="cn('h-4 max-w-full', item === 1 ? 'w-80' : 'w-96')" /></div>
                    </div>
                </div>
                <Skeleton class="size-4 shrink-0 translate-y-0.5" />
            </div>
            <div v-if="item === 1" data-skeleton="settings-accordion-content" class="flex min-w-0 flex-col gap-6 px-1 pt-2 pb-6">
                <div class="flex items-center gap-3">
                    <Skeleton class="h-5 w-9 rounded-full" />
                    <Skeleton class="h-4 w-40 max-w-full" />
                </div>
                <div class="flex min-w-0 flex-col gap-3">
                    <Skeleton class="h-3.5 w-32" />
                    <Skeleton class="h-9 w-32" />
                </div>
                <Skeleton class="h-9 w-25" />
            </div>
        </div>
    </div>
    <div v-else-if="section === 'email'" class="flex min-w-0 flex-col gap-6" data-settings-section="email">
        <div class="flex min-w-0 flex-col gap-0.5">
            <Skeleton class="h-6 w-36 max-w-full" />
            <Skeleton class="h-5 w-full" />
            <Skeleton class="h-5 w-1/3" />
        </div>
        <div v-for="row in rows" :key="row" data-skeleton="settings-email-option" class="flex min-w-0 items-start gap-3">
            <Skeleton class="h-5 w-9 shrink-0 rounded-full" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton class="h-4 w-48 max-w-full" />
                <Skeleton class="h-4 w-full" />
            </div>
        </div>
        <Skeleton class="h-9 w-25" data-skeleton="settings-save" />
    </div>
    <div v-else class="flex min-w-0 flex-col gap-12" :data-settings-section="section">
        <div class="flex min-w-0 flex-col gap-6" :data-skeleton="section === 'security' ? 'settings-password-form' : 'settings-profile-form'">
            <div class="flex min-w-0 flex-col gap-0.5">
                <Skeleton :class="cn('h-6 max-w-full', section === 'security' ? 'w-44' : 'w-16')" />
                <Skeleton :class="cn('h-5 max-w-full', section === 'security' ? 'w-96' : 'w-72')" />
                <Skeleton v-if="section === 'security'" class="h-5 w-3/4 sm:hidden" />
            </div>

            <div class="flex min-w-0 flex-col gap-6">
                <div v-for="field in section === 'security' ? 3 : 2" :key="field" class="flex min-w-0 flex-col gap-2" data-skeleton="settings-field">
                    <Skeleton :class="cn('h-3.5 max-w-full', field === 3 ? 'w-40' : 'w-36')" />
                    <Skeleton :class="cn('h-9 w-full', (section === 'security' || !readonly) && 'mt-1')" />
                    <Skeleton v-if="section === 'profile' && !readonly && field === 2" class="h-5 w-96 max-w-full" />
                </div>

                <div v-if="section === 'profile' && readonly" class="flex min-w-0 flex-col gap-1" data-skeleton="settings-identity-help">
                    <Skeleton class="h-5 w-full" />
                    <Skeleton class="h-5 w-2/3 sm:hidden" />
                </div>

                <Skeleton v-if="section === 'security' || !readonly" class="h-9 w-25 max-w-full" data-skeleton="settings-save" />
            </div>
        </div>

        <div v-if="section === 'profile' && formation" class="-mt-6 flex min-w-0 flex-col gap-4 border-t pt-6" data-skeleton="settings-formation">
            <div class="flex min-w-0 flex-col gap-2">
                <Skeleton class="h-3.5 w-80 max-w-full" />
                <Skeleton class="h-40 w-full" />
                <Skeleton class="h-5 w-full" />
                <Skeleton class="h-5 w-2/3" />
            </div>
            <Skeleton class="h-9 w-25" />
        </div>

        <div v-if="section === 'security'" class="flex min-w-0 flex-col gap-4" data-skeleton="settings-password-reset">
            <div class="flex min-w-0 flex-col gap-0.5">
                <Skeleton class="h-6 w-44 max-w-full" />
                <Skeleton class="h-5 w-full" />
                <Skeleton class="h-5 w-2/3" />
            </div>
            <Skeleton class="h-9 w-36" />
        </div>

        <div v-if="section === 'security'" class="flex min-w-0 flex-col gap-6" data-skeleton="settings-two-factor">
            <div class="flex min-w-0 flex-col gap-0.5">
                <Skeleton class="h-6 w-64 max-w-full" />
                <Skeleton class="h-5 w-80 max-w-full" />
            </div>
            <div class="flex min-w-0 flex-col items-start gap-4">
                <div class="flex w-full min-w-0 flex-col gap-1">
                    <Skeleton class="h-4 w-full" />
                    <Skeleton class="h-4 w-2/3" />
                    <Skeleton class="h-4 w-4/5 sm:hidden" />
                </div>
                <Skeleton class="h-9 w-31 max-w-full" data-skeleton="settings-two-factor-action" />
            </div>
        </div>
    </div>
</template>
