<script setup lang="ts">
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toUrl } from '@/lib/utils';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

defineProps<{ breadcrumbs: BreadcrumbItemType[] }>();
</script>

<template>
    <Breadcrumb>
        <BreadcrumbList>
            <template v-for="(item, index) in breadcrumbs" :key="index">
                <BreadcrumbItem>
                    <template v-if="index === breadcrumbs.length - 1 || item.href === undefined">
                        <h1
                            data-slot="breadcrumb-page"
                            aria-current="page"
                            class="font-normal text-foreground"
                        >
                            {{ item.title }}
                        </h1>
                    </template>
                    <template v-else>
                        <BreadcrumbLink as-child>
                            <RouterLink :to="toUrl(item.href)">{{ item.title }}</RouterLink>
                        </BreadcrumbLink>
                    </template>
                </BreadcrumbItem>
                <BreadcrumbSeparator v-if="index !== breadcrumbs.length - 1" />
            </template>
        </BreadcrumbList>
    </Breadcrumb>
</template>
