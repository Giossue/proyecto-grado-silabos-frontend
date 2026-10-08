import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { handleRoleRequired, handleUnauthorized } from '@/lib/unauthorized';
import { initializeAccessibility } from '@/composables/useAccessibility';
import { initializeTheme } from '@/composables/useAppearance';
import { initializeDocumentPalette } from '@/lib/documentPalette';
import '@/styles.css';
import '@/accessibility.css';

initializeTheme();
initializeAccessibility();
initializeDocumentPalette();

window.addEventListener('silabos:unauthorized', () => handleUnauthorized(router));
window.addEventListener('silabos:role-required', () => handleRoleRequired(router));

createApp(App).use(router).mount('#app');
