import type { Side } from 'driver.js';

/** Un paso de la guía de una pantalla: resalta un elemento real; si no existe en ese momento, se omite. */
export type TourStep = { selector: string; title: string; description: string; side?: Side };

const step = (selector: string, title: string, description: string, side?: Side): TourStep => ({ selector, title, description, side });

const TABLE = '[data-slot="table-container"]';
const FILTERS = '[data-tour="filters"]';
const ACTIONS = '[data-tour="page-actions"]';
const TABS = '[role="tablist"]';
const METRICS = '[data-tour="metrics"]';
const DEADLINE = '[data-tour="deadline"]';
const CHECKLIST = '.driver-checklist-launcher';

const shell = {
  menu: step('[data-sidebar="sidebar"]', 'Menú', 'Aquí están todas sus pantallas. El botón de arriba a la izquierda lo esconde o lo muestra', 'right'),
  notifications: step('[aria-label^="Notificaciones"]', 'Avisos', 'Aquí le llegan los avisos. Pulse uno para ir a donde corresponde', 'bottom'),
  theme: step('[aria-label^="Tema visual"]', 'Claro u oscuro', 'Cambia los colores de la pantalla', 'bottom'),
  user: step('[aria-label="Menú de usuario"]', 'Su cuenta', 'Cambie de carrera o de rol, vea su perfil o cierre la sesión', 'bottom'),
  accessibility: step('[aria-label="Accesibilidad"]', 'Accesibilidad', 'Agrande el texto, suba el contraste o quite las animaciones', 'bottom'),
};
const basics = [shell.menu, shell.notifications, shell.theme, shell.accessibility, shell.user];

const checklist = step(CHECKLIST, 'Antes de empezar', 'Lo que falta preparar antes de abrir una convocatoria. Pulse un paso y le mostramos dónde se hace', 'left');

/** Guía por pantalla, con la ruta del frontend como clave. Después de estos pasos, la guía cierra sola. */
export const screenTours: Record<string, TourStep[]> = {
  '/admin/convocatorias': [
    step(METRICS, 'Resumen', 'Cómo va la convocatoria: avance, días que faltan y carreras que aún no empiezan', 'bottom'),
    step(ACTIONS, 'Nueva convocatoria', 'Ponga las fechas de clases y de entrega de sílabos. Se activa al terminar «Antes de empezar». Solo puede haber una a la vez', 'left'),
    step(FILTERS, 'Buscar', 'Busque un período o filtre por estado', 'bottom'),
    step(TABLE, 'Períodos', 'Pulse un período para ver qué puede hacer: abrir, pausar, dar más plazo, finalizar o eliminar', 'top'),
    checklist,
    ...basics,
  ],
  '/admin/estructura-academica': [
    step(ACTIONS, 'Crear', 'Cree una facultad o una carrera. Las carreras también se pueden subir con un Excel', 'left'),
    step(TABS, 'Facultades y carreras', 'Cambie entre la lista de facultades y la de carreras', 'bottom'),
    step(FILTERS, 'Buscar', 'Busque por nombre o filtre por campus', 'bottom'),
    step(TABLE, 'Lista', 'Pulse una fila para editarla. Nada se borra: lo que ya no se usa se desactiva', 'top'),
  ],
  '/admin/usuarios': [
    step(ACTIONS, 'Crear cuentas', 'Cree una cuenta o suba varias con un Excel. Cada persona recibe un correo para entrar', 'left'),
    step(FILTERS, 'Buscar', 'Busque por nombre o correo, o filtre por rol, carrera o estado', 'bottom'),
    step(TABLE, 'Cuentas', 'Pulse una persona para ver sus datos, cambiar sus roles o quitarle el acceso', 'top'),
  ],
  '/admin/plantilla': [
    step('[data-tour="template-edit"]', 'Editar', 'Abre la plantilla para cambiarla. Si hay una convocatoria abierta, primero páusela', 'left'),
    // Pasos del editor: solo aparecen mientras se edita.
    step('[data-tour="template-back"]', 'Volver', 'Sale del editor. Si no guardó, le avisa antes', 'bottom'),
    step('[aria-label="Formato del texto"]', 'Formato', 'Negrita, colores, listas y tablas. Escriba dentro de un campo para usarlo', 'bottom'),
    step('[data-tour="template-selection"]', 'Campo elegido', 'Pulse un campo de la hoja y aquí elige quién lo llena, lo mueve o lo borra', 'bottom'),
    step('[aria-label="Opciones avanzadas"]', 'Más opciones', 'Márgenes y tamaño de letra. También puede reemplazar toda la plantilla con un archivo', 'bottom'),
    step('[data-tour="template-save"]', 'Guardar', 'Guarda sus cambios. Un punto en el botón le avisa que falta guardar', 'bottom'),
    step('[data-sheet]', 'La hoja', 'Así se verá el sílabo. Escriba directo sobre ella. Pase el ratón entre dos campos para agregar uno nuevo', 'left'),
    step('[data-tour="template-assistant"]', 'Asistente', 'Pídale cambios con sus palabras. Si le gusta la propuesta, aplíquela y luego guarde', 'left'),
  ],
  '/admin/auditoria': [
    step(FILTERS, 'Filtros', 'Filtre por período, rol, carrera, actividad o si salió bien', 'bottom'),
    step(TABLE, 'Registro', 'Quién hizo qué y cuándo. Solo se puede consultar', 'top'),
  ],
  '/admin/configuracion/perfil': [
    step('[data-tour="profile-form"]', 'Sus datos', 'Cambie su nombre. El correo solo se puede cambiar antes de activar la cuenta', 'top'),
  ],
  '/admin/configuracion/seguridad': [
    step('[data-tour="security-password"]', 'Contraseña', 'Escriba la actual y la nueva para cambiarla', 'top'),
    step('[data-tour="security-reset"]', 'Por correo', 'Si no recuerda su contraseña, le enviamos un enlace para crear otra', 'top'),
    step('[data-tour="security-2fa"]', 'Doble verificación', 'Al entrar le pide también un código del celular. Guarde los códigos de respaldo por si lo pierde', 'top'),
  ],
  '/admin/configuracion/sistema': [
    step('[data-tour="settings-notices"]', 'Correos', 'Active o apague los avisos por correo y elija a qué hora llega el resumen del día', 'bottom'),
    step('[data-tour="settings-ai"]', 'Asistente', 'Conecte el asistente con un servicio de inteligencia artificial y pruebe que funcione', 'bottom'),
    step('[data-tour="settings-library"]', 'Biblioteca', 'Conecte el catálogo de la biblioteca para que los docentes busquen libros', 'top'),
  ],
  '/admin/notificaciones': [
    step(ACTIONS, 'Marcar todo', 'Marca todos los avisos como leídos', 'left'),
    step('nav[aria-label="Filtrar notificaciones"]', 'Ver', 'Vea solo los nuevos o todos', 'bottom'),
    step('[data-tour="notifications-list"]', 'Avisos', 'Pulse «Abrir» para ir a donde corresponde, o «Marcar leída» para quitarlo de los nuevos', 'top'),
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
    step('[role="tablist"]', 'Documentos de apoyo', 'Suba PDF, Word o Excel para que sus docentes conozcan mejor sus asignaturas', 'bottom'),
  ],
  '/coordinacion/malla': [
    step(ACTIONS, 'Editar malla', 'Modifique ciclos, materias y relaciones. «Relaciones» las lista en una tabla', 'left'),
  ],
  '/biblioteca/revisiones': [
    step(ACTIONS, 'Historial', 'Los sílabos de períodos terminados, en solo lectura', 'left'),
    step(FILTERS, 'Filtrar', 'Por facultad si se reparten el trabajo; el sistema recuerda su elección', 'bottom'),
    step(TABLE, 'En revisión', 'Los sílabos que Coordinación ya aprobó. Pulse uno para revisar su bibliografía y firmar, o devolverlo al docente', 'top'),
    shell.notifications,
    shell.theme,
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
