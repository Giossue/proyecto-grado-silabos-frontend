import { readonly, ref } from 'vue';
import { ApiError } from '@/api/client';
import { getSession, type Session } from '@/api/session';

const current = ref<Session | null>(null);
const loaded = ref(false);
let pending: Promise<Session | null> | null = null;

const load = async (force = false): Promise<Session | null> => {
  if (loaded.value && !force) return current.value;
  if (pending && !force) return pending;

  pending = getSession()
    .then((session) => {
      current.value = session;
      loaded.value = true;
      return session;
    })
    .catch((reason: unknown) => {
      if (reason instanceof ApiError && reason.status === 401) {
        current.value = null;
        loaded.value = true;
        return null;
      }
      throw reason;
    })
    .finally(() => { pending = null; });

  return pending;
};

const replace = (session: Session | null): void => {
  current.value = session;
  loaded.value = true;
};

const clear = (): void => replace(null);

export const sessionState = {
  current: readonly(current),
  loaded: readonly(loaded),
  load,
  replace,
  clear,
};
