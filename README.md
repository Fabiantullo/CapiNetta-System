# 🤖 Capi Netta RP - Multi-Bot System

Este repositorio contiene un sistema integral de gestión para servidores de Discord de Roleplay, compuesto por un **Bot General** y un **Bot de Whitelist**. El sistema utiliza **MariaDB** para la persistencia de datos y está optimizado para ejecutarse 24/7 mediante **PM2**.

## 🚀 Funciones Actuales

### 🛡️ Seguridad y Anti-Scam
* **Aislamiento Preventivo**: Detecta automáticamente menciones masivas o mensajes repetitivos, guarda los roles del usuario en MariaDB y lo traslada a una zona de aislamiento restringida.
* **Sistema Anti-Bot**: Expulsa automáticamente cuentas con una antigüedad menor a 7 días para prevenir ataques.
* **Verificación por Botón**: Sistema que requiere que el usuario permanezca al menos 1 minuto en el servidor antes de poder obtener el rol de usuario mediante un botón interactivo.

### ⚖️ Moderación y Whitelist
* **Gestión de Advertencias**: Comando `/warn` que registra advertencias en la base de datos; al llegar a la tercera, aplica un timeout automático de 10 minutos.
* **Restauración de Roles**: Comando `/unmute` que recupera y aplica automáticamente la lista completa de roles que el usuario tenía antes de ser sancionado, consultando la base de datos.
* **Administración de Whitelist**: Comandos `/aprobar` y `/rechazar` que envían resultados estéticos mediante embeds personalizados al canal de resultados configurado.

### 📊 Monitoreo y Utilidad
* **Estado del Servidor**: Comando `/stats` que muestra en tiempo real el uso de RAM, tiempo de encendido (uptime), almacenamiento en disco del sistema Linux, modelo de CPU y latencia del bot.
* **Logs Detallados**: Sistema de auditoría en canales configurados que registra:
    * Mensajes editados y eliminados (identificando quién borró el mensaje mediante Audit Logs).
    * Entrada y salida de miembros.
    * Cambios de roles con un sistema de "debounce" y consolidación de sesión para evitar spam de logs.
    * Actividad en canales de voz y actualizaciones de perfil de usuario.

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
1.  **Node.js** (v18 o superior).
2.  **MariaDB/MySQL**: Servidor de base de datos activo.
3.  **PM2**: Instalado globalmente (`npm install pm2 -g`).

### Pasos para el Despliegue
1.  **Clonar el repositorio**:
    ```bash
    git clone [https://github.com/tu-usuario/capi-netta-rp.git](https://github.com/tu-usuario/capi-netta-rp.git)
    cd capi-netta-rp
    ```
2.  **Configurar variables de entorno**:
    * Renombrá el archivo `.env.example` a `.env`.
    * Completá los tokens, IDs de canales, roles y credenciales de MariaDB.
3.  **Ejecución del Setup Automatizado**:
    ```bash
    npm run setup
    ```
    *Este comando instalará las dependencias, registrará los comandos slash en Discord y activará el bot en PM2.*

4.  **Persistencia tras reinicio**:
    ```bash
    pm2 startup
    # (Ejecutá el comando sudo que aparezca en la terminal)
    pm2 save
    ```

---

## 📜 Comandos Disponibles

| Comando | Descripción | Permisos Requeridos |
| :--- | :--- | :--- |
| `/ping` | Test de respuesta del sistema. | Todos |
| `/stats` | Salud del servidor (RAM/CPU/Disco). | Administrador |
| `/warn` | Advierte a un usuario (Auto-timeout en 3/3). | Moderador |
| `/unmute` | Libera a un usuario y restaura sus roles desde la DB. | Moderador |
| `/aprobar` | Aprueba la whitelist de un usuario. | Staff |
| `/rechazar` | Rechaza la whitelist de un usuario. | Staff |

---

## 🗄️ Estructura del Proyecto
* `/commands`: Comandos slash organizados por categorías (General y Whitelist).
* `/events`: Manejadores de eventos de Discord (mensajes, miembros, interacciones).
* `/handlers`: Cargadores automáticos de eventos y comandos.
* `/utils`: Funciones para logs, manejo de datos y conexión a base de datos.