export default class EditScriptConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(script, callback) {
    super({});
    this.script = script;
    this.callback = callback;
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-config-script-edit',
    classes: ['sheet'],
    position: { width: 640, height: 640 },
    window: { resizable: true, minimizable: false, title: 'Scripts' },
    form: {
      handler: EditScriptConfig.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/configScriptEdit.html' },
  };

  async _prepareContext(options) {
    const script = this.script ? this.script : {};
    const data = {
      hasScript: !foundry.utils.isEmpty(script),
      onApply: script.onApply,
      onRemove: script.onRemove,
      macroOnApply: script.macroOnApply,
      macroOnRemove: script.macroOnRemove,
      tmfxPreset: script.tmfxPreset,
      tmfxActive: game.modules.get('tokenmagic')?.active,
      ceActive: game.modules.get('dfreds-convenient-effects')?.active,
      ceEffect: script.ceEffect ?? { apply: true, remove: true },
      macros: game.macros.map((m) => m.name),
    };
    if (data.tmfxActive) {
      data.tmfxPresets = TokenMagic.getPresets().map((p) => p.name);
    }
    if (data.ceActive) {
      data.ceEffects = game.dfreds.effectInterface.findEffects().map((ef) => ef.name);
    }
    return data;
  }

  _onRender(context, options) {
    const el = this.element;
    el.querySelector('.command textarea')?.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        return false;
      }
    });
    el.querySelector('.remove')?.addEventListener('click', this._onRemove.bind(this));
  }

  async _onRemove(event) {
    if (this.callback) this.callback(null);
    this.close();
  }

  static async #onSubmit(event, form, formData) {
    let data = foundry.utils.expandObject(formData.object);
    ['onApply', 'onRemove', 'macroOnApply', 'macroOnRemove'].forEach((k) => {
      data[k] = data[k].trim();
    });
    if (data.ceEffect?.name) data.ceEffect.name = data.ceEffect.name.trim();

    if (
      !data.onApply &&
      !data.onRemove &&
      !data.tmfxPreset &&
      !data.ceEffect.name &&
      !data.macroOnApply &&
      !data.macroOnRemove
    ) {
      if (this.callback) this.callback(null);
    } else {
      if (this.callback) this.callback(data);
    }
  }
}
