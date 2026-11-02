import type { Side } from 'driver.js';

/** Un paso de la guía de una pantalla: resalta un elemento real; si no existe en ese momento, se omite. */
export type TourStep = { selector: string; title: string; description: string; side?: Side };

const step = (selector: string, title: string, description: string, side?: Side): TourStep => ({ selector, title, description, side });

const TABLE = '[data-slot="table-container"]';
const FILTERS = '[data-tour="filters"]';
const ACTIONS = '[data-tour="page-actions"]';
const TABS = '[role="tablist"]';
const DEADLINE = '[data-tour="deadline"]';
const CHECKLIST = '.driver-checklist-launcher';

const shell = {
  menu: step('[data-sidebar="sidebar"]', 'Menú', 'Aquí están los módulos de su rol. Se oculta con el botón de arriba a la izquierda', 'right'),
  notifications: step('[aria-label^="Notificaciones"]', 'Notificaciones', 'Los avisos del período en curso. Pulse uno para ir a la pantalla relacionada', 'bottom'),
  user: step('[aria-label="Menú de usuario"]', 'Su cuenta', 'Desde aquí cambia de carrera o de rol, abre su perfil y cierra la sesión', 'bottom'),
  accessibility: step('[aria-label="Accesibilidad"]', 'Accesibilidad', 'Tamaño del texto, contraste, sin animaciones y más. Se guarda en su cuenta', 'bottom'),
};
const basics = [shell.menu, shell.notifications, shell.user, shell.accessibility];

const checklist = step(CHECKLIST, 'Antes de empezar', 'Los pasos previos para abrir la convocatoria. Pulse uno y le mostramos dónde se hace', 'left');

/** Guía por pantalla, con la ruta del frontend como clave. Después de estos pasos, la guía cierra sola. */
export const screenTours: Record<string, TourStep[]> = {
  '/admin/convocatorias': [
    step(ACTIONS, 'Nueva convocatoria', 'Abre la convocatoria institucional con las fechas del período y del plazo de entrega. Se habilita al terminar «Antes de empezar»', 'left'),
    step(TABLE, 'Períodos', 'Cada fila es un período. En el menú de la fila abre, pausa, reanuda o cierra la convocatoria y extiende el plazo', 'top'),
    checklist,
    ...basics,
  ],
  '/admin/estructura-academica': [
    step(TABS, 'Catálogos', 'Cambie entre facultades, carreras, coordinadores y períodos académicos', 'bottom'),
    step(FILTERS, 'Buscar y filtrar', 'Encuentre un registro por nombre o por estado', 'bottom'),
    step(ACTIONS, 'Crear o importar', 'Cree un registro o importe carreras desde Excel', 'left'),
    step(TABLE, 'Registros', 'Pulse una fila para editarla o desactivarla. Lo que tiene historial no se elimina, solo se desactiva', 'top'),
  ],
  '/admin/usuarios': [
    step(ACTIONS, 'Crear cuentas', 'Cree una cuenta o importe varias desde Excel. Cada persona recibe una invitación por correo', 'left'),
    step(FILTERS, 'Buscar y filtrar', 'Busque por nombre o correo, o filtre por rol y estado', 'bottom'),
    step(TABLE, 'Cuentas', 'Pulse una fila para ver el detalle. El «+1» junto al rol indica que la persona tiene otros roles', 'top'),
  ],
  '/admin/plantilla': [
    step(ACTIONS, 'Plantilla', 'Edite el formato único del sílabo o cargue el formato oficial. Con una convocatoria abierta está bloqueada: pause la convocatoria para cambiarla', 'left'),
  ],
  '/admin/auditoria': [
    step(FILTERS, 'Filtros', 'Acote por fecha, persona, acción o resultado', 'bottom'),
    step(TABLE, 'Registro', 'Quién hizo qué, cuándo y con qué rol. Es solo de consulta', 'top'),
  ],
  '/coordinacion/revisiones': [
    step(ACTIONS, 'Convocatoria de su carrera', 'Desde aquí abre, pausa o reanuda la convocatoria. «Abrir» se habilita cuando están completos los pasos previos', 'left'),
    step(DEADLINE, 'Plazo de entrega', 'La fecha límite que tienen los docentes. Pasado el plazo, solo Administración puede ampliarlo', 'bottom'),
    step(TABS, 'Cola y seguimiento', '«Cola de revisión» es lo que le toca revisar ahora. «Seguimiento» muestra todos los sílabos con su estado', 'bottom'),
    step(TABLE, 'Sílabos por revisar', 'Pulse un sílabo para aprobarlo o pedir correcciones. Al aprobarlo pasa a Biblioteca', 'top'),
    checklist,
    ...basics,
  ],
  '/coordinacion/materias-asignaciones': [
    step(FILTERS, 'Buscar materias', 'Encuentre una materia por nombre o código', 'bottom'),
    step(TABLE, 'Materias del período', 'Marque una o varias para programarlas, crear sus paralelos y elegir el docente de cada uno', 'top'),
    step(ACTIONS, 'Acciones', 'Aquí aparecen las acciones sobre las materias que marcó', 'left'),
  ],
  '/coordinacion/docentes': [
    step(ACTIONS, 'Nuevo docente', 'Cree un docente o importe varios desde Excel. Cada uno recibe una invitación por correo', 'left'),
    step(TABLE, 'Docentes', 'Sus cuentas y los paralelos que dictan en el período. Desde el menú de la fila los corrige o los retira de la carrera', 'top'),
  ],
  '/coordinacion/proyecto-carrera': [
    step(ACTIONS, 'Importar desde Excel', 'Descargue la plantilla de su carrera, complétela y cárguela para llenar varias materias a la vez', 'left'),
    step(TABLE, 'Proyecto de carrera por materia', 'Pulse una materia para editar su proyecto de carrera: lo que el docente recibe ya escrito', 'top'),
  ],
  '/coordinacion/documentos-apoyo': [
    step(ACTIONS, 'Subir documento', 'Suba un PDF, Word o Excel para los docentes de la carrera', 'left'),
    step(TABLE, 'Documentos', 'Pulse uno para verlo. Desde el menú de la fila lo descarga o lo elimina', 'top'),
  ],
  '/coordinacion/malla': [
    step(ACTIONS, 'Editar malla', 'Modifique ciclos, materias y relaciones. «Relaciones» las lista en una tabla', 'left'),
  ],
  '/biblioteca/revisiones': [
    step(ACTIONS, 'Historial', 'Los sílabos de períodos terminados, en solo lectura', 'left'),
    step(FILTERS, 'Filtrar', 'Por facultad si se reparten el trabajo; el sistema recuerda su elección', 'bottom'),
    step(TABLE, 'En revisión', 'Los sílabos que Coordinación ya aprobó. Pulse uno para revisar su bibliografía y firmar, o devolverlo al docente', 'top'),
    shell.notifications,
    shell.user,
  ],
  '/biblioteca/historial': [
    step(FILTERS, 'Filtros', 'Por período o facultad. «Solo los míos» muestra los que usted firmó o devolvió', 'bottom'),
    step(TABLE, 'Sílabos', 'Pulse una fila para abrirla. En los aprobados puede ver el PDF completo', 'top'),
  ],
  '/docente/mis-silabos': [
    step(DEADLINE, 'Plazo', 'La fecha límite de entrega. Pasado el plazo solo puede consultar sus sílabos', 'bottom'),
    step(TABLE, 'Sus sílabos', 'Uno por cada paralelo que dicta. Pulse uno para empezar o continuar. Al primer envío lo firma con su archivo .p12', 'top'),
    ...basics,
  ],
};

screenTours['/admin/estructura-academica/:section'] = screenTours['/admin/estructura-academica']!;
