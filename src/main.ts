import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { handleUnauthorized } from '@/lib/unauthorized';
import { initializeTheme } from '@/composables/useAppearance';
import '@/styles.css';

initializeTheme();

window.addEventListener('silabos:unauthorized', () => handleUnauthorized(router));

createApp(App).use(router).mount('#app');
