import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { handleUnauthorized } from '@/lib/unauthorized';
import { initializeTheme } from '@/composables/useAppearance';
import { initializeDocumentPalette } from '@/lib/documentPalette';
import '@/styles.css';

initializeTheme();
initializeDocumentPalette();

window.addEventListener('silabos:unauthorized', () => handleUnauthorized(router));

createApp(App).use(router).mount('#app');
