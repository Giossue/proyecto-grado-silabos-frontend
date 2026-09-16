<script setup lang="ts">
import type { DocumentPresentation } from "@/api/syllabi";

defineProps<{ presentation: DocumentPresentation }>();
</script>

<template>
  <header class="syllabus-document-header">
    <img :src="presentation.logos.institution" alt="Logo institucional" />
    <h2
      :style="{
        color: presentation.appearance.accent_color,
        fontSize: `${presentation.appearance.title_font_size}pt`,
        fontWeight: presentation.appearance.title_bold ? '700' : '400',
        fontStyle: presentation.appearance.title_italic ? 'italic' : 'normal',
        textAlign: presentation.appearance.title_alignment as 'left' | 'center' | 'right',
      }"
    >
      {{ presentation.title }}
    </h2>
    <img :src="presentation.logos.faculty" alt="Logo de facultad" />
  </header>
</template>
