export default class FlagsConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(obj) {
    super({});
    if (obj instanceof foundry.canvas.placeables.Tile) {
      this.objectToFlag = obj.document;
      this.isTile = true;
    } else {
      this.objectToFlag = game.actors.get(obj.document.actorId) || obj.document;
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-token-flags',
    classes: ['sheet'],
    position: { width: 500 },
    window: { resizable: true, minimizable: false, title: 'Flags' },
    form: {
      handler: FlagsConfig._onSubmitV2,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/flagsConfig.html' },
  };

  async _prepareContext(options) {
    const popups = this.objectToFlag.getFlag('token-variants', 'popups');
    const disableNameSearch = this.objectToFlag.getFlag('token-variants', 'disableNameSearch');
    const directory = this.objectToFlag.getFlag('token-variants', 'directory') || {};

    return {
      popups,
      popupsSetFlag: popups != null,
      disableNameSearch,
      disableNameSearchSetFlag: disableNameSearch != null,
      directory: directory.path,
      directorySource: directory.source,
      directorySetFlag: !foundry.utils.isEmpty(directory),
      tile: this.isTile,
    };
  }

  _onRender(context, options) {
    const el = this.element;

    el.querySelectorAll('.controlFlag').forEach((cb) => {
      cb.addEventListener('click', (e) => {
        const flag = e.target.parentElement.querySelector('.flag');
        if (flag) flag.disabled = !e.target.checked;
      });
    });

    el.querySelector('.directory-fp')?.addEventListener('click', (event) => {
      new foundry.applications.apps.FilePicker.implementation({
        type: 'folder',
        activeSource: 'data',
        callback: (path, fp) => {
          const dirInput = el.querySelector('[name="directory"]');
          if (dirInput) dirInput.value = fp.result.target;
          const btn = event.target.closest('button');
          if (btn) btn.title = 'Directory: ' + fp.result.target;
          const sourceEl = el.querySelector('[name="directorySource"]');
          if (sourceEl) {
            if (fp.activeSource === 's3') {
              sourceEl.value = `s3:${fp.result.bucket}`;
            } else {
              sourceEl.value = fp.activeSource;
            }
          }
        },
      }).render(true);
    });
  }

  static async _onSubmitV2(event, form, formData) {
    const app = this;
    const data = formData.object;

    if ('directory' in data) {
      data.directory = { path: data.directory, source: data.directorySource };
    }

    ['popups', 'disableNameSearch', 'directory'].forEach((flag) => {
      if (flag in data) {
        app.objectToFlag.setFlag('token-variants', flag, data[flag]);
      } else {
        app.objectToFlag.unsetFlag('token-variants', flag);
      }
    });
  }
}
