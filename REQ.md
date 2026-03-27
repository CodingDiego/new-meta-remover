# REQ — Autenticación y necesidad de backend (`new-meta-remover`)

Documento de requisitos para alinear el **front Vite (SPA)** con cualquier **auth rudimentaria o completa** y con futuros **APIs** (jobs, almacenamiento). Fecha: 2026-03-27.

---

## 1. Respuesta directa: ¿se puede sin backend?

| Objetivo | ¿Backend de aplicación? | Notas |
|----------|---------------------------|--------|
| **Ocultar la app** a curiosos (demo interno) | **No obligatorio** | Protección en **infraestructura**: HTTP Basic en el hosting, [Vercel Password Protection](https://vercel.com/docs/security/deployment-protection), Cloudflare Access, etc. No valida “usuarios” en tu app. |
| **Login con email/contraseña y sesión “real”** | **Sí** | Hace falta **código que ejecute en servidor** (función serverless, API Route, worker, BFF) que: verifique contraseñas contra un almacén, emita cookies/JWT **con secreto que nunca esté en el bundle del cliente**, y valide sesiones en rutas protegidas. Una **SPA estática sola no puede cumplir esto de forma segura**. |
| **“Auth” solo en el navegador** (localStorage + comparar con string en JS) | **No** | **No es seguridad**: cualquiera puede ver el bundle, falsificar estado o saltarse el check. Solo sirve como **UX falsa** o prototipo. |

**Conclusión:** No necesitas **obligatoriamente un repositorio nuevo** ni un microservicio aparte: puedes colgar el mismo **Next.js**, **Hono en Bun**, **un solo `server/`** en el monorepo, o **solo** funciones serverless. Lo que **no** puedes evitar, si quieres credenciales reales, es **algún proceso servidor** que posea el secreto y la base de datos (o el IdP).

---

## 2. Estado actual de este front (inventario real)

Ubicación: `new-meta-remover/` (Vite + React Router + TanStack Query).

| Área | Estado | Rutas / archivos relevantes |
|------|--------|------------------------------|
| **Auth** | Placeholder | `src/pages/LoginPage.tsx` — indica explícitamente que no hay API remota ni login. |
| **Protección de rutas** | No | `src/router.tsx` — `/studio` y `/studio/:jobId` son **públicas**; no hay `AuthProvider` ni guard en el árbol actual del repo. |
| **Cliente HTTP tipado** | No en repo | `progress.MD` / `docs/IMPLEMENTATION-ORCHESTRATION.md` mencionan `apiFetch`, `VITE_API_BASE_URL`, proxy `/api`; **no** hay `src/lib/api/client.ts` en el snapshot actual. |
| **Variables de entorno** | Mínimas | `src/lib/env.ts` — solo `MODE`, `DEV`, `PROD` (sin `VITE_API_BASE_URL` todavía). |
| **Procesamiento de medios** | Cliente | ffmpeg.wasm, procesadores en `src/lib/processors/*`, etc. — **no dependen** de sesión hoy. |
| **Build** | SPA estática | `vite build` → `dist/`; cualquier `/api/*` debe ser **otro origen** o **proxy en dev**. |

**Implicación:** Para “auth rudimentaria” **tipo la otra app** (cookie + `POST /api/auth/login` + `GET /api/auth/me`), hay que **implementar** en el front las llamadas y guards **y** desplegar (o apuntar a) un backend que cumpla el contrato de la sección 4.

---

## 3. Qué necesita este front si añades auth “de verdad”

### 3.1 Funcional (producto)

1. **Página de login** (`/auth/login`): formulario email + contraseña → `POST` al endpoint de login; redirección tras éxito (`returnTo` en query opcional).
2. **Sesión actual**: al cargar la app o rutas protegidas, `GET` “quién soy” para mostrar UI (email, cerrar sesión) o redirigir a login.
3. **Cerrar sesión**: `POST` logout; limpiar estado local (React Query cache opcional).
4. **Rutas protegidas** (según producto): por ejemplo exigir sesión para `/studio` y `/studio/:jobId` **solo si** el negocio lo requiere (hoy el README dice procesamiento local; la decisión es de producto).
5. **`credentials: 'include'`** en todos los `fetch` al API para enviar cookies **httpOnly** (recomendado; ver 4.3).

### 3.2 Técnicas (front)

| Necesidad | Detalle |
|-----------|---------|
| **Base URL del API** | `VITE_API_BASE_URL` — vacío = mismo origen en producción si el API se sirve bajo el mismo dominio; en dev, proxy Vite `'/api' → http://127.0.0.1:PUERTO` o URL absoluta al backend. |
| **Cliente HTTP** | Función `apiUrl(path)`, `apiJson<T>(method, path, body?)` con `credentials: 'include'`, manejo de `401`/`403` unificado. |
| **Tipos compartidos** | Ver sección 5 — idealmente un paquete `packages/api-types` o `src/lib/auth/types.ts` alineado con el backend. |
| **CSRF** | Si el backend exige token CSRF en `POST` (como `remove-metadata`), el front debe leer cookie/header/documentado y enviarlo en login/logout. |
| **CORS** | Si el SPA está en `https://app.example.com` y el API en `https://api.example.com`, el servidor debe `Access-Control-Allow-Credentials: true` + `Allow-Origin` concreto (no `*`) + cookies `SameSite` acordes. |

---

## 4. Contrato API propuesto (alineable con `remove-metadata`)

La app **Next.js** hermana en este workspace (`remove-metadata/`) ya implementa un patrón útil de referencia. Puedes **reutilizar el mismo contrato** en un backend nuevo o en el mismo monorepo **sin** copiar la arquitectura de colas/jobs.

### 4.1 Endpoints

| Método | Ruta | Body | Respuesta OK | Errores típicos |
|--------|------|------|--------------|-----------------|
| `POST` | `/api/auth/login` | JSON `{ "email": string, "password": string }` | Ver 5.1 | `401` credenciales; `403` usuario sin roles; `400` validación |
| `POST` | `/api/auth/logout` | (vacío o con CSRF si aplica) | `{ "ok": true }` | — |
| `GET` | `/api/auth/me` | — | Ver 5.2 | `200` con `user: null` si no hay sesión (patrón “soft”) |

**Nota:** El orchestration doc histórico menciona `GET /api/me`; unifica en **`/api/auth/me`** con la app existente para no duplicar rutas.

### 4.2 Login exitoso (comportamiento)

- Servidor valida credenciales, opcionalmente exige al menos un rol.
- Servidor devuelve JSON con datos mínimos del usuario (sin contraseña).
- Servidor establece **cookie httpOnly** (JWT o ID de sesión en servidor). El **secreto de firma** y **hashes de contraseña** solo en servidor/DB.

### 4.3 Cookies y seguridad (requisitos del backend)

- `HttpOnly`, `Secure` en producción, `Path=/`, `SameSite` acorde (a menudo `Lax` mismo sitio; `None` solo si dominios cruzados + HTTPS).
- Tamaño de JWT razonable; refresh opcional fuera de alcance de este REQ rudimentario.

### 4.4 CSRF (si se copia el modelo `remove-metadata`)

- `remove-metadata` usa `assertCsrfProtected` en login/logout. El front debe enviar el header/cookie que el backend espere (consultar implementación: `src/lib/auth/csrf.ts` en esa app).

---

## 5. Tipos TypeScript (esquema para el front)

Definiciones orientativas — el backend debe ser la **fuente de verdad**; ajustar nombres si el servidor devuelve otros campos.

### 5.1 `POST /api/auth/login` — respuesta 200

```typescript
export type LoginSuccessResponse = {
  ok: true
  user: {
    id: string
    email: string
    roles: string[]
  }
}

export type LoginErrorResponse = {
  error: string
}

export type LoginRequestBody = {
  email: string
  password: string
}
```

### 5.2 `GET /api/auth/me` — respuesta 200

Patrón “siempre 200” con usuario opcional (como `remove-metadata`):

```typescript
export type MeResponse =
  | { ok: true; user: null }
  | {
      ok: true
      user: {
        id: string
        email: string
        roles: string[]
        permissions?: string[]
      }
    }
```

### 5.3 `POST /api/auth/logout` — respuesta 200

```typescript
export type LogoutResponse = { ok: true }
```

### 5.4 Errores HTTP genéricos

```typescript
export type ApiErrorBody = {
  error: string
}
```

### 5.5 Estado de auth en React (opcional, front-only)

```typescript
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: { id: string; email: string; roles: string[] } }
```

---

## 6. Variables de entorno

### 6.1 Cliente (Vite — solo prefijo `VITE_*`)

| Variable | Obligatoria | Ejemplo | Uso |
|----------|-------------|---------|-----|
| `VITE_API_BASE_URL` | No | `''` o `https://api.example.com` | Prefijo para `apiFetch`; cadena vacía si el API es mismo origen vía reverse proxy. |

**Nunca** pongas en `VITE_*`: secretos JWT, pepper de contraseñas, connection strings.

### 6.2 Servidor (solo backend — ejemplos)

| Variable | Uso |
|----------|-----|
| `JWT_SECRET` / `AUTH_SECRET` | Firma de tokens o sesiones. |
| `DATABASE_URL` | Usuarios, roles (si aplica). |
| `COOKIE_NAME` | Nombre de la cookie de sesión (opcional). |

---

## 7. ¿Nuevo backend o reutilizar?

| Opción | Cuándo tiene sentido |
|--------|----------------------|
| **Añadir rutas API al mismo Next.js** (`remove-metadata` o un app router nuevo) | Ya tienes DB + login allí; el SPA Vite en otro despliegue solo necesita CORS + cookies o **mismo dominio** con reverse proxy (`/ → SPA`, `/api → Next`). |
| **BFF mínimo** (Hono/Fastify/Bun) solo con `/api/auth/*` | Quieres mantener `new-meta-remover` como SPA pura y un micro-backend solo para auth. |
| **Auth externa** (Clerk, Auth0, Descope) | Menos código propio; el “backend” es el IdP + SDK; igual necesitas **validar tokens** en servidor si proteges APIs propias. |

**No es obligatorio** crear un **repositorio git nuevo**; sí es obligatorio **algún despliegue con lógica servidor** si el login debe ser auténtico.

---

## 8. Alcance fuera de auth (para no mezclar)

Cuando existan **jobs en servidor**, **subidas a Blob**, o **FFmpeg en servidor**, cada feature añadirá:

- Endpoints propios (`POST /api/jobs`, etc.).
- Autorización: mismo cookie/JWT que en §4, comprobando `roles`/`perms` en servidor.

Este documento **no** define el contrato de jobs/Blob; solo indica que **dependerán** de la misma identidad si todo vive detrás del mismo login.

---

## 9. Checklist de implementación (front)

- [ ] Añadir `VITE_API_BASE_URL` + `getEnv()` en `src/lib/env.ts`.
- [ ] Implementar `src/lib/api/client.ts` (`apiUrl`, `apiJson`, errores).
- [ ] Añadir tipos §5 en `src/lib/auth/types.ts`.
- [ ] Sustituir `LoginPage` por formulario real + `useMutation`.
- [ ] `AuthProvider` + `useMe` (TanStack Query) con `staleTime` acorde.
- [ ] Opcional: `ProtectedRoute` para `/studio*`.
- [ ] `vite.config.ts`: `server.proxy` para `/api` en desarrollo.
- [ ] Documentar en README el origen del API y CORS/cookies.

---

## 10. Referencias en este monorepo

- App con auth implementada: `remove-metadata/src/app/api/auth/*`, `src/lib/auth/*`, `src/app/auth/login/*`.
- Front SPA actual: `new-meta-remover/src/pages/LoginPage.tsx`, `src/router.tsx`.
- Plan histórico (puede adelantarse al código): `new-meta-remover/docs/IMPLEMENTATION-ORCHESTRATION.md`.
