<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

defineProps<{ items: NavItem[] }>();

const { isCurrentOrParentUrl } = useCurrentUrl();
const router = useRouter();
const { state, isMobile } = useSidebar();
const showsFlyout = computed(() => state.value === 'collapsed' && !isMobile.value);
const isItemActive = (item: NavItem): boolean =>
    item.isActive === true ||
    isCurrentOrParentUrl(item.href) ||
    (item.items?.some((child) => isCurrentOrParentUrl(child.href)) ?? false);
</script>

<template>
    <SidebarGroup class="px-2 py-0">
        <SidebarGroupLabel>Trabajo</SidebarGroupLabel>
        <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.title">
                <template v-if="!item.items?.length">
                    <SidebarMenuButton as-child :is-active="isItemActive(item)" :tooltip="item.title">
                        <RouterLink :to="toUrl(item.href)">
                            <component :is="item.icon" />
                            <span>{{ item.title }}</span>
                        </RouterLink>
                    </SidebarMenuButton>
                    <SidebarMenuBadge v-if="item.badge">
                        {{ item.badge > 99 ? '99+' : item.badge }}
                    </SidebarMenuBadge>
                </template>

                <DropdownMenu v-else-if="showsFlyout">
                    <DropdownMenuTrigger as-child>
                        <SidebarMenuButton :is-active="isItemActive(item)" :tooltip="item.title">
                            <component :is="item.icon" />
                            <span>{{ item.title }}</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" class="w-56">
                        <DropdownMenuGroup>
                            <DropdownMenuItem v-for="child in item.items" :key="child.title" @select="router.push(toUrl(child.href))">
                                {{ child.title }}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Collapsible v-else class="group/collapsible" :default-open="isItemActive(item)">
                    <CollapsibleTrigger as-child>
                        <SidebarMenuButton :is-active="isItemActive(item)">
                            <component :is="item.icon" />
                            <span>{{ item.title }}</span>
                            <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" aria-hidden="true" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            <SidebarMenuSubItem v-for="child in item.items" :key="child.title">
                                <SidebarMenuSubButton as-child :is-active="isCurrentOrParentUrl(child.href)">
                                    <RouterLink :to="toUrl(child.href)"><span>{{ child.title }}</span></RouterLink>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
