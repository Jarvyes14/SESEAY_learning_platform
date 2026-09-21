# Despliegue en Produccion

Guia minima para desplegar la plataforma en una maquina virtual usando Docker, Docker Compose y un dominio comprado en GoDaddy.

## Requisitos del servidor

La maquina virtual debe tener:

- Linux, recomendado Ubuntu Server 22.04 o 24.04
- Docker instalado
- Docker Compose instalado
- Puertos abiertos: `80` y `443`
- Dominio o subdominio apuntando a la IP publica del servidor

Servicios incluidos:

- `proxy`: Caddy, expone la web con HTTPS
- `frontend`: React compilado y servido con Nginx
- `backend`: Express API
- `postgres`: base de datos PostgreSQL
- `pgadmin`: opcional, solo para administracion

## Modulo de cursos

Los administradores e instructores autorizados pueden crear cursos como borrador, organizarlos en bloques y lecciones, agregar contenidos y ejercicios, configurar calificacion y certificados, seleccionar la audiencia y publicarlos.

La audiencia de un curso puede limitarse a:

- Todas las cuentas de un rol.
- Una organizacion.
- Una seleccion de usuarios especificos.

Cualquier cuenta activa puede participar como aprendiz, independientemente de que su rol sea administrador, docente o estudiante. El menu `My learning` muestra exclusivamente los cursos publicados asignados a su rol, organizacion o cuenta; el menu `Courses` permanece separado para la construccion y administracion de contenido.

El `seed` crea de forma idempotente el curso publicado `Tutorial para crear cursos en la plataforma`, con cuatro bloques, ocho lecciones y ejemplos de los contenidos y ejercicios disponibles.

## 1. Configurar DNS en GoDaddy

En GoDaddy, entra a la administracion DNS del dominio y crea un registro tipo `A`.

Ejemplo para dominio principal:

```text
Type: A
Name: @
Value: IP_PUBLICA_DE_LA_VM
TTL: 600
```

Ejemplo para subdominio:

```text
Type: A
Name: capacitacion
Value: IP_PUBLICA_DE_LA_VM
TTL: 600
```

Con el ejemplo anterior, la plataforma quedaria en:

```text
https://capacitacion.tudominio.com
```

Espera a que el DNS propague antes de levantar la aplicacion.

Puedes verificarlo con:

```bash
nslookup capacitacion.tudominio.com
```

Debe responder con la IP publica de la maquina virtual.

## 2. Abrir puertos en la VM

En el firewall del proveedor de la VM abre:

```text
80/tcp
443/tcp
```

Si usas `ufw` dentro del servidor:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
```

No expongas PostgreSQL publicamente.

## 3. Crear archivo `.env`

En el servidor, dentro de la carpeta del proyecto:

```bash
cp .env.example .env
```

Edita el archivo:

```bash
nano .env
```

Configura estos valores:

```env
APP_DOMAIN=capacitacion.tudominio.com
PUBLIC_APP_URL=https://capacitacion.tudominio.com
PUBLIC_API_URL=/api
ACME_EMAIL=admin@tudominio.com

POSTGRES_USER=integrity
POSTGRES_PASSWORD=CAMBIA_ESTE_PASSWORD_POR_UNO_SEGURO
POSTGRES_DB=integrity_learning

JWT_SECRET=CAMBIA_ESTE_VALOR_POR_UN_SECRETO_LARGO
JWT_EXPIRES_IN=7d
MAX_ACTIVE_SESSIONS=5
COOKIE_NAME=integrity_token
COOKIE_SECURE=true
CLIENT_URL=https://capacitacion.tudominio.com
INITIAL_ADMIN_EMAIL=admin@tudominio.com
INITIAL_ADMIN_PASSWORD=CAMBIA_ESTA_CONTRASENA_INICIAL

SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notificaciones@tudominio.com
SMTP_PASSWORD=CAMBIA_ESTA_CONTRASENA_SMTP
SMTP_FROM=notificaciones@tudominio.com

PGADMIN_PORT=5050
PGADMIN_DEFAULT_EMAIL=admin@tudominio.com
PGADMIN_DEFAULT_PASSWORD=CAMBIA_ESTE_PASSWORD
```

Importante:

```env
PUBLIC_API_URL=/api
```

Dejalo asi si frontend y backend usan el mismo dominio. No pongas `https://` solo, porque el frontend intentara llamar URLs rotas como `https://auth/login`.

Genera un `JWT_SECRET` seguro con:

```bash
openssl rand -base64 48
```

Copia el resultado en:

```env
JWT_SECRET=RESULTADO_GENERADO
```

## 4. Levantar la aplicacion

Usa el compose de produccion:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Si cambiaste `PUBLIC_API_URL`, reconstruye el frontend para que la variable quede incluida en el build:

```bash
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d
```

Verifica los contenedores:

```bash
docker compose -f docker-compose.prod.yml ps
```

Verifica logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

## 5. Acceder a la plataforma

Abre:

```text
https://capacitacion.tudominio.com
```

El backend queda disponible en:

```text
https://capacitacion.tudominio.com/api
https://capacitacion.tudominio.com/health
```

En una instalacion nueva, el `seed` crea una sola cuenta inicial usando los valores de tu archivo `.env`:

```text
Email: valor de INITIAL_ADMIN_EMAIL
Password: valor de INITIAL_ADMIN_PASSWORD
Role: platform_admin
```

El `seed` nunca reemplaza la contrasena ni los datos de un administrador existente. Despues de entrar, los administradores autorizan correos desde la seccion `Users`, indicando el rol y, cuando corresponda, la organizacion. La autorizacion no crea una cuenta ni una contrasena.

El propietario del correo autorizado debe abrir `Crear una cuenta`, capturar su nombre y elegir su propia contrasena. Los correos que no esten autorizados son rechazados y cada autorizacion solo puede registrarse una vez. Los administradores conservan la capacidad de editar, activar, desactivar o eliminar cuentas ya registradas.

La recuperacion de contrasenas requiere las variables `SMTP_*`. El nombre de la plataforma, correo de soporte, limite de sesiones, duracion de enlaces y politica de contrasenas se administran visualmente desde `Settings`. Los secretos SMTP permanecen exclusivamente en `.env`.

En desarrollo, Docker Compose incluye Mailpit como buzon SMTP local en `http://localhost:8025`. Los correos de recuperacion aparecen ahi. En produccion debes reemplazar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM` con los datos de tu proveedor de correo.

Cada inicio de sesion se registra por dispositivo. Los usuarios pueden revisar y revocar sus accesos desde `Sesiones`; al superar `MAX_ACTIVE_SESSIONS`, se cierra automaticamente la sesion activa mas antigua. Desactivar una cuenta o cambiar su contrasena tambien revoca sus sesiones abiertas.

## 6. Certificado HTTPS

Caddy genera automaticamente el certificado HTTPS usando Let's Encrypt.

Para que funcione:

- El dominio debe apuntar correctamente a la IP de la VM
- Los puertos `80` y `443` deben estar abiertos
- `APP_DOMAIN` debe coincidir exactamente con el dominio publico
- `ACME_EMAIL` debe tener un correo valido

Si el certificado no se genera, revisa logs:

```bash
docker compose -f docker-compose.prod.yml logs proxy
```

## 7. pgAdmin opcional

pgAdmin no se levanta por defecto en produccion.

Para activarlo temporalmente:

```bash
docker compose -f docker-compose.prod.yml --profile tools up -d pgadmin
```

Accede en:

```text
http://IP_PUBLICA_DE_LA_VM:5050
```

Credenciales:

```text
Email: valor de PGADMIN_DEFAULT_EMAIL
Password: valor de PGADMIN_DEFAULT_PASSWORD
```

Para registrar PostgreSQL en pgAdmin:

```text
Host: postgres
Port: 5432
Database: integrity_learning
Username: valor de POSTGRES_USER
Password: valor de POSTGRES_PASSWORD
```

Cuando termines, apaga pgAdmin:

```bash
docker compose -f docker-compose.prod.yml stop pgadmin
```

## 8. Actualizar la aplicacion

Cuando subas nuevos cambios al servidor:

```bash
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

## 9. Apagar la aplicacion

```bash
docker compose -f docker-compose.prod.yml down
```

Esto no borra la base de datos porque PostgreSQL usa volumen persistente.

Para borrar tambien los datos de PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml down -v
```

Usa `down -v` solo si realmente quieres eliminar la base de datos.

## 10. Respaldo basico de la base de datos

Crear respaldo:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U integrity integrity_learning > backup.sql
```

Restaurar respaldo:

```bash
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U integrity integrity_learning
```

## Rutas internas de produccion

```text
https://capacitacion.tudominio.com
  -> Caddy
  -> frontend
  -> Nginx
  -> React build

https://capacitacion.tudominio.com/api/*
  -> Caddy
  -> backend
  -> Express

https://capacitacion.tudominio.com/health
  -> Caddy
  -> backend health check
```
