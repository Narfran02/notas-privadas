# 🛡️ ShadowNotes - Especificación Formal (spec.md)

## 1. Visión General
**ShadowNotes** es un gestor de notas privadas de alta confidencialidad diseñado bajo una arquitectura de "conocimiento cero" (Zero-Knowledge). El objetivo principal del desarrollo es la fuerte seguridad defensiva, mitigando los riesgos del OWASP Top 10 y previniendo ataques en un entorno hostil (Red Teaming / Pentesting).

## 2. Pila Tecnológica
- **Frontend:** HTML5, CSS (Bootstrap 5) y JavaScript (Vanilla).
- **Backend:** Node.js con Express.js.
- **Persistencia:** SQLite o archivo JSON (alojado de forma aislada en el entorno del backend).
- **Despliegue:** Contenedorizado mediante Docker Compose (`docker-compose up --build`) con dos servicios (`api` y `web`).

## 3. Requisitos Críticos de Seguridad

### 3.1. Autenticación, Autorización y Aislamiento
- Sistema seguro de registro y login.
- Hasheo criptográfico robusto de contraseñas mediante **Argon2** o **bcrypt** (adicional al hash en cliente).
- Aislamiento estricto de recursos: un usuario debe verificar su identidad (validación de propiedad / anti-IDOR) en cada petición para poder acceder y editar exclusivamente sus propias notas.

### 3.2. Cifrado de Extremo a Extremo (E2EE)
- **Conocimiento Cero:** Las notas deben ser cifradas en el entorno del cliente (navegador) antes de ser enviadas a la API.
- El backend sólo almacenará y devolverá texto cifrado ininteligible (Ciphertext).
- La clave de cifrado nunca debe enviarse al servidor en texto plano.

### 3.3. Protección de Sesión y Falsificación (Anti-CSRF y Anti-XSS)
- Empleo de cookies con flags de máxima seguridad (`HttpOnly`, `Secure` y `SameSite: Strict`).
- Protección activa contra ataques CSRF mediante cabeceras **Fetch Metadata** o el patrón de **Doble Envío Firmado (Signed Double Submit Cookie)**.

### 3.4. Endurecimiento del Backend (Hardening Express.js)
- Uso de **helmet** para forzar cabeceras HTTP seguras (CSP, HSTS, X-Content-Type-Options, etc.).
- Uso de **express-rate-limit** para la prevención de ataques de fuerza bruta.
- Validación y sanitización estricta de todos los payloads/inputs en el servidor.
- Prohibición absoluta de exposición de **Stack Traces** en respuestas de error.

### 3.5. Endurecimiento del Frontend (Bootstrap 5 y DOM Seguro)
- Estrategia de "Cero Confianza" hacia el DOM.
- Prevención total de inyecciones XSS.
- Prohibición estricta del uso de `innerHTML` para el renderizado de cualquier dato originado por el usuario.
- Uso exclusivo de métodos seguros del DOM como `textContent` o `innerText`.

---

## 4. Resoluciones de Seguridad (Aprobadas)

1. **Gestión de Claves (E2EE vs Autenticación):**  
   El cliente implementará derivación de claves usando Web Crypto API (ej. PBKDF2). A partir de la contraseña original, generará dos valores: un `Hash de Autenticación` (enviado al servidor para login/registro) y una `Clave de Cifrado E2EE` (retenida efímeramente en memoria para cifrar notas). El servidor nunca recibe ni procesa la contraseña original; solo bcrypt/Argon2 sobre el hash recibido.

2. **Formato del Texto y Prevención XSS:**  
   ShadowNotes soportará **exclusivamente texto plano**. No almacenará ni renderizará HTML ni Markdown para evitar vectores de ataque a través del DOM.

3. **Recuperación de Contraseña (Zero Trust):**  
   Al ser una arquitectura de conocimiento cero genuina, **no habrá mecanismo de recuperación de cuentas ni contraseñas**. Se documentará visualmente y se advertirá al usuario explícitamente durante el proceso de registro.
