import { EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../../utils/logger.js';
import { getColor } from '../../../config/bot.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { pendingSubmissions } from '../../../commands/Community/submit.js';

function buildEmbed(title, description, color) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
}

export default {
  name: 'submitModal',

  async execute(interaction, client, args) {
    const pending = pendingSubmissions.get(interaction.user.id);

    if (!pending) {
      await InteractionHelper.safeReply(interaction, {
        embeds: [buildEmbed(
          '⚠️ Session expirée',
          'Relance la commande /submit pour recommencer.',
          getColor('warning'),
        )],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const description = interaction.fields.getTextInputValue('description')?.trim();
    const preuve = interaction.fields.getTextInputValue('preuve')?.trim() || 'Non fournie';

    if (!description) {
      await InteractionHelper.safeReply(interaction, {
        embeds: [buildEmbed(
          '⚠️ Description manquante',
          'Merci de fournir une description avant de soumettre.',
          getColor('warning'),
        )],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    if (!deferred) {
      return;
    }

    const voteEmbed = buildEmbed(
      'Nouvelle soumission en attente de validation',
      `**Description :** ${description}\n**Preuve :** ${preuve}\n**Auteur :** <@${interaction.user.id}>\n**Réactions requises :** ${pending.reactsRequis} ✅`,
      getColor('info'),
    );

    let voteMessage;
    try {
      voteMessage = await interaction.channel.send({
        embeds: [voteEmbed],
        files: [pending.fichier.url],
      });
      await voteMessage.react('✅');
    } catch (err) {
      logger.error('submitModal: failed to post vote message', { error: err.message, userId: interaction.user.id });
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [buildEmbed('❌ Erreur', "Impossible de publier la soumission.", getColor('error'))],
      });
      pendingSubmissions.delete(interaction.user.id);
      return;
    }

    const collector = voteMessage.createReactionCollector({
      filter: (reaction, user) => reaction.emoji.name === '✅' && !user.bot,
      time: 24 * 60 * 60 * 1000,
    });

    collector.on('collect', async (reaction) => {
      if (reaction.count - 1 >= pending.reactsRequis) {
        collector.stop('threshold_reached');

        const finalEmbed = buildEmbed(
          'Soumission validée',
          `**Description :** ${description}\n**Preuve :** ${preuve}\n**Auteur :** <@${interaction.user.id}>`,
          getColor('success'),
        );

        try {
          await pending.salon.send({
            embeds: [finalEmbed],
            files: [pending.fichier.url],
          });
          await voteMessage.reply(`✅ Seuil atteint, publié dans ${pending.salon}.`);
        } catch (err) {
          logger.error('submitModal: failed to post final submission', { error: err.message });
        }
      }
    });

    pendingSubmissions.delete(interaction.user.id);

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [buildEmbed('✅ Soumission créée', "En attente de validation communautaire.", getColor('success'))],
    });

    logger.info('Submit modal processed', {
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
  },
};
