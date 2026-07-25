import { TVA_CONFIG, updateSettings } from '../scripts/settings.js';
import { getFileName } from '../scripts/utils.js';
import { showArtSelect } from '../token-variants.mjs';

export default class MissingImageConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor() {
    super({});
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-missing-images',
    classes: ['sheet'],
    position: { width: 560, height: 'auto' },
    window: { resizable: true, minimizable: false, title: 'Define Missing Images' },
    form: {
      handler: MissingImageConfig._onSubmitV2,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/missingImageConfig.html' },
  };

  async _prepareContext(options) {
    if (!this.missingImages) this.missingImages = foundry.utils.deepClone(TVA_CONFIG.compendiumMapper.missingImages);
    return {
      missingImages: this.missingImages,
      documents: ['all', 'Actor', 'Cards', 'Item', 'Macro', 'RollTable'],
    };
  }

  _processFormData(formData) {
    if (!Array.isArray(formData.document)) {
      formData.document = [formData.document];
      formData.image = [formData.image];
    }
    const missingImages = [];
    for (let i = 0; i < formData.document.length; i++) {
      missingImages.push({ document: formData.document[i], image: formData.image[i] });
    }
    return missingImages;
  }

  _onRender(context, options) {
    const el = this.element;

    el.addEventListener('click', (event) => {
      const target = event.target;

      if (target.closest('.add-row')) {
        const formData = this._getSubmitData();
        this.missingImages = this._processFormData(formData);
        this.missingImages.push({ document: 'all', image: CONST.DEFAULT_TOKEN });
        this.render();
        return;
      }

      if (target.closest('.delete-row')) {
        const formData = this._getSubmitData();
        this.missingImages = this._processFormData(formData);
        const li = target.closest('li');
        const index = li.dataset.index;
        this.missingImages.splice(index, 1);
        this.render();
        return;
      }

      if (target.closest('.file-picker')) {
        const li = target.closest('li');
        new foundry.applications.apps.FilePicker.implementation({
          type: 'imagevideo',
          callback: (path) => {
            const imgInput = li.querySelector('[name="image"]');
            if (imgInput) imgInput.value = path;
            const img = li.querySelector('img');
            if (img) img.src = path;
          },
        }).render();
        return;
      }

      if (target.closest('.duplicate-picker')) {
        const li = target.closest('li');
        let content = `<select style="width: 100%;" name="compendium">`;
        game.packs.forEach((pack) => {
          content += `<option value='${pack.collection}'>${pack.title}</option>`;
        });
        content += `</select>`;

        new Dialog({
          title: `Compendiums`,
          content: content,
          buttons: {
            yes: {
              icon: "<i class='far fa-search'></i>",
              label: 'Search for Duplicates',
              callback: (dlgHtml) => {
                const found = new Set();
                const duplicates = new Set();
                const compendium = game.packs.get(dlgHtml.querySelector("[name='compendium']").value);
                compendium.index.forEach((k) => {
                  if (found.has(k.img)) duplicates.add(k.img);
                  found.add(k.img);
                });
                if (!duplicates.size) {
                  ui.notifications.info('No duplicates found in: ' + compendium.title);
                }
                const images = Array.from(duplicates).map((img) => {
                  return { path: img, name: getFileName(img) };
                });
                const allImages = new Map();
                allImages.set('Duplicates', images);
                showArtSelect('Duplicates', {
                  allImages,
                  callback: (img) => {
                    const imgInput = li.querySelector('[name="image"]');
                    if (imgInput) imgInput.value = img;
                    const imgEl = li.querySelector('img');
                    if (imgEl) imgEl.src = img;
                  },
                });
              },
            },
          },
          default: 'yes',
        }).render(true);
      }
    });
  }

  static async _onSubmitV2(event, form, formData) {
    const app = this;
    updateSettings({
      compendiumMapper: { missingImages: app._processFormData(formData.object) },
    });
  }
}
