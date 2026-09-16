<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { nextTick, onMounted, ref, watch } from "vue";

withDefaults(
  defineProps<{ label: string; placeholder?: string; disabled?: boolean }>(),
  { placeholder: "Empiece a redactar el documento…", disabled: false },
);

const model = defineModel<string>({ default: "" });
const editor = ref<HTMLElement | null>(null);
const lastEmitted = ref<string | null>(null);
const tableRows = ref(2);
const tableColumns = ref(3);

const renderMarkdown = (value: string): string =>
  DOMPurify.sanitize(marked.parse(value, { async: false, gfm: true, breaks: true }));

const normalize = (value: string): string =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const nodesToMarkdown = (nodes: NodeListOf<ChildNode> | ChildNode[]): string =>
  Array.from(nodes).map(nodeToMarkdown).join("");

const listToMarkdown = (list: HTMLElement, ordered: boolean): string => {
  const items = Array.from(list.children).filter(
    (child): child is HTMLLIElement => child.tagName === "LI",
  );
  return `${items
    .map((item, index) => {
      const content = nodesToMarkdown(
        Array.from(item.childNodes).filter(
          (node) => !(node instanceof HTMLElement && ["OL", "UL"].includes(node.tagName)),
        ),
      ).trim();
      const nested = Array.from(item.children)
        .filter((child) => ["OL", "UL"].includes(child.tagName))
        .map((child) =>
          listToMarkdown(child as HTMLElement, child.tagName === "OL")
            .trim()
            .split("\n")
            .map((line) => `  ${line}`)
            .join("\n"),
        )
        .join("\n");
      return `${ordered ? `${index + 1}.` : "-"} ${content}${nested ? `\n${nested}` : ""}`;
    })
    .join("\n")}\n\n`;
};

const tableToMarkdown = (table: HTMLTableElement): string => {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) =>
      nodesToMarkdown(cell.childNodes).replace(/\|/g, "\\|").replace(/\n+/g, " ").trim(),
    ),
  );
  if (!rows.length || !rows[0]?.length) return "";
  const line = (cells: string[]): string => `| ${cells.join(" | ")} |`;
  return `${[
    line(rows[0]),
    line(rows[0].map(() => "---")),
    ...rows.slice(1).map(line),
  ].join("\n")}\n\n`;
};

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const content = nodesToMarkdown(node.childNodes);
  switch (node.tagName) {
    case "BR": return "\n";
    case "H1": return `# ${content.trim()}\n\n`;
    case "H2": return `## ${content.trim()}\n\n`;
    case "H3": return `### ${content.trim()}\n\n`;
    case "P": case "DIV": return `${content.trim()}\n\n`;
    case "STRONG": case "B": return `**${content}**`;
    case "EM": case "I": return `_${content}_`;
    case "S": case "STRIKE": case "DEL": return `~~${content}~~`;
    case "CODE": return node.parentElement?.tagName === "PRE" ? content : `\`${content}\``;
    case "PRE": return `\`\`\`\n${node.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
    case "BLOCKQUOTE": return `${content.trim().split("\n").filter(Boolean).map((line) => `> ${line}`).join("\n")}\n\n`;
    case "UL": return listToMarkdown(node, false);
    case "OL": return listToMarkdown(node, true);
    case "A": return node.getAttribute("href") ? `[${content}](${node.getAttribute("href")})` : content;
    case "HR": return "---\n\n";
    case "TABLE": return tableToMarkdown(node as HTMLTableElement);
    default: return content;
  }
}

const syncModel = (): void => {
  if (!editor.value) return;
  const markdown = normalize(nodesToMarkdown(editor.value.childNodes));
  lastEmitted.value = markdown;
  model.value = markdown;
};

const focus = (): void => editor.value?.focus();
const command = (name: string, value?: string): void => {
  focus();
  document.execCommand(name, false, value);
  syncModel();
};

const selectionRange = (): Range | null => {
  const selection = window.getSelection();
  if (!editor.value || !selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return editor.value.contains(range.commonAncestorContainer) ? range : null;
};

const insertNode = (node: HTMLElement): void => {
  focus();
  const range = selectionRange();
  if (!range || !editor.value) {
    editor.value?.append(node);
  } else {
    range.deleteContents();
    range.insertNode(node);
  }
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  node.after(paragraph);
  syncModel();
};

const insertLink = (): void => {
  const raw = window.prompt("Dirección del enlace (https://…):");
  if (!raw) return;
  try {
    const url = new URL(raw);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return;
    const range = selectionRange();
    if (!range) return;
    const link = document.createElement("a");
    link.href = url.href;
    link.textContent = range.toString().trim() || "Texto del enlace";
    range.deleteContents();
    range.insertNode(link);
    syncModel();
  } catch {
    return;
  }
};

const insertTable = (): void => {
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  Array.from({ length: tableColumns.value }, (_, index) => {
    const cell = document.createElement("th");
    cell.textContent = `Columna ${index + 1}`;
    head.append(cell);
  });
  const body = table.createTBody();
  Array.from({ length: Math.max(1, tableRows.value - 1) }, () => {
    const row = body.insertRow();
    Array.from({ length: tableColumns.value }, () => row.insertCell());
  });
  insertNode(table);
};

const insertSeparator = (): void => insertNode(document.createElement("hr"));

const pastePlainText = (event: ClipboardEvent): void => {
  document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? "");
  syncModel();
};

onMounted(() => {
  if (editor.value) editor.value.innerHTML = renderMarkdown(model.value);
});
watch(model, (value) => {
  if (value === lastEmitted.value || !editor.value) return;
  void nextTick(() => {
    if (editor.value) editor.value.innerHTML = renderMarkdown(value);
  });
});
</script>

<template>
  <div class="visual-markdown-editor" :data-disabled="disabled || undefined">
    <div class="visual-editor-toolbar" role="toolbar" aria-label="Formato del documento" @mousedown.prevent>
      <button type="button" :disabled="disabled" @click="command('formatBlock', '<h2>')">Título</button>
      <button type="button" :disabled="disabled" @click="command('formatBlock', '<h3>')">Subtítulo</button>
      <button type="button" :disabled="disabled" aria-label="Negrita" @click="command('bold')"><strong>B</strong></button>
      <button type="button" :disabled="disabled" aria-label="Cursiva" @click="command('italic')"><em>I</em></button>
      <button type="button" :disabled="disabled" @click="command('insertUnorderedList')">Lista</button>
      <button type="button" :disabled="disabled" @click="command('insertOrderedList')">Numerada</button>
      <button type="button" :disabled="disabled" @click="command('formatBlock', '<blockquote>')">Cita</button>
      <button type="button" :disabled="disabled" @click="insertLink">Enlace</button>
      <button type="button" :disabled="disabled" @click="insertSeparator">Separador</button>
      <span class="visual-table-control"><label>Filas <input v-model.number="tableRows" type="number" min="2" max="6" :disabled="disabled" /></label><label>Columnas <input v-model.number="tableColumns" type="number" min="1" max="6" :disabled="disabled" /></label><button type="button" :disabled="disabled" @click="insertTable">Insertar tabla</button></span>
    </div>
    <div class="visual-editor-canvas">
      <div
        ref="editor"
        class="visual-editor-page"
        :contenteditable="!disabled"
        role="textbox"
        aria-multiline="true"
        :aria-label="label"
        :aria-disabled="disabled"
        :data-placeholder="placeholder"
        spellcheck="true"
        @input="syncModel"
        @paste.prevent="pastePlainText"
        @drop.prevent
      />
    </div>
  </div>
</template>
