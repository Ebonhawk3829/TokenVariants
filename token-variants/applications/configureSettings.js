import { cacheImages } from '../scripts/search.js';
import { TVA_CONFIG, updateSettings } from '../scripts/settings.js';
import { getFileName } from '../scripts/utils.js';
import EffectMappingForm from './effectMappingForm.js';
import { showPathSelectCategoryDialog, showPathSelectConfigForm } from './dialogs.js';

export default class ConfigureSettings extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(
    dummySettings,
    {
      searchPaths = true,
      searchFilters = true,
      searchAlgorithm = true,
      randomizer = true,
      popup = true,
      permissions = true,
      worldHud = true,
      misc = true,
      activeEffects = true,
      features = false,
    } = {},
  ) {
    super({});
    this.enabledTabs = {
      searchPaths,
      searchFilters,
      searchAlgorithm,
      randomizer,
      features,
      popup,
      permissions,
      worldHud,
      misc,
      activeEffects,
    };
    this.settings = foundry.utils.deepClone(TVA_CONFIG);
    if (dummySettings) {
      this.settings = foundry.utils.mergeObject(this.settings, dummySettings, { insertKeys: false });
      this.dummySettings = dummySettings;
    }
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-configure-settings',
    classes: ['sheet'],
    position: { width: 700, height: 'auto' },
    window: { resizable: false, minimizable: false, title: 'Configure Settings' },
    form: {
      handler: ConfigureSettings.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/configureSettings.html' },
  };

  _pathIcon(source) {
    if (source === 'data') return 'fas fa-hdd';
    if (source === 'public') return 'fas fa-globe';
    if (source === 'forgevtt') return 'fas fa-dice-d20';
    if (source === 's3') return 'fas fa-cloud';
    if (source === 'rolltable') return 'fas fa-table';
    if (source === 'json') return 'fas fa-code';
    return 'fas fa-question';
  }

  async _prepareContext(options) {
    const settings = this.settings;
    const data = {};

    data.enabledTabs = this.enabledTabs;

    // === Search Paths ===
    const paths = settings.searchPaths.map((path) => {
      const r = {};
      r.text = path.text;
      r.icon = this._pathIcon(path.source || '');
      r.cache = path.cache;
      r.source = path.source || '';
      r.types = path.types.join(',');
      r.config = JSON.stringify(path.config ?? {});
      r.hasConfig = path.config && !foundry.utils.isEmpty(path.config);
      return r;
    });
    data.searchPaths = paths;

    // === Search Filters ===
    data.searchFilters = settings.searchFilters;
    for (const filter in data.searchFilters) {
      data.searchFilters[filter].label = filter;
    }

    // === Algorithm ===
    data.algorithm = foundry.utils.deepClone(settings.algorithm);
    data.algorithm.fuzzyThreshold = 100 - data.algorithm.fuzzyThreshold * 100;

    // === Randomizer ===
    const actorTypes = game.documentTypes.Actor;
    data.randomizer = foundry.utils.deepClone(settings.randomizer);
    data.randomizer.actorTypes = actorTypes.reduce((obj, t) => {
      const label = CONFIG.Actor?.typeLabels?.[t] ?? t;
      obj[t] = {
        label: game.i18n.has(label) ? game.i18n.localize(label) : t,
        disable: settings.randomizer[`${t}Disable`] ?? false,
      };
      return obj;
    }, {});
    data.randomizer.tokenToPortraitDisabled =
      !(settings.randomizer.tokenCreate || settings.randomizer.tokenCopyPaste) || data.randomizer.diffImages;

    // === Pop-up ===
    data.popup = foundry.utils.deepClone(settings.popup);
    data.popup.actorTypes = actorTypes.reduce((obj, t) => {
      const label = CONFIG.Actor?.typeLabels?.[t] ?? t;
      obj[t] = {
        type: t,
        label: game.i18n.has(label) ? game.i18n.localize(label) : t,
        disable: settings.popup[`${t}Disable`] ?? false,
      };
      return obj;
    }, {});

    let allTypes = [];
    let tempTypes = [];
    let i = 0;
    for (const [key, value] of Object.entries(data.popup.actorTypes)) {
      tempTypes.push(value);
      i++;
      if (i % 3 == 0) {
        allTypes.push(tempTypes);
        tempTypes = [];
      }
    }
    if (tempTypes.length > 0) allTypes.push(tempTypes);
    data.popup.actorTypes = allTypes;

    // === Permissions ===
    data.permissions = settings.permissions;

    // === Token HUD ===
    data.worldHud = foundry.utils.deepClone(settings.worldHud);
    data.worldHud.tokenHUDWildcardActive = game.modules.get('token-hud-wildcard')?.active;

    // === Internal Effects ===
    data.internalEffects = foundry.utils.deepClone(settings.internalEffects);

    // === Misc ===
    data.keywordSearch = settings.keywordSearch;
    data.excludedKeywords = settings.excludedKeywords;
    data.systemHpPath = settings.systemHpPath;
    data.runSearchOnPath = settings.runSearchOnPath;
    data.imgurClientId = settings.imgurClientId;
    data.enableStatusConfig = settings.enableStatusConfig;
    data.disableNotifs = settings.disableNotifs;
    data.staticCache = settings.staticCache;
    data.staticCacheFile = settings.staticCacheFile;
    data.stackStatusConfig = settings.stackStatusConfig;
    data.mergeGroup = settings.mergeGroup;
    data.customImageCategories = settings.customImageCategories.join(',');
    data.disableEffectIcons = settings.disableEffectIcons;
    data.displayEffectIconsOnHover = settings.displayEffectIconsOnHover;
    data.filterEffectIcons = settings.filterEffectIcons;
    data.hideElevationTooltip = settings.hideElevationTooltip;
    data.hideTokenBorder = settings.hideTokenBorder;
    data.filterCustomEffectIcons = settings.filterCustomEffectIcons;
    data.filterIconList = settings.filterIconList.join(',');
    data.updateTokenProto = settings.updateTokenProto;
    data.imgNameContainsDimensions = settings.imgNameContainsDimensions;
    data.imgNameContainsFADimensions = settings.imgNameContainsFADimensions;
    data.playVideoOnHover = settings.playVideoOnHover;
    data.pauseVideoOnHoverOut = settings.pauseVideoOnHoverOut;
    data.disableImageChangeOnPolymorphed = settings.disableImageChangeOnPolymorphed;
    data.disableImageUpdateOnNonPrototype = settings.disableImageUpdateOnNonPrototype;
    data.disableTokenUpdateAnimation = settings.disableTokenUpdateAnimation;
    data.evaluateOverlayOnHover = settings.evaluateOverlayOnHover;

    data.pathfinder = ['pf1e', 'pf2e'].includes(game.system.id);
    data.dnd5e = game.system.id === 'dnd5e';

    return data;
  }

  _onRender(context, options) {
    const el = this.element;

    // Search Paths
    el.querySelector('a.create-path')?.addEventListener('click', this._onCreatePath.bind(this));
    el.addEventListener('input', (event) => {
      if (event.target.matches('.searchSource')) this._onSearchSourceTextChange(event);
    });

    // Search Filters
    el.addEventListener('input', (event) => {
      if (event.target.matches('input.filterRegex')) this._validateRegex(event);
    });

    // Active Effects mutual exclusion
    const disableEffectIcons = el.querySelector('[name="disableEffectIcons"]');
    const filterEffectIcons = el.querySelector('[name="filterEffectIcons"]');
    disableEffectIcons?.addEventListener('change', (e) => {
      if (e.target.checked && filterEffectIcons) filterEffectIcons.checked = false;
    });
    filterEffectIcons?.addEventListener('change', (e) => {
      if (e.target.checked && disableEffectIcons) disableEffectIcons.checked = false;
    });

    // Algorithm mutual exclusion
    const algoExact = el.querySelector('input[name="algorithm.exact"]');
    const algoFuzzy = el.querySelector('input[name="algorithm.fuzzy"]');
    algoExact?.addEventListener('change', (e) => {
      if (algoFuzzy) algoFuzzy.checked = !e.target.checked;
    });
    algoFuzzy?.addEventListener('change', (e) => {
      if (algoExact) algoExact.checked = !e.target.checked;
    });
    el.querySelector('input[name="algorithm.fuzzyThreshold"]')?.addEventListener('change', (e) => {
      const sibling = e.target.parentElement?.querySelector('.token-variants-range-value');
      if (sibling) sibling.textContent = `${e.target.value}%`;
    });

    // Randomizer
    const tokenCreate = el.querySelector('input[name="randomizer.tokenCreate"]');
    const tokenCopyPaste = el.querySelector('input[name="randomizer.tokenCopyPaste"]');
    const tokenToPortrait = el.querySelector('input[name="randomizer.tokenToPortrait"]');
    const toggleTokenToPortrait = () => {
      if (tokenToPortrait)
        tokenToPortrait.disabled = !(
          (tokenCreate?.checked) ||
          (tokenCopyPaste?.checked)
        );
    };
    tokenCreate?.addEventListener('change', toggleTokenToPortrait);
    tokenCopyPaste?.addEventListener('change', toggleTokenToPortrait);

    const diffImages = el.querySelector('input[name="randomizer.diffImages"]');
    const syncImages = el.querySelector('input[name="randomizer.syncImages"]');
    diffImages?.addEventListener('change', () => {
      if (syncImages) syncImages.disabled = !diffImages.checked;
      if (tokenToPortrait) tokenToPortrait.disabled = diffImages.checked;
    });

    // Token HUD
    el.querySelector('input[name="worldHud.updateActorImage"]')?.addEventListener('change', (event) => {
      const useNameSimilarity = el.querySelector('input[name="worldHud.useNameSimilarity"]');
      if (useNameSimilarity) useNameSimilarity.disabled = !event.target.checked;
    });

    // Static Cache
    el.querySelector('button.token-variants-cache-images')?.addEventListener('click', (event) => {
      const tab = event.target.closest('.tab');
      const staticOn = tab?.querySelector('input[name="staticCache"]');
      const staticFile = tab?.querySelector('input[name="staticCacheFile"]');
      cacheImages({ staticCache: staticOn?.checked, staticCacheFile: staticFile?.value });
    });

    // Global Mappings
    el.querySelector('button.token-variants-global-mapping')?.addEventListener('click', () => {
      const token = new TokenDocument();
      new EffectMappingForm(token, { globalMappings: true }).render(true);
    });

    // Delegated click handlers
    el.addEventListener('click', (event) => {
      const target = event.target;
      if (target.closest('a.delete-path')) this._onDeletePath(event);
      else if (target.closest('a.convert-imgur')) this._onConvertImgurPath(event);
      else if (target.closest('a.convert-json')) this._onConvertJsonPath(event);
      else if (target.closest('.path-image.source-icon a')) this._onBrowseFolder(event);
      else if (target.closest('a.select-category')) showPathSelectCategoryDialog.call(this, event);
      else if (target.closest('a.select-config')) showPathSelectConfigForm.call(this, event);
    });
  }

  async _validateRegex(event) {
    if (this._validRegex(event.target.value)) {
      event.target.style.backgroundColor = '';
    } else {
      event.target.style.backgroundColor = '#ff7066';
    }
  }

  _validRegex(val) {
    if (val) {
      try {
        new RegExp(val);
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  async _onBrowseFolder(event) {
    const row = event.target.closest('.table-row');
    const pathInput = row.querySelector('.path-text input');
    const sourceInput = row.querySelector('.path-source input');

    let activeSource = sourceInput.value || 'data';
    let current = pathInput.value;

    if (activeSource.startsWith('s3:')) {
      const bucketName = activeSource.replace('s3:', '');
      current = `${game.data.files.s3?.endpoint.protocol}//${bucketName}.${game.data.files.s3?.endpoint.host}/${current}`;
    } else if (activeSource.startsWith('rolltable')) {
      let content = `<select style="width: 100%;" name="table-name" id="output-tableKey">`;
      game.tables.forEach((rollTable) => {
        content += `<option value='${rollTable.name}'>${rollTable.name}</option>`;
      });
      content += `</select>`;

      new Dialog({
        title: `Select a Rolltable`,
        content: content,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: 'Select',
            callback: (html) => {
              const tableName = html.querySelector("select[name='table-name']").value;
              pathInput.value = tableName;
            },
          },
        },
        default: 'yes',
      }).render(true);
      return;
    }

    if (activeSource === 'json') {
      new foundry.applications.apps.FilePicker.implementation({
        type: 'text',
        activeSource: 'data',
        current: current,
        callback: (path, fp) => {
          pathInput.value = path;
        },
      }).render(true);
    } else {
      new foundry.applications.apps.FilePicker.implementation({
        type: 'folder',
        activeSource: activeSource,
        current: current,
        callback: (path, fp) => {
          pathInput.value = fp.result.target;
          if (fp.activeSource === 's3') {
            sourceInput.value = `s3:${fp.result.bucket}`;
          } else {
            sourceInput.value = fp.activeSource;
          }
        },
      }).render(true);
    }
  }

  async _onConvertImgurPath(event) {
    event.preventDefault();
    const row = event.target.closest('.table-row');
    const pathInput = row.querySelector('.path-text input');
    const sourceInput = row.querySelector('.path-source input');

    const albumHash = pathInput.value;
    const imgurClientId = TVA_CONFIG.imgurClientId === '' ? 'df9d991443bb222' : TVA_CONFIG.imgurClientId;

    fetch('https://api.imgur.com/3/gallery/album/' + albumHash, {
      headers: {
        Authorization: 'Client-ID ' + imgurClientId,
        Accept: 'application/json',
      },
    })
      .then((response) => response.json())
      .then(async (result) => {
        if (!result.success && location.hostname === 'localhost') {
          ui.notifications.warn(game.i18n.format('token-variants.notifications.warn.imgur-localhost'));
          return;
        }
        const data = result.data;
        let resultsArray = [];
        data.images.forEach((img, i) => {
          resultsArray.push({
            type: 0,
            text: img.title ?? img.description ?? '',
            weight: 1,
            range: [i + 1, i + 1],
            collection: 'Text',
            drawn: false,
            img: img.link,
          });
        });
        await RollTable.create({
          name: data.title,
          description: 'Token Variant Art auto generated RollTable: https://imgur.com/gallery/' + albumHash,
          results: resultsArray,
          replacement: true,
          displayRoll: true,
          img: 'modules/token-variants/img/token-images.svg',
        });
        pathInput.value = data.title;
        sourceInput.value = 'rolltable';
      });
  }

  async _onConvertJsonPath(event) {
    event.preventDefault();
    const row = event.target.closest('.table-row');
    const pathInput = row.querySelector('.path-text input');
    const sourceInput = row.querySelector('.path-source input');
    pathInput.value = '';
    sourceInput.value = 'json';
  }

  async _onSearchSourceTextChange(event) {
    const row = event.target.closest('.table-row');
    const icon = row.querySelector('.path-image.source-icon i');
    if (icon) {
      icon.className = this._pathIcon(event.target.value);
    }
  }

  async _onCreatePath(event) {
    event.preventDefault();
    await this.submit();
    this.settings.searchPaths.push({
      text: '',
      cache: true,
      source: 'data',
      types: ['Portrait', 'Token', 'PortraitAndToken'],
    });
    this.render();
  }

  async _onDeletePath(event) {
    event.preventDefault();
    await this.submit();
    const li = event.target.closest('.table-row');
    this.settings.searchPaths.splice(li.dataset.index, 1);
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const app = this;
    const expanded = foundry.utils.expandObject(formData.object);

    if (expanded.searchPaths) {
      expanded.searchPaths = Object.values(expanded.searchPaths).map((path) => {
        path.types = path.types.split(',');
        if (path.config) {
          try {
            path.config = JSON.parse(path.config);
          } catch (e) {
            path.config = {};
          }
        }
        return path;
      });
    }

    if (expanded.searchFilters) {
      for (const filter of Object.values(expanded.searchFilters)) {
        if (filter.regex) {
          try {
            new RegExp(filter.regex);
          } catch (e) {
            ui.notifications.error(`Invalid regex: ${filter.regex}`);
            return;
          }
        }
      }
    }

    if (expanded.customImageCategories) {
      expanded.customImageCategories = expanded.customImageCategories.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (expanded.filterIconList) {
      expanded.filterIconList = expanded.filterIconList.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (app.dummySettings) {
      foundry.utils.mergeObject(app.dummySettings, expanded, { inplace: true });
    } else {
      updateSettings(expanded);
    }
  }
}
