const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const warnsFile = path.join(dataDir, 'warns.json');

// Asegurar que existe el directorio
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Cargar warns
function loadWarns() {
    if (!fs.existsSync(warnsFile)) {
        return new Map();
    }
    try {
        const data = fs.readFileSync(warnsFile, 'utf8');
        const json = JSON.parse(data);
        return new Map(JSON.entries(json)); // Convertir objeto a Map no es directo en JSON standard, mejor usar objeto o array
    } catch (e) {
        console.error("Error cargando warns:", e);
        return new Map();
    }
}

// Guardar warns
// Para simplificar, guardaremos el Map como un objeto JSON
function saveWarns(warnMap) {
    try {
        const obj = Object.fromEntries(warnMap);
        fs.writeFileSync(warnsFile, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error("Error guardando warns:", e);
    }
}

// Helper para convertir objeto cargado a Map correctamente
function getWarnsMap() {
    if (!fs.existsSync(warnsFile)) return new Map();
    try {
        const data = fs.readFileSync(warnsFile, 'utf8');
        const obj = JSON.parse(data);
        return new Map(Object.entries(obj));
    } catch (e) {
        console.error("Error leyendo warns.json:", e);
        return new Map();
    }
}

module.exports = { saveWarns, getWarnsMap };
