type Entity = string | { id: string };

const idOf = (value: Entity): string =>
    typeof value === 'string' ? value : value.id;

const endpoint = <T extends (...args: never[]) => string>(url: T) => ({ url });

export const TemplateRoutes = {
    storeLogo: {
        url: () => '/admin/template/logo',
        form: () => ({ action: '/admin/template/logo', method: 'post' as const }),
    },
    updateAppearance: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/appearance`,
    ),
    updateTitle: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/title`,
    ),
    storeSection: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/sections`,
    ),
    updateSection: endpoint(
        ({ template, section }: { template: Entity; section: Entity }) =>
            `/admin/template/${idOf(template)}/sections/${idOf(section)}`,
    ),
    destroySection: endpoint(
        ({ template, section }: { template: Entity; section: Entity }) =>
            `/admin/template/${idOf(template)}/sections/${idOf(section)}`,
    ),
    storeField: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/fields`,
    ),
    updateField: endpoint(
        ({ template, field }: { template: Entity; field: Entity }) =>
            `/admin/template/${idOf(template)}/fields/${idOf(field)}`,
    ),
    destroyBlock: endpoint(
        ({ template, block }: { template: Entity; block: Entity }) =>
            `/admin/template/${idOf(template)}/blocks/${idOf(block)}`,
    ),
    updateDocument: endpoint(
        ({ template, block }: { template: Entity; block: Entity }) =>
            `/admin/template/${idOf(template)}/blocks/${idOf(block)}/document`,
    ),
    reorderSections: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/sections/order`,
    ),
    reorderBlocks: endpoint((template: Entity) =>
        `/admin/template/${idOf(template)}/blocks/order`,
    ),
};

export default TemplateRoutes;
