/**
 * @file dashboard-utils.js
 * @description Utilidades compartidas para el Dashboard - Modales, Filtrados y Alertas
 */

// =============================================================================
//                         GESTIÓN DE MODALES
// =============================================================================

/**
 * Abre un modal por su ID
 * @param {string} modalId - ID del modal a abrir
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cierra un modal por su ID
 * @param {string} modalId - ID del modal a cerrar
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Configura el comportamiento de cerrar modales al hacer clic en el overlay
 * Se debe llamar una sola vez al cargar la página
 */
function setupModalOverlays() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            // Solo cerrar si se hace clic en el overlay, no en el modal
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
}

// =============================================================================
//                    SISTEMA DE FILTRADO Y BÚSQUEDA
// =============================================================================

/**
 * Configura el sistema de filtrado y búsqueda para una tabla
 * @param {string} searchInputId - ID del input de búsqueda
 * @param {string} filterButtonsSelector - Selector CSS de los botones de filtro
 * @param {string} tableRowsSelector - Selector CSS de las filas de la tabla
 * @param {function} filterFunction - Función personalizada para aplicar el filtro (opcional)
 */
function setupTableFiltering(searchInputId, filterButtonsSelector, tableRowsSelector, filterFunction = null) {
    const searchInput = document.getElementById(searchInputId);
    const filterButtons = document.querySelectorAll(filterButtonsSelector);
    const tableRows = document.querySelectorAll(tableRowsSelector);

    if (!searchInput || filterButtons.length === 0 || tableRows.length === 0) {
        console.warn('setupTableFiltering: No se encontraron los elementos necesarios');
        return;
    }

    let currentFilter = 'all';

    // Búsqueda en tiempo real
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (filterFunction) {
            filterFunction(searchTerm, currentFilter);
        } else {
            applyDefaultFilter(tableRows, searchTerm, currentFilter);
        }
    });

    // Filtros por categoría
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            const searchTerm = searchInput.value.toLowerCase();
            if (filterFunction) {
                filterFunction(searchTerm, currentFilter);
            } else {
                applyDefaultFilter(tableRows, searchTerm, currentFilter);
            }
        });
    });
}

/**
 * Filtro por defecto genérico para tablas
 * Busca en el atributo data-name y filtra por data-type
 * @param {NodeList} rows - Filas de la tabla
 * @param {string} searchTerm - Término a buscar
 * @param {string} filter - Filtro a aplicar
 */
function applyDefaultFilter(rows, searchTerm, filter) {
    rows.forEach(row => {
        const rowData = row.dataset.name ? row.dataset.name.toLowerCase() : '';
        const rowType = row.dataset.type;
        
        const matchesSearch = rowData.includes(searchTerm);
        const matchesFilter = 
            filter === 'all' ||
            (filter === 'staff' && rowType === 'staff') ||
            (filter === 'custom' && rowType === 'custom');

        row.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

/**
 * Filtro especializado para la tabla de warns
 * Busca por usuario y filtra por cantidad de warns
 * @param {string} searchTerm - Término a buscar
 * @param {string} filter - Filtro a aplicar
 */
function filterWarnsTable(searchTerm, filter) {
    const tableRows = document.querySelectorAll('.warn-row');
    tableRows.forEach(row => {
        const userData = row.dataset.user ? row.dataset.user.toLowerCase() : '';
        const warnCount = parseInt(row.dataset.warns) || 0;
        
        const matchesSearch = userData.includes(searchTerm);
        const matchesFilter = 
            filter === 'all' ||
            (filter === 'high' && warnCount >= 3) ||
            (filter === 'medium' && warnCount >= 1 && warnCount < 3) ||
            (filter === 'low' && warnCount === 0);

        row.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

/**
 * Filtro especializado para la tabla de roles
 * Busca por nombre de rol y filtra por tipo
 * @param {string} searchTerm - Término a buscar
 * @param {string} filter - Filtro a aplicar
 */
function filterRolesTable(searchTerm, filter) {
    const tableRows = document.querySelectorAll('.role-row');
    tableRows.forEach(row => {
        const roleData = row.dataset.name ? row.dataset.name.toLowerCase() : '';
        const roleType = row.dataset.type;
        
        const matchesSearch = roleData.includes(searchTerm);
        const matchesFilter = 
            filter === 'all' ||
            (filter === 'staff' && roleType === 'staff') ||
            (filter === 'custom' && roleType === 'custom');

        row.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

// =============================================================================
//                       SISTEMA DE ALERTAS
// =============================================================================

/**
 * Muestra una alerta en un contenedor
 * @param {string} elementId - ID del elemento donde mostrar la alerta
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta: 'info', 'success', 'danger'
 * @param {number} autoDismiss - Milisegundos para desaparecer automáticamente (0 = no desaparecer)
 */
function showAlert(elementId, message, type = 'info', autoDismiss = 0) {
    const alertElement = document.getElementById(elementId);
    if (!alertElement) {
        console.warn(`showAlert: No se encontró elemento con ID "${elementId}"`);
        return;
    }

    const alertClass = `alert alert-${type}`;
    alertElement.innerHTML = `<div class="${alertClass}">${message}</div>`;
    
    if (autoDismiss > 0) {
        setTimeout(() => {
            alertElement.innerHTML = '';
        }, autoDismiss);
    }
}

/**
 * Limpia todas las alertas en un contenedor
 * @param {string} elementId - ID del elemento a limpiar
 */
function clearAlert(elementId) {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
        alertElement.innerHTML = '';
    }
}

// =============================================================================
//                      UTILIDADES DE FORMULARIOS
// =============================================================================

/**
 * Recolecta valores de checkboxes seleccionados
 * @param {string} selectorOrGroup - Selector CSS o nombre del grupo de checkboxes
 * @returns {Array} Array de valores seleccionados
 */
function getSelectedCheckboxes(selectorOrGroup) {
    const checkboxes = document.querySelectorAll(`input[name="${selectorOrGroup}"]:checked, ${selectorOrGroup}:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Resetea todos los checkboxes dentro de un contenedor
 * @param {string} containerId - ID del contenedor
 */
function resetCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    }
}

// =============================================================================
//                    UTILIDADES DE PETICIONES HTTP
// =============================================================================

/**
 * Realiza una petición POST JSON
 * @param {string} url - URL del endpoint
 * @param {object} data - Datos a enviar
 * @returns {Promise} Promesa con la respuesta
 */
async function fetchPost(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('fetchPost error:', error);
        throw error;
    }
}

/**
 * Realiza una petición GET
 * @param {string} url - URL del endpoint
 * @returns {Promise} Promesa con la respuesta
 */
async function fetchGet(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('fetchGet error:', error);
        throw error;
    }
}

// =============================================================================
//                   CONFIRMACIÓN CON DIÁLOGO NATIVO
// =============================================================================

/**
 * Muestra confirmación y ejecuta callback si es positiva
 * @param {string} message - Mensaje de confirmación
 * @param {function} onConfirm - Callback si confirma
 * @param {function} onCancel - Callback si cancela (opcional)
 */
function confirmAction(message, onConfirm, onCancel = null) {
    if (confirm(message)) {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    } else {
        if (typeof onCancel === 'function') {
            onCancel();
        }
    }
}
