import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { sessionState } from '@/state/session';
import { initializeTheme } from '@/composables/useAppearance';
import '@/styles.css';

initializeTheme();

window.addEventListener('silabos:unauthorized', () => {
  const redirect = router.currentRoute.value.fullPath;
  sessionState.clear();

  if (router.currentRoute.value.path !== '/ingresar') {
    void router.replace({ path: '/ingresar', query: { redirect } });
  }
});

createApp(App).use(router).mount('#app');
