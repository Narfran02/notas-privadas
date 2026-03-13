# ShadowNotes 📝

ShadowNotes es una aplicación web minimalista y robusta para la gestión privada de notas de texto. Diseñada para ser rápida, eficiente y fácil de desplegar en cualquier entorno mediante contenedores.

## Características Principales

- **Gestión Simple:** Crea, lee y elimina notas de texto plano de manera instantánea.
- **Cuentas de Usuario:** Sistema de registro integrado para separar el espacio de trabajo de cada persona.
- **Modo Oscuro Permanente:** Interfaz moderna y sin distracciones (Dark Mode por defecto).
- **100% Contenedorizado:** Despliegue empaquetado y reproducible en cualquier servidor con Docker.
- **Offline-Ready UI:** Recursos front-end incluidos en el proyecto para funcionar en intranets o entornos aislados sin dependencias de CDN externas.

## Requisitos Previos

Para desplegar ShadowNotes fácilmente, solo necesitas tener instalado en tu sistema:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Instrucciones de Despliegue (Producción / Local)

El proyecto utiliza una arquitectura de doble servicio (`api` y `web`) orquestada mediante Docker Compose.

1. **Clonar el repositorio** (o descargar el código fuente):
   ```bash
   git clone https://github.com/tu-usuario/shadownotes.git
   cd shadownotes
   ```

2. **Levantar los servicios:**
   Ejecuta el siguiente comando en la raíz del proyecto para construir las imágenes e iniciar la aplicación en segundo plano (`-d`):
   ```bash
   docker-compose up --build -d
   ```

3. **Acceder a la Aplicación:**
   Abre tu navegador web y dirígete a:
   [http://localhost](http://localhost) (o a la dirección IP de tu servidor en el puerto 80).

4. **Para detener la aplicación:**
   ```bash
   docker-compose down
   ```
   *Nota: La base de datos persistirá sus datos automáticamente en un volumen de Docker (`dbsqlite`), por lo que no perderás las cuentas ni las notas al apagar y encender el contenedor.*

## Uso Básico

1. **Registro Inicial:** Accede a la aplicación y usa el botón "Establecer Nueva Bóveda" para crear un usuario inicial con una contraseña.
2. **Login:** Usa tu usuario y contraseña para entrar al panel principal.
3. **Escribir Notas:** Redacta tu texto en la caja central y pulsa el botón de guardado.
4. **Cerrar Sesión:** Cuando termines de leer o redactar, se recomienda usar el botón "PULSAR PARA TERMINAR SESIÓN" en la cabecera.

## Stack Tecnológico Relevante

- **Frontend:** HTML5, Vanilla JavaScript, CSS mediante Bootstrap 5 
- **Backend:** Node.js (Servidor Express)
- **Persistencia:** Base de datos relacional ligera (SQLite)
- **Despliegue:** Docker Compose (Nginx + Contenedor Node Alpine)
