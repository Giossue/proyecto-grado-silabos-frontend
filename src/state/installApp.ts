import { computed, readonly, ref } from 'vue';

type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const deferred = ref<InstallPromptEvent | null>(null);
const installed = ref(false);

const runningInstalled = (): boolean =>
    window.matchMedia?.('(display-mode: standalone)').matches === true
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = (): boolean =>
    /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const initializeInstallApp = (): void => {
    installed.value = runningInstalled();
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferred.value = event as InstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
        installed.value = true;
        deferred.value = null;
    });
};

const install = async (): Promise<boolean> => {
    const event = deferred.value;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred.value = null;
    if (outcome === 'accepted') installed.value = true;

    return outcome === 'accepted';
};

export const installAppState = {
    installed: readonly(installed),
    canPrompt: computed(() => deferred.value !== null),
    platform: (): 'ios' | 'other' => (isIos() ? 'ios' : 'other'),
    install,
};
