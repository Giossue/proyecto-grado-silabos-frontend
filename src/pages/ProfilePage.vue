<script setup lang="ts">
import { computed } from 'vue';
import Heading from '@/components/Heading.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsLayout from '@/layouts/SettingsLayout.vue';
import { sessionState } from '@/state/session';
const user = computed(() => sessionState.current.value?.user);
</script>
<template><SettingsLayout><div class="flex flex-col space-y-6"><Heading variant="small" title="Perfil" description="Consulte los datos de su cuenta" /><div class="space-y-6"><div class="grid gap-2"><Label for="readonly-name">Nombre completo</Label><Input id="readonly-name" :model-value="user?.name" disabled aria-describedby="identity-help" /></div><div class="grid gap-2"><Label for="readonly-email">Correo electrónico</Label><Input id="readonly-email" type="email" :model-value="user?.email" disabled aria-describedby="identity-help" /></div><p id="identity-help" class="text-sm text-muted-foreground">Si necesita corregir su nombre o correo, solicite el cambio a Administración.</p></div></div></SettingsLayout></template>
