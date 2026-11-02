import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isControl = (element: Element): element is Control =>
    element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;

const isEmptyAriaRequired = (element: Control): boolean =>
    element.getAttribute('aria-required') === 'true' && !element.disabled && element.value.trim() === '';

const hasMissingFields = (form: HTMLFormElement): boolean =>
    Array.from(form.elements).some((element) => isControl(element) && ((element.willValidate && !element.validity.valid) || isEmptyAriaRequired(element)));

export function useFormIncomplete(button: Ref<HTMLElement | null>): Ref<boolean> {
    const incomplete = ref(false);
    let form: HTMLFormElement | null = null;
    let observer: MutationObserver | null = null;
    const update = (): void => {
        incomplete.value = form !== null && hasMissingFields(form);
    };

    onMounted(() => {
        const element = button.value;
        if (!(element instanceof HTMLButtonElement) || element.type !== 'submit') return;
        form = element.form;
        if (form === null || form.noValidate) {
            form = null;
            return;
        }
        form.addEventListener('input', update, true);
        form.addEventListener('change', update, true);
        observer = new MutationObserver(update);
        observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['required', 'aria-required', 'disabled'] });
        update();
    });

    onBeforeUnmount(() => {
        form?.removeEventListener('input', update, true);
        form?.removeEventListener('change', update, true);
        observer?.disconnect();
    });

    return incomplete;
}
