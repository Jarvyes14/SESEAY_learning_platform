# Estrategia y catálogo de pruebas

Las pruebas se dividen en tres capas. Todas tienen nombres descriptivos en español y cada ejecución deja un registro en `test-results/test-history.jsonl`, además del archivo de salida más reciente por suite. `npm run test:report` genera el resumen `test-results/TEST-HISTORY.md`.

## Pruebas unitarias

Archivo | Caso | Qué comprueba
---|---|---
`tests/unit/platform-settings.test.js` | Contraseña válida | Una contraseña conforme a la política no produce errores.
`tests/unit/platform-settings.test.js` | Contraseña inválida | Se reportan simultáneamente longitud, mayúscula, número y carácter especial faltantes.
`tests/unit/platform-settings.test.js` | Configuración pública | La marca es pública, pero los límites internos de sesiones y recuperación no se filtran.
`tests/unit/roles.test.js` | Administrador permitido | El rol administrador puede continuar una operación protegida.
`tests/unit/roles.test.js` | Estudiante rechazado | Un estudiante recibe 403 ante una operación administrativa.
`tests/unit/roles.test.js` | Sesión ausente | Una petición sin persona autenticada recibe 401.
`tests/unit/certificate-issuance.test.js` | Curso completo con plantilla | La finalización del curso habilita que la persona reclame el certificado.
`tests/unit/certificate-issuance.test.js` | Curso incompleto | Una persona que aún no termina no recibe certificado.
`tests/unit/certificate-issuance.test.js` | Curso sin plantilla | Un curso configurado sin certificado nunca lo emite.
`tests/unit/certificate-issuance.test.js` | Copia visual | La emisión conserva el fondo, posición y estilo del nombre para futuras vistas.
`tests/unit/certificate-preview.test.js` | Escala del texto | El tamaño del nombre se expresa como proporción del certificado para verse igual en editor, miniatura y emisión.

## Pruebas de API con Supertest

Archivo | Caso | Qué comprueba
---|---|---
`tests/api/settings.api.test.js` | Salud del servicio | Express responde con el contrato esperado.
`tests/api/settings.api.test.js` | Marca pública | La configuración visual pública se obtiene sin sesión y omite datos internos.
`tests/api/settings.api.test.js` | Configuración sin sesión | El endpoint administrativo devuelve 401.
`tests/api/settings.api.test.js` | Configuración como estudiante | El endpoint administrativo devuelve 403.
`tests/api/settings.api.test.js` | Lectura como administrador | El administrador obtiene la configuración completa.
`tests/api/settings.api.test.js` | Escritura como estudiante | Un estudiante no puede cambiar los colores.
`tests/api/settings.api.test.js` | Datos inválidos | Un administrador tampoco puede guardar un color inválido.
`tests/api/settings.api.test.js` | Escritura como administrador | Una actualización válida se acepta y devuelve el valor persistido.
`tests/api/settings.api.test.js` | Calificaciones sin sesión | El resumen de calificaciones devuelve 401 sin autenticación.
`tests/api/settings.api.test.js` | Calificaciones como estudiante | El resumen limita la consulta a las inscripciones del estudiante autenticado.
`tests/api/settings.api.test.js` | Plantillas como estudiante | Un estudiante recibe 403 al intentar abrir el diseñador de certificados.
`tests/api/settings.api.test.js` | Plantillas como administrador | Un administrador puede consultar las plantillas disponibles.
`tests/api/settings.api.test.js` | Imagen de plantilla inválida | La API rechaza fondos que no sean imágenes embebidas permitidas.
`tests/api/settings.api.test.js` | Creación de plantilla | Guarda el diseño sin asociarlo a ningún curso.
`tests/api/settings.api.test.js` | Curso sin certificado | Permite crear un curso sin seleccionar plantilla y mantiene deshabilitada la emisión.
`tests/api/settings.api.test.js` | Curso con certificado | Seleccionar una plantilla la asocia al curso y habilita la emisión.

La suite usa dependencias controladas en memoria: no modifica la base de datos de desarrollo.

## Pruebas E2E con Playwright

Archivo | Caso | Qué comprueba
---|---|---
`tests/e2e/platform.spec.js` | Acceso en español | Los textos principales de autenticación están traducidos.
`tests/e2e/platform.spec.js` | Ruta protegida sin sesión | Una persona anónima no puede abrir Configuración y es redirigida.
`tests/e2e/platform.spec.js` | Administrador autorizado | El acceso funciona y muestra colores, logo y guardado de marca.
`tests/e2e/platform.spec.js` | Explorador de calificaciones | Permite alternar agrupación por curso/estudiante y abrir el detalle de una fila.
`tests/e2e/platform.spec.js` | Certificados opcionales por curso | Un administrador crea una plantilla, la asigna a un curso, restaura la configuración previa y elimina la plantilla temporal.

Antes de E2E, la plataforma debe estar disponible en `http://localhost:3000`. Se puede cambiar con `E2E_BASE_URL`; las credenciales se configuran con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`.

## Comandos

```bash
npm run test:unit
npm run test:api
npm run test:e2e
npm run test:all
npm run test:report
```
