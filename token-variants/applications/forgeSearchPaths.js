import { TVA_CONFIG, updateSettings } from '../scripts/settings.js';
import { showPathSelectCategoryDialog, showPathSelectConfigForm } from './dialogs.js';

export class ForgeSearchPaths extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor() {
    super({});
    this.object = {};
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-search-paths',
    classes: ['sheet'],
    position: { width: 592, height: 'auto' },
    window: { resizable: true, minimizable: false, title: game.i18n.localize('token-variants.settings.search-paths.Name') },
    form: {
      handler: ForgeSearchPaths._onSubmitV2,
      submitOnChange: false,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/forgeSearchPaths.html' },
  };

  async _prepareContext(options) {
    if (!this.object.paths) this.object.paths = await this._getPaths();

    const paths = this.object.paths.map((path) => {
      const r = {};
      r.text = path.text;
      r.cache = path.cache;
      r.share = path.share;
      r.types = path.types.join(',');
      r.config = JSON.stringify(path.config ?? {});
      return r;
    });

    return { paths, apiKey: this.apiKey };
  }

  async _getPaths() {
    const forgePaths = foundry.utils.deepClone(TVA_CONFIG.forgeSearchPaths) || {};
    this.userId = typeof ForgeAPI !== 'undefined' ? await ForgeAPI.getUserId() : 'tempUser'; // TODO
    this.apiKey = forgePaths[this.userId]?.apiKey;
    return forgePaths[this.userId]?.paths || [];
  }

  _onRender(context, options) {
    const el = this.element;

    el.querySelector('a.create-path')?.addEventListener('click', this._onCreatePath.bind(this));
    el.querySelector('a.delete-path')?.addEventListener('click', this._onDeletePath.bind(this));
    el.querySelector('button.reset')?.addEventListener('click', this._onReset.bind(this));
    el.querySelector('button.update')?.addEventListener('click', this._onUpdate.bind(this));

    el.addEventListener('click', (event) => {
      const target = event.target;
      if (target.closest('a.select-category')) {
        showPathSelectCategoryDialog.call(this, event);
      } else if (target.closest('a.select-config')) {
        showPathSelectConfigForm.call(this, event);
      } else if (target.closest('.path-image.source-icon a')) {
        this._onBrowseFolder(event);
      }
    });
  }

  async _onBrowseFolder(event) {
    const row = event.target.closest('.table-row');
    const pathInput = row.querySelector('.path-text input');

    new foundry.applications.apps.FilePicker.implementation({
      type: 'folder',
      activeSource: 'forgevtt',
      current: pathInput.value,
      callback: (path, fp) => {
        if (fp.activeSource !== 'forgevtt') {
          ui.notifications.warn("Token Variant Art: Only 'Assets Library' paths are supported");
        } else {
          pathInput.value = fp.result.target;
        }
      },
    }).render(true);
  }

  async _onCreatePath(event) {
    event.preventDefault();
    await this.submit();

    this.object.paths.push({
      text: '',
      cache: true,
      share: true,
      types: ['Portrait', 'Token', 'PortraitAndToken'],
    });
    this.render();
  }

  async _onDeletePath(event) {
    event.preventDefault();
    await this.submit();

    const li = event.currentTarget.closest('.table-row');
    this.object.paths.splice(li.dataset.index, 1);
    this.render();
  }

  _onReset(event) {
    event.preventDefault();
    this.object.paths = this._getPaths();
    this.render();
  }

  async _onUpdate(event) {
    event.preventDefault();
    await this.submit();
    this._updatePaths();
  }

  static async _onSubmitV2(event, form, formData) {
    const app = this;
    const expanded = foundry.utils.expandObject(formData.object);
    expanded.paths = expanded.hasOwnProperty('paths') ? Object.values(expanded.paths) : [];
    expanded.paths.forEach((path, index) => {
      app.object.paths[index] = {
        text: path.text,
        cache: path.cache,
        share: path.share,
        source: path.source,
        types: path.types.split(','),
      };
      if (path.config) {
        try {
          path.config = JSON.parse(path.config);
          if (!foundry.utils.isEmpty(path.config)) {
            app.object.paths[index].config = path.config;
          }
        } catch (e) {}
      }
    });
    app.apiKey = expanded.apiKey;
  }

  _cleanPaths() {
    let uniquePaths = new Set();
    let paths = this.object.paths.filter((path) => {
      if (!path.text || uniquePaths.has(path.text)) return false;
      uniquePaths.add(path.text);
      return true;
    });
    return paths;
  }

  _updatePaths() {
    if (this.userId) {
      const forgePaths = foundry.utils.deepClone(TVA_CONFIG.forgeSearchPaths) || {};
      forgePaths[this.userId] = {
        paths: this._cleanPaths(),
        apiKey: this.apiKey,
      };

      if (game.user.isGM) {
        updateSettings({ forgeSearchPaths: forgePaths });
      } else {
        const message = {
          handlerName: 'forgeSearchPaths',
          args: forgePaths,
          type: 'UPDATE',
        };
        game.socket?.emit('module.token-variants', message);
      }
    }
  }

  async close(options = {}) {
    await this.submit();
    this._updatePaths();
    return super.close(options);
  }
}
