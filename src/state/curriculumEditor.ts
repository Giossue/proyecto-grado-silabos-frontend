import { readonly, ref } from 'vue';

const open = ref(false);

export const curriculumEditorState = {
  open: readonly(open),
  setOpen(value: boolean): void {
    open.value = value;
  },
};
