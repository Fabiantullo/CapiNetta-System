const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config').general;
const { getUserRoles } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Libera a un usuario y restaura sus roles originales.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'No encontrado.', ephemeral: true });

        // --- NUEVO: RECUPERAR ROLES DE LA DB ---
        const savedRoles = await getUserRoles(user.id);

        try {
            if (savedRoles && savedRoles.length > 0) {
                // Restauramos la lista completa que tenía antes
                await member.roles.set(savedRoles);
                console.log(`✅ Roles restaurados para ${user.tag}: ${savedRoles.join(', ')}`);
            } else {
                // Si no hay nada guardado (caso raro), ponemos el rol de usuario básico
                await member.roles.set([config.roleUser]);
                console.log(`⚠️ No se encontraron roles previos para ${user.tag}, usando rol base.`);
            }

            await user.send("✅ Ya recuperaste tus permisos y roles en **Capi Netta RP**.").catch(() => { });
            await interaction.reply(`✅ **${user.tag}** fue liberado y sus roles restaurados.`);
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Error al restaurar roles. Verificá la jerarquía.", ephemeral: true });
        }
    },
};