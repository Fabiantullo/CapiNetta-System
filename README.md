# 🤖 Capi Netta RP - Multi-Bot System (v2.0)

Este repositorio contiene un sistema integral de gestión para servidores de Discord de Roleplay, compuesto por un **Bot General** y un **Bot de Whitelist**. El sistema utiliza **MariaDB** para la persistencia de datos y está optimizado para ejecutarse 24/7 mediante **PM2**.

## 🚀 Funciones Actuales

### 🛡️ Seguridad y Anti-Scam (Multiservidor)
* **Aislamiento Preventivo**: Detecta automáticamente menciones masivas o mensajes repetitivos, guarda los roles del usuario en MariaDB (por GuildId) y lo traslada a una zona de aislamiento restringida.
* **Limpieza de Spam**: Al detectar un ataque, el bot ejecuta un `bulkDelete` para eliminar instantáneamente el rastro del spammer.
* **Sistema Anti-Bot**: Expulsa automáticamente cuentas con una antigüedad menor a 7 días para prevenir ataques.
* **Verificación por Botón**: Sistema que requiere que el usuario permanezca al menos 1 minuto en el servidor antes de poder obtener el rol de usuario mediante un botón interactivo.

### ⚖️ Moderación y Whitelist
* **Gestión de Advertencias**: Comando `/warn` que registra advertencias en la base de datos; al llegar a la tercera, aplica un timeout automático de 10 minutos.
* **Restauración de Roles**: Comando `/unmute` que recupera y aplica automáticamente la lista completa de roles que el usuario tenía antes de ser sancionado, consultando la persistencia en MariaDB.
* **Administración de Whitelist**: Comandos `/aprobar` y `/rechazar` que envían resultados estéticos mediante embeds personalizados al canal de resultados configurado.

### 📊 Monitoreo y Utilidad
* **Estado del Servidor**: Comando `/stats` que muestra en tiempo real el uso de RAM, carga de CPU (Oracle Cloud), uptime, almacenamiento en disco y latencia de la DB.
* **Logs Detallados**: Sistema de auditoría multiservidor que registra mensajes editados/eliminados, cambios de roles con debounce, ingresos/egresos y actividad en voz.
* **KPIs de Soporte**: Comando `/ticket metrics` que visualiza el tiempo promedio de resolución, volumen de tickets por categoría y ranking de productividad del Staff.
* **Transcripts Automáticos**: Al cerrar un ticket, el bot genera un archivo `.txt` con el historial completo de la conversación y lo envía por MD al usuario.

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
1. **Node.js** (v18 o superior).
2. **MariaDB/MySQL**: Servidor de base de datos activo.
3. **PM2**: Instalado globalmente (`npm install pm2 -g`).

### Pasos para el Despliegue
1. **Configurar variables de entorno**: Renombrá el archivo `.env.example` a `.env` y completá los tokens y credenciales de MariaDB.
2. **Ejecución del Setup Automatizado**:
    ```bash
    npm run setup
    ```
    *Este comando instalará las dependencias, registrará los comandos slash en Discord y activará el bot en PM2.*
3. **Configuración In-App**: Es obligatorio usar **/setup** en cada servidor nuevo para inicializar canales y roles en la base de datos.

---

## 📜 Comandos Disponibles

| Comando | Subcomando | Descripción | Permisos |
| :--- | :--- | :--- | :--- |
| **🏆 Gestión** | | | |
| `/setup` | - | Configuración inicial (Wizard) de canales y roles. | Admin |
| `/config` | - | Dashboard interactivo par ver y editar la configuración. | Admin |
| `/ticket` | `panel` | Envía el panel de creación de tickets al canal. | Admin |
| | `add` | Crea una nueva categoría de soporte. | Admin |
| | `remove` | Elimina una categoría existente. | Admin |
| | `edit` | Modifica una categoría (Nombre, Emoji, Rol, etc). | Admin |
| | `list` | Muestra todas las categorías activas. | Admin |
| | `metrics` | KPIs: Tiempo resolución, Top Staff y Volúmenes. | Admin |
| `/set-verify` | - | Envía el panel con botón de verificación. | Admin |
| `/set-support`| - | Fija mensaje informativo de soporte/normativa. | Admin |
| `/set-debug` | - | Redirige el canal de logs de error rápidamente. | Admin |
| `/db-tables` | - | Diagnóstico: Conteo de filas en MariaDB. | Admin |
| **⚖️ Moderación** | | | |
| `/warn` | - | Advierte a un usuario (Auto-timeout al 3º warn). | Mod |
| `/unmute` | - | Levanta sanción y restaura roles (Backup DB). | Mod |
| `/kick` | - | Expulsa a un miembro y registra la razón. | Kick |
| `/history` | - | Historial completo de sanciones de un usuario. | Mod |
| `/clear` | - | Borrado masivo de mensajes (Bulk Delete). | Manage Msgs |
| `/reset-warns`| - | Limpia el contador de advertencias de un usuario. | Admin |
| **🛡️ Whitelist** | | | |
| `/aprobar` | - | Aprueba WL y notifica en canal resultados. | Staff |
| `/rechazar` | - | Rechaza WL y envía normativa. | Staff |
| **🔧 Utilidad** | | | |
| `/stats` | - | Monitor de Recursos (CPU/RAM), Uptime y DB. | Admin |
| `/ping` | - | Test de latencia y conectividad. | Todos |

---

## 🗄️ Estructura del Proyecto
* `/commands`: Comandos slash organizados por categorías (General y Whitelist).
* `/events`: Manejadores de eventos de Discord (Auditoría, Anti-Scam, Moderación).
* `/handlers`: Cargadores automáticos de eventos y comandos.
* `/utils`: Conexión a DB (`database.js`), manejo de datos (`dataHandler.js`) y logs (`logger.js`).

---
Copyright (c) 2026 Tullo - MIT License