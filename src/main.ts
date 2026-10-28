import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { installPageAnnouncements } from '@/lib/pageAnnouncement';
import { handleRoleRequired, handleUnauthorized } from '@/lib/unauthorized';
import { initializeAccessibility } from '@/composables/useAccessibility';
import { initializeTheme } from '@/composables/useAppearance';
import { initializeDocumentPalette } from '@/lib/documentPalette';
import { installNativeValidation } from '@/lib/nativeValidation';
import { initializeInstallApp } from '@/state/installApp';
import '@/state/screenHelp';
import '@/styles.css';
import '@/accessibility.css';

initializeTheme();
installPageAnnouncements(router);
initializeAccessibility();
initializeDocumentPalette();
initializeInstallApp();
installNativeValidation();

window.addEventListener('silabos:unauthorized', () => handleUnauthorized(router));
window.addEventListener('silabos:role-required', () => handleRoleRequired(router));

createApp(App).use(router).mount('#app');
