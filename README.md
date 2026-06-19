# Calendario Home Office · Sábados

Aplicación web para gestionar la rotación de home office de los sábados.

## Stack

- **Backend:** Node.js + Express
- **Persistencia:** `data/calendar.json` (archivo local)
- **Auth admin:** `express-session` + contraseña en variable de entorno
- **Frontend:** HTML/CSS/JS vanilla (sin build step)

---

## 1. Instalación local

```bash
# Clonar o descargar el proyecto, luego:
cd calendario-sabados
npm install
```

## 2. Configurar la contraseña de administrador

Edita el archivo `.env` (ya incluido, **nunca lo subas a git**):

```env
ADMIN_PASSWORD=tu-password-aqui   # Pon la contraseña que quieras
SESSION_SECRET=cadena-aleatoria-larga
PORT=3000
```

## 3. Correr en local

```bash
node server.js
```

- **Vista pública (solo lectura):** http://localhost:3000
- **Panel de administración:** http://localhost:3000/admin

Para editar, entra a `/admin` y usa la contraseña definida en `.env`.

---

## 4. Despliegue gratuito en Render.com

Render ofrece hosting Node.js gratuito con disco persistente.

### Paso a paso

1. **Sube el código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "init"
   # Crea un repo en github.com y sigue las instrucciones para subir
   ```
   > ⚠️ El `.gitignore` ya excluye `.env` y `data/calendar.json`.

2. **Crea una cuenta en [render.com](https://render.com)** (gratis).

3. **Nuevo Web Service** → conecta tu repo de GitHub.

4. **Configuración del servicio:**
   | Campo | Valor |
   |---|---|
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Plan | Free |

5. **Variables de entorno** (en el panel de Render, sección "Environment"):
   ```
   ADMIN_PASSWORD = tu-password-secreta
   SESSION_SECRET  = cadena-aleatoria-larga
   ```

6. **Disco persistente** (⚠️ importante para que los cambios no se pierdan):
   - En la sección "Disks" del servicio, añade un disco:
     - Mount Path: `/opt/render/project/src/data`
     - Tamaño: 1 GB (gratis)
   - Esto garantiza que `data/calendar.json` sobreviva a reinicios.

7. **Deploy** → Render te da una URL pública tipo `https://mi-app.onrender.com`.

### URLs finales

| Propósito | URL |
|---|---|
| Vista pública (compartir) | `https://mi-app.onrender.com` |
| Panel de admin | `https://mi-app.onrender.com/admin` |

---

## 5. Cómo editar el calendario

1. Entra a `/admin` con tu contraseña.
2. Haz clic en **Editar** junto al sábado que quieras cambiar.
3. Selecciona la persona y guarda.
4. El cambio aparece inmediatamente en la vista pública.
5. Para revertir a la rotación automática, usa **"Quitar cambio manual"**.

---

## 6. Lógica de rotación

- Rotación base: Laura → Ramiro → Joaquín → Laura → …
- Arranca el sábado **20 de junio de 2026** con Laura.
- Se calcula automáticamente para cualquier fecha futura.
- Los overrides manuales tienen prioridad sobre la rotación base.

---

## Seguridad

- La vista pública (`/`) no expone ninguna ruta de escritura.
- Las rutas `POST /api/admin/*` y `DELETE /api/admin/*` requieren sesión autenticada; devuelven 401 sin ella.
- La contraseña nunca se escribe en el código: solo en variables de entorno.
