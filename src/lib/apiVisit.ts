import { reactive } from 'vue';
import { ApiError, api } from '@/api/client';
import { requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';

export type ApiErrors = Record<string, string>;
export type ApiVisitOptions = {
    method?: string;
    data?: Record<string, unknown> | FormData;
    preserveScroll?: boolean;
    preserveState?: boolean;
    preserveUrl?: boolean;
    preserveErrors?: boolean;
    onSuccess?: (payload?: unknown) => void;
    onError?: (errors: ApiErrors) => void;
    onFinish?: () => void;
};

type BeforeVisit = {
    method: string;
    url: string | URL;
    data: Record<string, unknown> | FormData;
};

type BeforeVisitEvent = {
    detail: { visit: BeforeVisit };
    preventDefault: () => void;
};

type BeforeVisitListener = (event: BeforeVisitEvent) => void;
const beforeVisitListeners = new Set<BeforeVisitListener>();

const flattenErrors = (error: ApiError): ApiErrors => {
    const errors = Object.fromEntries(
        Object.entries(error.errors).map(([key, values]) => [key, values[0] ?? error.message]),
    );

    return Object.keys(errors).length > 0 ? errors : { request: error.message };
};

const withConfirmation = (
    data: Record<string, unknown> | FormData,
): Record<string, unknown> | FormData => {
    if (data instanceof FormData) {
        const confirmed = new FormData();
        data.forEach((value, key) => confirmed.append(key, value));
        confirmed.set('confirm_purge', '1');
        return confirmed;
    }

    return { ...data, confirm_purge: true };
};

const bodyFor = (data: Record<string, unknown> | FormData): BodyInit =>
    data instanceof FormData ? data : JSON.stringify(data);

export const visitApi = async (
    url: string,
    options: ApiVisitOptions = {},
): Promise<void> => {
    const method = (options.method ?? 'GET').toUpperCase();
    const data = options.data ?? {};

    let prevented = false;
    const event: BeforeVisitEvent = {
        detail: { visit: { method, url, data } },
        preventDefault: () => {
            prevented = true;
        },
    };

    for (const listener of [...beforeVisitListeners]) {
        listener(event);
    }

    if (prevented) {
        options.onFinish?.();

        return;
    }

    try {
        const payload = await api<unknown>(url, {
            method,
            ...(method === 'GET' || method === 'HEAD' ? {} : { body: bodyFor(data) }),
        });
        window.dispatchEvent(new CustomEvent('silabos:template-changed'));
        options.onSuccess?.(payload);
    } catch (reason) {
        if (reason instanceof ApiError) {
            const errors = flattenErrors(reason);
            const purgeMessage = errors.purge_required;

            if (purgeMessage) {
                requestPurgeConfirmation(
                    purgeMessage,
                    Number(errors.purge_count ?? 0),
                    () => visitApi(url, { ...options, data: withConfirmation(data) }),
                    undefined,
                    errors.purge_mode,
                );
            }

            options.onError?.(errors);
        } else {
            options.onError?.({ request: 'No se pudo completar la solicitud' });
        }
    } finally {
        options.onFinish?.();
    }
};

type FormDataShape = Record<string, unknown>;
type FormOptions = Omit<ApiVisitOptions, 'method' | 'data'>;

export type ApiForm<T extends FormDataShape> = T & {
    processing: boolean;
    errors: ApiErrors;
    data: () => T;
    clearErrors: (...keys: string[]) => void;
    reset: (...keys: (keyof T)[]) => void;
    transform: (callback: (data: T) => Record<string, unknown>) => ApiForm<T>;
    post: (url: string, options?: FormOptions) => void;
    patch: (url: string, options?: FormOptions) => void;
    delete: (url: string, options?: FormOptions) => void;
};

export const useApiForm = <T extends FormDataShape>(initial: T): ApiForm<T> => {
    const defaults = structuredClone(initial);
    let transform: ((data: T) => Record<string, unknown>) | null = null;
    const state = reactive({
        ...structuredClone(initial),
        processing: false,
        errors: {} as ApiErrors,
    }) as T & { processing: boolean; errors: ApiErrors };

    const data = (): T => {
        const excluded = new Set(['processing', 'errors']);
        return Object.fromEntries(
            Object.entries(state).filter(([key]) => !excluded.has(key)),
        ) as T;
    };

    const clearErrors = (...keys: string[]): void => {
        if (keys.length === 0) {
            state.errors = {};
            return;
        }
        for (const key of keys) delete state.errors[key];
    };

    const reset = (...keys: (keyof T)[]): void => {
        const targets = keys.length > 0 ? keys : (Object.keys(defaults) as (keyof T)[]);
        const mutable = state as Record<string, unknown>;
        for (const key of targets) mutable[String(key)] = structuredClone(defaults[key]);
        clearErrors();
    };

    const submit = (method: string, url: string, options: FormOptions = {}): void => {
        state.processing = true;
        clearErrors();
        const payload = transform ? transform(data()) : data();
        void visitApi(url, {
            ...options,
            method,
            data: payload,
            onError: (errors) => {
                state.errors = errors;
                options.onError?.(errors);
            },
            onFinish: () => {
                state.processing = false;
                options.onFinish?.();
            },
        });
    };

    return Object.assign(state, {
        data,
        clearErrors,
        reset,
        transform(callback: (value: T) => Record<string, unknown>) {
            transform = callback;
            return state as ApiForm<T>;
        },
        post: (url: string, options?: FormOptions) => submit('POST', url, options),
        patch: (url: string, options?: FormOptions) => submit('PATCH', url, options),
        delete: (url: string, options?: FormOptions) => submit('DELETE', url, options),
    }) as ApiForm<T>;
};

export const apiRouter = {
    post: (url: string, data: Record<string, unknown>, options?: FormOptions) =>
        void visitApi(url, { ...options, method: 'POST', data }),
    patch: (url: string, data: Record<string, unknown>, options?: FormOptions) =>
        void visitApi(url, { ...options, method: 'PATCH', data }),
    delete: (url: string, options?: FormOptions & { data?: Record<string, unknown> }) =>
        void visitApi(url, { ...options, method: 'DELETE', data: options?.data ?? {} }),
    visit: (url: string | URL, options: ApiVisitOptions = {}) =>
        void visitApi(String(url), options),
    reload: (options?: { only?: string[] }) => {
        void options;
        window.dispatchEvent(new CustomEvent('silabos:reload'));
    },
    on: (event: 'before', listener: (event: BeforeVisitEvent) => void) => {
        if (event !== 'before') {
            return () => undefined;
        }

        beforeVisitListeners.add(listener);

        return () => {
            beforeVisitListeners.delete(listener);
        };
    },
};
