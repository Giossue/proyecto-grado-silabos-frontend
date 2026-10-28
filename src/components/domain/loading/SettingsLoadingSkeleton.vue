<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

withDefaults(defineProps<{
    section?: 'profile' | 'security';
    readonly?: boolean;
}>(), {
    section: 'security',
    readonly: false,
});
</script>

<template>
    <div class="flex min-w-0 flex-col gap-12" :data-settings-section="section">
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
                    <Skeleton v-if="section === 'profile' && !readonly" :class="cn('h-5 max-w-full', field === 1 ? 'w-72' : 'w-96')" />
                </div>

                <div v-if="section === 'profile' && readonly" class="flex min-w-0 flex-col gap-1" data-skeleton="settings-identity-help">
                    <Skeleton class="h-5 w-full" />
                    <Skeleton class="h-5 w-2/3 sm:hidden" />
                </div>

                <Skeleton v-if="section === 'security' || !readonly" class="h-9 w-25 max-w-full" data-skeleton="settings-save" />
            </div>
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
