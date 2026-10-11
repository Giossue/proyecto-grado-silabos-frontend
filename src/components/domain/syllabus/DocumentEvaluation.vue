<script setup lang="ts">
import { computed } from 'vue';
import { evaluationWithPractice } from '@/lib/blockLayouts';

const rows = computed<Array<[string, string, string]>>(() => evaluationWithPractice()
  ? [['Aprendizaje en contacto con el docente', '2.5', '1.25'], ['Aprendizaje práctico-experimental', '2.0', '1.0'], ['Aprendizaje autónomo', '2.0', '1.0'], ['Evaluación parcial de los aprendizajes', '3.5', '1.75']]
  : [['Aprendizaje en contacto con el docente', '3.5', '1.75'], ['Aprendizaje autónomo', '3.0', '1.5'], ['Evaluación parcial de los aprendizajes', '3.5', '1.75']]);
</script>

<template>
  <table data-evaluation class="free-text-table w-full">
    <thead>
      <tr><th rowspan="2">INDICADORES</th><th colspan="2">PRIMER PARCIAL</th><th colspan="2">SEGUNDO PARCIAL</th></tr>
      <tr><th>(PUNTOS)</th><th>PONDERACIÓN</th><th>(PUNTOS)</th><th>PONDERACIÓN</th></tr>
    </thead>
    <tbody>
      <tr v-for="[name, points, weight] in rows" :key="name"><th>{{ name }}</th><td>{{ points }} PUNTOS</td><td>{{ weight }}</td><td>{{ points }} PUNTOS</td><td>{{ weight }}</td></tr>
      <tr><th>TOTAL</th><td>10 PUNTOS</td><td>5 PUNTOS</td><td>10 PUNTOS</td><td>5 PUNTOS</td></tr>
    </tbody>
  </table>
</template>
