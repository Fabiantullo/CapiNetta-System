/**
 * @file categories.js
 * @description Gestión DB de Categorías de Tickets.
 */
const { prisma } = require('../../database');
const { parseRoleIds } = require('../constants');

async function addTicketCategory(guildId, data) {
    try {
        const { name, description, emoji, roleId, targetCategoryId } = data;

        const exists = await prisma.ticketCategory.findFirst({
            where: { guildId, name }
        });

        if (exists) {
            return { success: false, message: '⚠️ Ya existe una categoría con ese nombre.' };
        }

        await prisma.ticketCategory.create({
            data: {
                guildId,
                name,
                description,
                emoji,
                roleId,
                targetCategoryId
            }
        });
        return { success: true };
    } catch (e) {
        console.error("Error creating ticket category:", e);
        return { success: false, message: '❌ Error interno de base de datos.' };
    }
}

async function removeTicketCategory(guildId, name) {
    try {
        await prisma.ticketCategory.deleteMany({
            where: { guildId, name }
        });
        return true;
    } catch (e) {
        console.error("Error removing ticket category:", e);
        return false;
    }
}

async function updateTicketCategory(guildId, currentName, data) {
    try {
        const category = await prisma.ticketCategory.findFirst({
            where: { guildId, name: currentName }
        });

        if (!category) return false;

        const updateData = {};
        if (data.newName) updateData.name = data.newName;
        if (data.description) updateData.description = data.description;
        if (data.emoji) updateData.emoji = data.emoji;
        if (data.roleId) updateData.roleId = data.roleId;
        if (data.targetCategoryId) updateData.targetCategoryId = data.targetCategoryId;

        await prisma.ticketCategory.update({
            where: { id: category.id },
            data: updateData
        });

        return true;
    } catch (e) {
        console.error("Error updating ticket category:", e);
        return false;
    }
}

async function addRoleToCategory(guildId, name, newRoleId) {
    try {
        const category = await getCategoryByName(guildId, name);
        if (!category) return false;

        const roles = parseRoleIds(category.roleId);

        if (!roles.includes(newRoleId)) {
            roles.push(newRoleId);
            await prisma.ticketCategory.update({
                where: { id: category.id },
                data: { roleId: JSON.stringify(roles) }
            });
        }
        return true;
    } catch (e) {
        console.error("Error adding role to category:", e);
        return false;
    }
}

async function getTicketCategories(guildId) {
    try {
        return await prisma.ticketCategory.findMany({
            where: { guildId }
        });
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

async function getCategoryByName(guildId, name) {
    try {
        return await prisma.ticketCategory.findFirst({
            where: {
                guildId: guildId,
                name: name
            }
        });
    } catch (error) {
        console.error("Error getCategoryByName:", error);
        return null;
    }
}

module.exports = {
    addTicketCategory,
    removeTicketCategory,
    updateTicketCategory,
    addRoleToCategory,
    getTicketCategories,
    getCategoryByName
};
