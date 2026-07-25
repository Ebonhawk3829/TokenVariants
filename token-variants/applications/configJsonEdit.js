export default class EditJsonConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(config, callback) {
    super({});
    this.config = config;
    this.callback = callback;
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-config-json-edit',
    classes: ['sheet'],
    position: { width: 400, height: 380 },
    window: { resizable: true, minimizable: false, title: 'Edit Token Configuration' },
    form: {
      handler: EditJsonConfig._onSubmitV2,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/configJsonEdit.html' },
  };

  async _prepareContext(options) {
    const hasConfig = this.config != null && Object.keys(this.config).length !== 0;
    return {
      hasConfig,
      config: JSON.stringify(hasConfig ? this.config : {}, null, 2),
    };
  }

  _onRender(context, options) {
    const el = this.element;
    el.querySelector('.command textarea')?.addEventListener('input', this._validateJSON.bind(this));
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
    el.querySelector('.format')?.addEventListener('click', this._onFormat.bind(this));
  }

  async _validateJSON(event) {
    const form = event.target.closest('form');
    const controls = form.querySelectorAll('button[type="submit"], button.format');
    try {
      this.config = JSON.parse(event.target.value);
      this.config = foundry.utils.expandObject(this.config);
      this.flag = this.config.flag;
      controls.forEach((c) => (c.disabled = false));
    } catch (e) {
      controls.forEach((c) => (c.disabled = true));
    }
  }

  async _onRemove(event) {
    this.config = {};
    this.submit();
  }

  async _onFormat(event) {
    const form = event.target.closest('form');
    form.querySelector('textarea[name="config"]').value = JSON.stringify(this.config, null, 2);
  }

  static async _onSubmitV2(event, form, formData) {
    const app = this;
    if (app.callback) app.callback(app.config);
  }
}
