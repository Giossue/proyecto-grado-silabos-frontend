import { createApp } from 'vue';
import App from '@/App.vue';
import { router } from '@/router';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';
import { rememberIntendedRoute } from '@/lib/intended-route';
import { initializeTheme } from '@/composables/useAppearance';
import '@/styles.css';

initializeTheme();

window.addEventListener('silabos:unauthorized', () => {
  const redirect = router.currentRoute.value.fullPath;
  sessionState.clear();
  rememberIntendedRoute(
    redirect,
    router.currentRoute.value.matched.some((record) => record.meta.requiresAuth === true),
  );

  if (router.currentRoute.value.path !== paths.login) {
    void router.replace(paths.login);
  }
});

createApp(App).use(router).mount('#app');
