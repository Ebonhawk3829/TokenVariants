export default class RandomizerConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(obj) {
    super({});
    this.actor = game.actors.get(obj.actorId);
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-token-flags',
    classes: ['sheet'],
    position: { width: 500 },
    window: { resizable: true, minimizable: false, title: 'Randomizer' },
    form: {
      handler: RandomizerConfig.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/randomizerConfig.html' },
  };

  async _prepareContext(options) {
    const settings = this.actor.getFlag('token-variants', 'randomizerSettings') || {};
    const data = {
      randomizer: settings,
      hasSettings: !foundry.utils.isEmpty(settings),
      nameForgeActive: game.modules.get('nameforge')?.active,
    };
    if (data.randomizer.nameForge?.models && Array.isArray(data.randomizer.nameForge.models)) {
      data.randomizer.nameForge.models = data.randomizer.nameForge.models.join(',');
    }
    return data;
  }

  _onRender(context, options) {
    const el = this.element;

    el.querySelector('.selectNameForgeModels')?.addEventListener('click', this._selectNameForgeModels.bind(this));

    const tokenName = el.querySelector('input[name="randomizer.tokenName"]');
    const actorName = el.querySelector('input[name="randomizer.actorName"]');
    tokenName?.addEventListener('change', () => {
      if (tokenName.checked) actorName.checked = false;
    });
    actorName?.addEventListener('change', () => {
      if (actorName.checked) tokenName.checked = false;
    });
  }

  _selectNameForgeModels(event) {
    const inputSelected = event.target.parentElement.querySelector('input');
    const selected = inputSelected.value.split(',');
    const genCheckbox = function (name, value) {
      return `
      <div class="form-group">
        <label>${name}</label>
        <div class="form-fields">
            <input type="checkbox" name="model" value="${value}" data-dtype="Boolean" ${
        selected?.find((v) => v === value) ? 'checked' : ''
      }>
        </div>
      </div>
      `;
    };

    let content = '<form style="overflow-y: scroll; height:400px;">';

    const models = game.modules.get('nameforge').models;
    for (const [k, v] of Object.entries(models.defaultModels)) {
      content += genCheckbox(v.name, 'defaultModels.' + k);
    }
    for (const [k, v] of Object.entries(models.userModels)) {
      content += genCheckbox(v.name, 'userModels.' + k);
    }
    content += `</form>`;

    new Dialog({
      title: `Name Forge Models`,
      content: content,
      buttons: {
        Ok: {
          label: `Select`,
          callback: async (html) => {
            const selectedModels = [];
            html.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
              if (cb.checked) selectedModels.push(cb.value);
            });
            inputSelected.value = selectedModels.join(',');
          },
        },
      },
    }).render(true);
  }

  static async #onSubmit(event, form, formData) {
    const app = this;
    if (event.submitter.value === 'remove') {
      await app.actor.unsetFlag('token-variants', 'randomizerSettings');
    } else {
      const expanded = foundry.utils.expandObject(formData.object);
      if (expanded.randomizer.nameForge?.models) {
        expanded.randomizer.nameForge.models = expanded.randomizer.nameForge.models.split(',');
      }
      app.actor.setFlag('token-variants', 'randomizerSettings', expanded.randomizer);
    }
  }
}
