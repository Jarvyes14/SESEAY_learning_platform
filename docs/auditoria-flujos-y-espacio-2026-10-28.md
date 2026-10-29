# Auditoría de flujos, visuales y uso del espacio

Fecha: 28 de octubre de 2026. Entorno local de la plataforma.

## Resultado

La navegación principal, el acceso por permisos, el ciclo de cursos y las actividades funcionan en los casos revisados. Hay cuatro problemas de integridad del aprendizaje que conviene resolver antes de priorizar ajustes visuales: emisión a participantes reprobados, reactivación de certificados revocados, duración de video manipulable y omisión de tiempos mínimos en actividades modulares.

No se modificó el comportamiento de la aplicación durante esta auditoría. Las cuentas, roles, cursos, actividades, autorizaciones y plantillas creados para las comprobaciones se eliminaron al terminar.

## Cobertura y evidencia

- 38 pruebas unitarias y de API: 37 aprobadas y 1 fallida por un mock desactualizado de plantillas.
- 71 comprobaciones de flujo y accesibilidad en navegador/API: 65 aprobadas y 6 fallidas. Las seis fallidas corresponden a los cuatro problemas de integridad y a dos problemas de teclado del diálogo de roles.
- 88 estados visuales medidos en 320×740, 390×844, 768×1024, 1366×768, 1920×1080 y 844×390.
- Páginas públicas revisadas en móvil y escritorio: acceso, registro, recuperación, restablecimiento y página inexistente.
- Ningún desbordamiento horizontal global detectado en los estados medidos. Las tablas sí requieren desplazamiento horizontal dentro de su contenedor en móvil.
- Ninguna excepción de JavaScript registrada en los recorridos del navegador.
- Compilación y ESLint del frontend correctos.

Flujos ejercitados: inicio de sesión de administrador y participante, registro autorizado, creación y edición de roles con usuarios, bloqueo de eliminación, retirada de permisos con sesión activa, bloqueo de rutas administrativas, creación/publicación de curso, inscripción, orden de desbloqueo, ocultamiento de respuestas antes de enviar, evaluación automática, tarea pendiente de revisión, calificación manual, emisión/revocación de certificado, reinicio de progreso y retirada de inscripción.

Se crearon y recorrieron por API los 15 tipos de actividad disponibles, incluido el módulo compuesto con imagen. El reproductor se recorrió también en la interfaz con una lectura. Esto no sustituye comprobar la reproducción real de proveedores externos ni la entrega de correo: no se enviaron correos de recuperación ni se reprodujeron videos externos durante esta auditoría. Las pruebas se realizaron con Chromium; no se verificaron dispositivos físicos, Safari o Firefox ni una carga concurrente de muchos usuarios. Los tamaños de respuesta indicados son JSON decodificado, no mediciones de transferencia comprimida.

## 1. Correcciones de prioridad alta

### A. Se emiten certificados a participantes reprobados

**Confirmado:** un curso con mínimo aprobatorio de 70 terminó con avance del 100 %, calificación 0 y `passed=false`. La solicitud de certificado respondió 201 y creó el certificado.

**Causa:** el servicio comprueba que se completó el curso, pero no exige la aprobación.

**Propuesta:** exigir avance completo y aprobación calculada por el servidor tanto para reclamar como para emitir un certificado. La interfaz debe diferenciar «completado» de «aprobado» y explicar cuándo no se cumplen los requisitos.

Código: [certificate.service.js](C:/Users/javie/Documents/SESEAY/backend/src/services/certificate.service.js:33).

### B. Reclamar un certificado vuelve a activar uno revocado

**Confirmado:** después de revocar un certificado, reclamarlo de nuevo respondió 201; la verificación pública volvió a responder 200.

**Causa:** el `upsert` de emisión restablece `revokedAt` a `null`.

**Propuesta:** conservar la revocación. Una eventual rehabilitación debe ser una acción administrativa explícita con permiso y registro propios.

Código: [certificate.service.js](C:/Users/javie/Documents/SESEAY/backend/src/services/certificate.service.js:47).

### C. El porcentaje de video se calcula usando una duración enviada por el cliente

**Confirmado:** una actividad configurada para 600 segundos se marcó completada inmediatamente al enviar una duración inferior a la real. El servidor devolvió `completed=true` y 100 %.

Además, por inspección del frontend, el contador aumenta cuando la pestaña está visible, independientemente del estado real de reproducción del video.

**Propuesta:** utilizar siempre la duración configurada en el servidor y validar tiempos allí. En la interfaz, registrar reproducción y pausa mediante la API del reproductor; mantener visible una pestaña no debe equivaler a ver el video.

Código: [progress.routes.js](C:/Users/javie/Documents/SESEAY/backend/src/routes/progress.routes.js:206), [CoursePlayerPage.jsx](C:/Users/javie/Documents/SESEAY/frontend/src/pages/CoursePlayerPage.jsx:430).

### D. Los módulos permiten omitir tiempos mínimos de lectura

**Confirmado:** un módulo con lectura mínima de 300 segundos se completó con una respuesta inmediata, sin esperar ese tiempo; el servidor respondió 201.

**Causa:** la ruta compuesta valida los ejercicios calificables y concede finalización a los módulos de contenido sin verificar los tiempos requeridos.

**Propuesta:** registrar y validar el avance de cada módulo en el servidor, incluidos lectura y video, antes de completar la actividad compuesta.

Código: [progress.routes.js](C:/Users/javie/Documents/SESEAY/backend/src/routes/progress.routes.js:236).

## 2. Rendimiento y crecimiento

| Hallazgo | Evidencia | Mejora propuesta |
|---|---|---|
| Imágenes completas dentro de consultas de listas | Respuestas de inscripciones, certificados y plantillas de unos 2.58 MB con los datos actuales | Servir las imágenes por URL; devolver metadatos en listas y cargar la imagen o el detalle cuando se abre un certificado |
| Listas limitadas a los primeros 100 registros | Usuarios, cursos y catálogo solicitan `limit=100` y no ofrecen controles para consultar las páginas siguientes | Paginación y búsqueda en servidor; mostrar el total y conservar filtros |
| Carga completa del constructor y del catálogo de audiencias | Se devuelve la estructura completa y se consultan opciones de audiencia para abrir el constructor | Cargar detalles al abrir una lección y opciones de audiencia al abrir la configuración; buscar usuarios de forma paginada |
| Falta cobertura automatizada de las nuevas reglas | Un mock de `certificateTemplate` no incluye `findFirst`; no había pruebas de los fallos de integridad anteriores | Actualizar los mocks y añadir regresiones de certificados, tiempos y permisos dinámicos |

El fallo de la prueba de creación con certificado no se reprodujo contra la API real: la creación del curso con plantilla respondió 201 durante el recorrido. Es un problema de la prueba, distinto de los fallos reales de emisión y revocación.

Fuentes: [enrollments.routes.js](C:/Users/javie/Documents/SESEAY/backend/src/routes/enrollments.routes.js:27), [certificates.routes.js](C:/Users/javie/Documents/SESEAY/backend/src/routes/certificates.routes.js:126), [UsersPage.jsx](C:/Users/javie/Documents/SESEAY/frontend/src/pages/UsersPage.jsx:55), [InstructorDashboardPage.jsx](C:/Users/javie/Documents/SESEAY/frontend/src/pages/InstructorDashboardPage.jsx:35), [StudentDashboardPage.jsx](C:/Users/javie/Documents/SESEAY/frontend/src/pages/StudentDashboardPage.jsx:22), [settings.api.test.js](C:/Users/javie/Documents/SESEAY/tests/api/settings.api.test.js:38).

## 3. Optimización visual y del espacio

### Encabezado y navegación

En 1366×768, el encabezado mide **138 px**, aproximadamente el 18 % de la altura de la pantalla, antes del título del módulo. La marca, el usuario y la navegación se distribuyen en dos filas.

**Propuesta:** compactar las dos filas en escritorio convencional y permitir una sola fila en pantallas suficientemente anchas. Como objetivo de diseño, un encabezado de 96–104 px recuperaría unos 34–42 px en la resolución medida. Conservar el espacio de protección del logotipo configurado.

### Constructor de cursos

En 1366×768, el primer bloque empieza aproximadamente a los **656 px** desde la parte superior. El usuario ve poca estructura antes de desplazarse. El título, la explicación, los contadores y las acciones ocupan una tarjeta grande; «Guardar» pasa a otra línea.

**Propuesta:** una cabecera de trabajo compacta con título, estado y acciones; contadores en una línea secundaria; explicación desplegable. Usar bloques y lecciones plegables y mantener una barra de acciones accesible durante la edición.

### Usuarios

En móvil, la pantalla prioriza correos autorizados y organizaciones antes de mostrar personas usuarias. En la tabla, los anchos internos medidos son **768–904 px dentro de 341 px disponibles**.

**Propuesta:** separar «Usuarios», «Registros autorizados» y «Organizaciones» en pestañas. En móvil, mostrar tarjetas con nombre, correo, rol y estado, con acciones en un menú. En escritorio, conservar la tabla con búsqueda y paginación.

### Configuración

La página inicial de configuración mide aproximadamente **5002 px en móvil** y **3148 px en escritorio** con los datos actuales.

**Propuesta:** separar configuración general, identidad visual, acceso y sesiones; utilizar secciones plegables para ajustes avanzados. Mantener visibles el estado de cambios pendientes y la acción de guardar.

### Selector de permisos

El scroll interno y la visibilidad del pie del formulario aprobaron las comprobaciones en las seis resoluciones. Sin embargo, en móvil el formulario y la explicación ocupan casi toda la vista inicial; los permisos y su búsqueda aparecen más abajo.

**Propuesta:** reducir la explicación a un resumen desplegable, hacer opcional la descripción del rol y mantener buscador y selección por grupos accesibles dentro del área desplazable. Conservar la lista de todos los permisos y la ausencia de contadores solicitada anteriormente.

### Plantillas de certificados

El editor usa un desplazamiento diferente al del editor de roles. En móvil, los controles inferiores y las acciones de guardar quedan fuera de la primera vista.

**Propuesta:** reutilizar el patrón de diálogo con altura limitada, zona central desplazable y acciones fijas. Dar mayor espacio a la vista previa en escritorio y reducir su altura inicial en móvil.

### Acciones que aún no están disponibles

Importaciones, exportación de informes y duplicación aparecen deshabilitadas; en móvil algunas ocupan una fila completa sobre el contenido útil.

**Propuesta:** retirarlas del área principal o agruparlas en acciones secundarias. Priorizar una acción principal por pantalla.

## 4. Accesibilidad y coherencia de flujo

- **Confirmado con teclado:** el foco puede salir del diálogo de roles hacia controles de la página de fondo; Escape no lo cierra. Añadir foco inicial, contención del foco y restauración al cerrar. Mantener los controles accesibles también en modo de solo lectura.
- La tarjeta del administrador de plataforma muestra «Puedes editarlo» aunque el botón es «Ver permisos» y el rol está protegido. Ajustar el texto según las operaciones realmente permitidas.
- Varias pantallas muestran el estado vacío mientras cargan. Añadir estados de carga explícitos para evitar que «No hay registros» se confunda con una lista todavía pendiente.
- Al editar un curso o un rol, indicar cambios pendientes y advertir al cerrar si se perderían. Esto se identifica por inspección de los manejadores de cierre, no por una prueba de pérdida de datos existentes.
- Revisar las etiquetas empresariales del contenido histórico del tutorial por separado. Las etiquetas actuales de la interfaz ya usan «Participante»; la auditoría no reescribió contenido de cursos existentes.

## Orden recomendado

1. Corregir las cuatro reglas de integridad del aprendizaje y añadir regresiones.
2. Reducir el peso de las consultas de listas y añadir paginación.
3. Compactar encabezado y constructor; reorganizar Usuarios y Configuración.
4. Unificar los diálogos y corregir el manejo del teclado.
5. Afinar carga, cambios pendientes y textos de acciones disponibles.

## Archivos de evidencia

- [Resultados del recorrido principal](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/report.json).
- [Resultados de actividades y teclado](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/activities-report.json).
- [Encabezado y panel en escritorio](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/1366-admin.png).
- [Constructor en escritorio](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/1366-builder.png).
- [Selector de permisos en móvil](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/390-role-modal.png).
- [Selector desplazado hasta el final](C:/Users/javie/Documents/SESEAY/playwright-artifacts/full-audit/390-role-modal-bottom.png).

Las capturas tomadas durante las pruebas pueden incluir los registros temporales identificados como «Auditoría»; no permanecen en la plataforma. Las alturas y tamaños reflejan el contenido y la configuración del entorno local en el momento de la revisión, no una garantía para cualquier conjunto de datos.
