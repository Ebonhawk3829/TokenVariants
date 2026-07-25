import { TVA_CONFIG } from '../scripts/settings.js';

export default class TokenHUDClientSettings extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  static DEFAULT_OPTIONS = {
    id: 'token-variants-hud-settings',
    classes: ['sheet'],
    position: { width: 500 },
    window: { resizable: false, minimizable: false, title: '' },
    form: {
      handler: TokenHUDClientSettings.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/tokenHUDClientSettings.html' },
  };

  async _prepareContext(options) {
    return TVA_CONFIG.hud;
  }

  static async #onSubmit(event, form, formData) {
    await game.settings.set('token-variants', 'hudSettings', foundry.utils.mergeObject(TVA_CONFIG.hud, formData.object));
  }
}
