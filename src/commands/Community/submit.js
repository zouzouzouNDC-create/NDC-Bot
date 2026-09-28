import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { successEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// Stockage temporaire le temps que l'utilisateur remplisse le modal
export const pendingSubmissions = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Partage une création dans un salon')
    .addAttachmentOption(option =>
      option.setName('fichier')
        .setDescription('Le fichier à partager')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Salon de destination')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('reacts')
        .setDescription('Réactions requises avant publication')
        .setRequired(true)
        .setMinValue(1)),
  category: 'Community',

  async execute(interaction, config, client) {
    const fichier = interaction.options.getAttachment('fichier');
    const salon = interaction.options.getChannel('salon');
    const reactsRequis = interaction.options.getInteger('reacts');

    pendingSubmissions.set(interaction.user.id, { fichier, salon, reactsRequis });

    const modal = new ModalBuilder()
      .setCustomId('submitModal')
      .setTitle('Détails de la soumission');

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description de ce que tu partages')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const preuveInput = new TextInputBuilder()
      .setCustomId('preuve')
      .setLabel('Lien vers une preuve (photo/vidéo)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(preuveInput)
    );

    await interaction.showModal(modal);
    logger.debug(`Submit modal shown to user ${interaction.user.id} in guild ${interaction.guildId}`);
  },
};
