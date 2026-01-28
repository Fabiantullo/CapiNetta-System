/**
 * Sidebar Management
 * Maneja el menú hamburguesa y la navegación en la barra lateral
 * Reutilizable en todas las páginas del dashboard
 */

/**
 * Inicializa el sistema de hamburguesa y sidebar
 * Debe llamarse una vez por página que tenga hamburger/sidebar
 */
function initSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (!hamburger || !sidebar) {
        console.warn('Sidebar: No se encontró hamburger o sidebar en el DOM');
        return;
    }

    // Toggle sidebar al hacer click en hamburger
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });

    // Cerrar sidebar al hacer click en un link (en móvil)
    const links = sidebar.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            }
        });
    });

    // Cerrar sidebar al hacer click fuera (solo en móvil)
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
            }
        }
    });

    // Cerrar sidebar cuando cambia el tamaño de pantalla
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
        }
    });

    // Estado inicial basado en tamaño de pantalla
    if (window.innerWidth <= 768) {
        sidebar.classList.add('hidden');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initSidebar);
