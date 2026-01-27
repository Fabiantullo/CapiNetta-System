const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
    addTicketCategory, removeTicketCategory, getTicketCategories,
    addRoleToCategory, updateTicketCategory
} = require('../db/categories');
const { getGuildSettings } = require('../../dataHandler');
const { generatePanelPayload } = require('./panelHandlers');

/**
 * Helper: Refresca el panel activo (si existe) tras cambios en la configuración.
 */
async function refreshActivePanel(interaction) {
    const guildId = interaction.guild.id;
    const settings = await getGuildSettings(guildId);

    if (!settings?.ticketPanelChannel || !settings?.ticketPanelMessage) return;

    try {
        const channel = await interaction.guild.channels.fetch(settings.ticketPanelChannel);
        if (!channel) return;

        const message = await channel.messages.fetch(settings.ticketPanelMessage);
        if (!message) return;

        const categories = await getTicketCategories(guildId);
        const newPayload = generatePanelPayload(categories); // Usamos la nueva función exportada

        await message.edit(newPayload);
        // No enviamos reply al usuario aquí para no spamearlo, es silencioso.
    } catch (e) {
        console.log("No se pudo auto-actualizar el panel (quizás fue borrado):", e.message);
    }
}

async function handleAddCategory(interaction) {
    const name = interaction.options.getString('nombre');
    const role = interaction.options.getRole('rol');
    const role2 = interaction.options.getRole('rol_extra_1');
    const role3 = interaction.options.getRole('rol_extra_2');
    const parentCat = interaction.options.getChannel('categoria_discord');
    const emoji = interaction.options.getString('emoji');
    const desc = interaction.options.getString('descripcion');

    let roleIdsToSave = [role.id];
    if (role2) roleIdsToSave.push(role2.id);
    if (role3) roleIdsToSave.push(role3.id);

    const roleIdField = roleIdsToSave.length > 1 ? JSON.stringify(roleIdsToSave) : role.id;

    const result = await addTicketCategory(interaction.guild.id, {
        name,
        description: desc,
        emoji,
        roleId: roleIdField,
        targetCategoryId: parentCat.id
    });

    if (result.success) {
        await refreshActivePanel(interaction); // AUTO-REFRESH
        const roleNames = roleIdsToSave.map(id => `<@&${id}>`).join(', ');
        return interaction.reply({ content: `✅ Categoría **${name}** creada con éxito.\n> **Roles:** ${roleNames}\n> **Ubicación:** ${parentCat.name}`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: result.message || `❌ Hubo un error al guardar la categoría.`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleAddRole(interaction) {
    const name = interaction.options.getString('categoria');
    const role = interaction.options.getRole('rol');

    const success = await addRoleToCategory(interaction.guild.id, name, role.id);
    if (success) {
        // addRole no cambia visualmente el panel (solo permisos internos), pero por consistencia podríamos refrescar si en el futuro mostramos roles.
        // Por ahora lo dejamos igual.
        return interaction.reply({ content: `✅ Rol **${role.name}** agregado a la categoría **${name}**.`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: `❌ No se encontró la categoría o hubo un error DB.`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleEditCategory(interaction) {
    const currentName = interaction.options.getString('nombre_actual');
    const newName = interaction.options.getString('nuevo_nombre');
    const newDesc = interaction.options.getString('nuevo_descripcion');
    const newEmoji = interaction.options.getString('nuevo_emoji');
    const newRole = interaction.options.getRole('nuevo_rol');
    const newRoleExtra1 = interaction.options.getRole('nuevo_rol_extra_1');
    const newRoleExtra2 = interaction.options.getRole('nuevo_rol_extra_2');
    const newCat = interaction.options.getChannel('nueva_categoria');

    const updates = {};
    if (newName) updates.newName = newName;
    if (newDesc) updates.description = newDesc;
    if (newEmoji) updates.emoji = newEmoji;
    if (newCat) updates.targetCategoryId = newCat.id;

    // Reemplazar lista de roles si se especifica alguno
    const newRoles = [newRole, newRoleExtra1, newRoleExtra2].filter(Boolean).map(r => r.id);
    if (newRoles.length > 0) {
        updates.roleId = newRoles.length === 1 ? newRoles[0] : JSON.stringify(newRoles.slice(0, 3));
    }

    if (Object.keys(updates).length === 0) {
        return interaction.reply({ content: "⚠️ No especificaste ningún cambio.", flags: [MessageFlags.Ephemeral] });
    }

    const success = await updateTicketCategory(interaction.guild.id, currentName, updates);

    if (success) {
        await refreshActivePanel(interaction); // AUTO-REFRESH

        const changes = [];
        if (newName) changes.push(`Nombre: **${newName}**`);
        if (newDesc) changes.push(`Desc: *${newDesc}*`);
        if (newEmoji) changes.push(`Emoji: ${newEmoji}`);
        if (newRoles.length > 0) changes.push(`Roles: ${newRoles.map(id => `<@&${id}>`).join(', ')}`);

        return interaction.reply({ content: `✅ Categoría **${currentName}** actualizada.\n> ${changes.join('\n> ')}`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: `❌ No se encontró la categoría **${currentName}** o hubo un error.`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleRemoveCategory(interaction) {
    const name = interaction.options.getString('nombre');
    const success = await removeTicketCategory(interaction.guild.id, name);
    if (success) {
        await refreshActivePanel(interaction); // AUTO-REFRESH
        return interaction.reply({ content: `🗑️ Categoría **${name}** eliminada.`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: `❌ No se pudo eliminar (quizás no existe).`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleListCategories(interaction) {
    const categories = await getTicketCategories(interaction.guild.id);
    if (categories.length === 0) return interaction.reply({ content: "⚠️ No hay categorías configuradas.", flags: [MessageFlags.Ephemeral] });

    const list = categories.map(c => `**${c.name}** ${c.emoji}`);

    const embed = new EmbedBuilder().setDescription(list.join('\n'));
    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleAddCategory,
    handleAddRole,
    handleEditCategory,
    handleRemoveCategory,
    handleListCategories
};
