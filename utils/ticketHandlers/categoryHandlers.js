/**
 * @file categoryHandlers.js
 * @description Lógica de gestión de categorías (CRUD) del sistema de tickets.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
    addTicketCategory, removeTicketCategory, getTicketCategories,
    addRoleToCategory, updateTicketCategory
} = require('../ticketDB');

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
    const newRole2 = interaction.options.getRole('nuevo_rol_extra_1');
    const newRole3 = interaction.options.getRole('nuevo_rol_extra_2');

    const newCat = interaction.options.getChannel('nueva_categoria');

    const updates = {};
    if (newName) updates.newName = newName;
    if (newDesc) updates.description = newDesc;
    if (newEmoji) updates.emoji = newEmoji;
    if (newCat) updates.targetCategoryId = newCat.id;

    if (newRole || newRole2 || newRole3) {
        let newRolesList = [];
        if (newRole) newRolesList.push(newRole.id);
        if (newRole2) newRolesList.push(newRole2.id);
        if (newRole3) newRolesList.push(newRole3.id);

        if (newRolesList.length > 0) {
            updates.roleId = newRolesList.length > 1 ? JSON.stringify(newRolesList) : newRolesList[0];
        }
    }

    if (Object.keys(updates).length === 0) {
        return interaction.reply({ content: "⚠️ No especificaste ningún cambio.", flags: [MessageFlags.Ephemeral] });
    }

    const success = await updateTicketCategory(interaction.guild.id, currentName, updates);

    if (success) {
        const changes = [];
        if (newName) changes.push(`Nombre: **${newName}**`);
        if (newDesc) changes.push(`Desc: *${newDesc}*`);
        if (newEmoji) changes.push(`Emoji: ${newEmoji}`);

        if (updates.roleId) {
            let displayRoles = updates.roleId.startsWith('[') ? JSON.parse(updates.roleId) : [updates.roleId];
            changes.push(`Roles: ${displayRoles.map(id => `<@&${id}>`).join(', ')} (Lista Actualizada)`);
        }

        if (newCat) changes.push(`Destino: ${newCat}`);

        return interaction.reply({ content: `✅ Categoría **${currentName}** actualizada.\n> ${changes.join('\n> ')}`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: `❌ No se encontró la categoría **${currentName}** o hubo un error.`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleRemoveCategory(interaction) {
    const name = interaction.options.getString('nombre');
    const success = await removeTicketCategory(interaction.guild.id, name);
    if (success) {
        return interaction.reply({ content: `🗑️ Categoría **${name}** eliminada.`, flags: [MessageFlags.Ephemeral] });
    } else {
        return interaction.reply({ content: `❌ No se pudo eliminar (quizás no existe).`, flags: [MessageFlags.Ephemeral] });
    }
}

async function handleListCategories(interaction) {
    const categories = await getTicketCategories(interaction.guild.id);
    if (categories.length === 0) return interaction.reply({ content: "⚠️ No hay categorías configuradas.", flags: [MessageFlags.Ephemeral] });

    const list = await Promise.all(categories.map(async c => {
        let rolesDisplay = c.roleId;
        if (c.roleId.startsWith('[')) {
            try {
                const roles = JSON.parse(c.roleId);
                rolesDisplay = roles.map(r => `<@&${r}>`).join(', ');
            } catch (e) { }
        } else {
            rolesDisplay = `<@&${c.roleId}>`;
        }

        const channel = await interaction.guild.channels.fetch(c.targetCategoryId).catch(() => null);
        const categoryName = channel ? channel.name : `Desconocida (${c.targetCategoryId})`;

        return `**${c.name}** ${c.emoji}\n> 📝 *${c.description}*\n> 🛡️ **Roles:** ${rolesDisplay}\n> 📂 **Destino:** \`${categoryName}\``;
    }));

    const embed = new EmbedBuilder()
        .setTitle("📂 Categorías de Tickets")
        .setDescription(list.join('\n\n'))
        .setColor(0x3498db);
    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleAddCategory,
    handleAddRole,
    handleEditCategory,
    handleRemoveCategory,
    handleListCategories
};
