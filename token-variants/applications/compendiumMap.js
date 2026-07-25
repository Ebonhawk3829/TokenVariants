import { showArtSelect } from '../token-variants.mjs';
import {
  BASE_IMAGE_CATEGORIES,
  SEARCH_TYPE,
  updateActorImage,
  updateTokenImage,
  userRequiresImageCache,
} from '../scripts/utils.js';
import { addToQueue, ArtSelect, renderFromQueue } from './artSelect.js';
import { getSearchOptions, TVA_CONFIG, updateSettings } from '../scripts/settings.js';
import ConfigureSettings from './configureSettings.js';
import MissingImageConfig from './missingImageConfig.js';
import { cacheImages, doImageSearch } from '../scripts/search.js';

async function autoApply(actor, image1, image2, formData, typeOverride) {
  let portraitFound = formData.ignorePortrait;
  let tokenFound = formData.ignoreToken;

  if (formData.diffImages) {
    let results = [];

    if (!formData.ignorePortrait) {
      results = await doImageSearch(actor.name, {
        searchType: typeOverride ?? SEARCH_TYPE.PORTRAIT,
        simpleResults: true,
        searchOptions: formData.searchOptions,
      });

      if ((results ?? []).length != 0) {
        portraitFound = true;
        await updateActorImage(actor, results[0], false, formData.compendium);
      }
    }

    if (!formData.ignoreToken) {
      results = await doImageSearch(actor.prototypeToken.name, {
        searchType: SEARCH_TYPE.TOKEN,
        simpleResults: true,
        searchOptions: formData.searchOptions,
      });

      if ((results ?? []).length != 0) {
        tokenFound = true;
        updateTokenImage(results[0], {
          actor: actor,
          pack: formData.compendium,
          applyDefaultConfig: false,
        });
      }
    }
  } else {
    let results = await doImageSearch(actor.name, {
      searchType: typeOverride ?? SEARCH_TYPE.PORTRAIT_AND_TOKEN,
      simpleResults: true,
      searchOptions: formData.searchOptions,
    });

    if ((results ?? []).length != 0) {
      portraitFound = tokenFound = true;
      updateTokenImage(results[0], {
        actor: actor,
        actorUpdate: { img: results[0] },
        pack: formData.compendium,
        applyDefaultConfig: false,
      });
    }
  }

  if (!(tokenFound && portraitFound) && formData.autoDisplayArtSelect) {
    addToArtSelectQueue(actor, image1, image2, formData, typeOverride);
  }
}

function addToArtSelectQueue(actor, image1, image2, formData, typeOverride) {
  if (formData.diffImages) {
    if (!formData.ignorePortrait && !formData.ignoreToken) {
      addToQueue(actor.name, {
        searchType: typeOverride ?? SEARCH_TYPE.PORTRAIT,
        object: actor,
        preventClose: true,
        image1: image1,
        image2: image2,
        displayMode: ArtSelect.IMAGE_DISPLAY.PORTRAIT,
        searchOptions: formData.searchOptions,
        callback: async function (imgSrc, _) {
          await updateActorImage(actor, imgSrc);
          showArtSelect(actor.prototypeToken.name, {
            searchType: typeOverride ?? SEARCH_TYPE.TOKEN,
            object: actor,
            force: true,
            image1: imgSrc,
            image2: image2,
            displayMode: ArtSelect.IMAGE_DISPLAY.TOKEN,
            searchOptions: formData.searchOptions,
            callback: (imgSrc, name) =>
              updateTokenImage(imgSrc, {
                actor: actor,
                imgName: name,
                applyDefaultConfig: false,
              }),
          });
        },
      });
    } else if (formData.ignorePortrait) {
      addToQueue(actor.name, {
        searchType: typeOverride ?? SEARCH_TYPE.TOKEN,
        object: actor,
        image1: image1,
        image2: image2,
        displayMode: ArtSelect.IMAGE_DISPLAY.TOKEN,
        searchOptions: formData.searchOptions,
        callback: async function (imgSrc, name) {
          updateTokenImage(imgSrc, {
            actor: actor,
            imgName: name,
            applyDefaultConfig: false,
          });
        },
      });
    } else if (formData.ignoreToken) {
      addToQueue(actor.name, {
        searchType: typeOverride ?? SEARCH_TYPE.PORTRAIT,
        object: actor,
        image1: image1,
        image2: image2,
        displayMode: ArtSelect.IMAGE_DISPLAY.PORTRAIT,
        searchOptions: formData.searchOptions,
        callback: async function (imgSrc, name) {
          await updateActorImage(actor, imgSrc);
        },
      });
    }
  } else {
    addToQueue(actor.name, {
      searchType: typeOverride ?? SEARCH_TYPE.PORTRAIT_AND_TOKEN,
      object: actor,
      image1: image1,
      image2: image2,
      displayMode: ArtSelect.IMAGE_DISPLAY.PORTRAIT_TOKEN,
      searchOptions: formData.searchOptions,
      callback: async function (imgSrc, name) {
        await updateActorImage(actor, imgSrc);
        updateTokenImage(imgSrc, {
          actor: actor,
          imgName: name,
          applyDefaultConfig: false,
        });
      },
    });
  }
}

export default class CompendiumMapConfig extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor() {
    super({});
    this.searchOptions = foundry.utils.deepClone(getSearchOptions());
    foundry.utils.mergeObject(this.searchOptions, foundry.utils.deepClone(TVA_CONFIG.compendiumMapper.searchOptions));
    this._fixSearchPaths();
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-compendium-map-config',
    classes: ['sheet'],
    position: { width: 500 },
    window: { resizable: false, minimizable: false, title: game.i18n.localize('token-variants.settings.compendium-mapper.Name') },
    form: {
      handler: CompendiumMapConfig.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/compendiumMap.html' },
  };

  async _prepareContext(options) {
    const supportedPacks = ['Actor', 'Cards', 'Item', 'Macro', 'RollTable'];
    const packs = [];
    game.packs.forEach((pack) => {
      if (!pack.locked && supportedPacks.includes(pack.documentName)) {
        packs.push({ title: pack.title, id: pack.collection, type: pack.documentName });
      }
    });

    return {
      ...TVA_CONFIG.compendiumMapper,
      supportedPacks: supportedPacks.join(', '),
      compendiums: packs,
      compendium: TVA_CONFIG.compendiumMapper.compendium,
      categories: BASE_IMAGE_CATEGORIES.concat(TVA_CONFIG.customImageCategories),
      category: TVA_CONFIG.compendiumMapper.category,
    };
  }

  _onRender(context, options) {
    const el = this.element;

    const overrideCat = el.querySelector('.token-variants-override-category');
    const autoApply = el.querySelector('.token-variants-auto-apply');
    const diffImages = el.querySelector('.token-variants-diff-images');
    const compendiumSelect = el.querySelector('[name="compendium"]');

    overrideCat?.addEventListener('change', (e) => {
      const cat = el.querySelector('.token-variants-category');
      if (cat) cat.disabled = !e.target.checked;
    });
    overrideCat?.dispatchEvent(new Event('change'));

    autoApply?.addEventListener('change', (e) => {
      const artSelect = el.querySelector('.token-variants-auto-art-select');
      if (artSelect) artSelect.disabled = !e.target.checked;
    });

    diffImages?.addEventListener('change', (e) => {
      const tpIgnore = el.querySelector('.token-variants-tp-ignore');
      if (tpIgnore) tpIgnore.disabled = !e.target.checked;
    });

    compendiumSelect?.addEventListener('change', (e) => {
      const compendium = game.packs.get(e.target.value);
      if (compendium) {
        const tokenSpecific = el.querySelector('.token-specific');
        if (tokenSpecific) tokenSpecific.style.visibility = compendium.documentName === 'Actor' ? 'visible' : 'hidden';
      }
    });
    compendiumSelect?.dispatchEvent(new Event('change'));

    el.querySelector('.token-variants-search-options')?.addEventListener('click', this._onSearchOptions.bind(this));
    el.querySelector('.token-variants-missing-images')?.addEventListener('click', this._onMissingImages.bind(this));
  }

  _fixSearchPaths() {
    if (!this.searchOptions.searchPaths?.length) {
      this.searchOptions.searchPaths = foundry.utils.deepClone(TVA_CONFIG.searchPaths);
    }
  }

  async _onSearchOptions(event) {
    this._fixSearchPaths();
    new ConfigureSettings(this.searchOptions, {
      searchPaths: true,
      searchFilters: true,
      searchAlgorithm: true,
      randomizer: false,
      features: false,
      popup: false,
      permissions: false,
      worldHud: false,
      misc: false,
      activeEffects: false,
    }).render(true);
  }

  async _onMissingImages(event) {
    new MissingImageConfig().render(true);
  }

  async startMapping(formData) {
    if (formData.diffImages && formData.ignoreToken && formData.ignorePortrait) {
      return;
    }

    const originalSearchPaths = TVA_CONFIG.searchPaths;
    if (formData.searchOptions.searchPaths?.length) {
      TVA_CONFIG.searchPaths = formData.searchOptions.searchPaths;
    }

    if (formData.cache || !userRequiresImageCache() || formData.searchOptions.searchPaths?.length) {
      console.log('TVA-Mapper: Starting Image caching.');
      await cacheImages();
      console.log('TVA-Mapper: Caching finished.');
    }

    const endMapping = function () {
      if (formData.searchOptions.searchPaths?.length) {
        TVA_CONFIG.searchPaths = originalSearchPaths;
        cacheImages();
      }
    };

    const compendium = game.packs.get(formData.compendium);
    let missingImageList = TVA_CONFIG.compendiumMapper.missingImages
      .filter((mi) => mi.document === 'all' || mi.document === compendium.documentName)
      .map((mi) => mi.image);
    const typeOverride = formData.overrideCategory ? formData.category : null;
    let artSelectDisplayed = false;

    let processItem;
    let consoleProcessedTracking = 0;
    if (compendium.documentName === 'Actor') {
      processItem = async function (item) {
        const actor = item;
        if (actor.name === '#[CF_tempEntity]') return;

        let hasPortrait = actor.img !== CONST.DEFAULT_TOKEN && !missingImageList.includes(actor.img);
        let hasToken =
          actor.prototypeToken.texture.src !== CONST.DEFAULT_TOKEN &&
          !missingImageList.includes(actor.prototypeToken.texture.src);
        if (formData.syncImages && hasPortrait !== hasToken) {
          if (hasPortrait) {
            await updateTokenImage(actor.img, { actor: actor, applyDefaultConfig: false });
          } else {
            await updateActorImage(actor, actor.prototypeToken.texture.src);
          }
          hasPortrait = hasToken = true;
        }

        let includeThisActor = !(formData.missingOnly && hasPortrait) && !formData.ignorePortrait;
        let includeThisToken = !(formData.missingOnly && hasToken) && !formData.ignoreToken;

        const image1 = formData.showImages ? actor.img : '';
        const image2 = formData.showImages ? actor.prototypeToken.texture.src : '';

        if (includeThisActor || includeThisToken) {
          if (formData.autoApply) {
            await autoApply(actor, image1, image2, formData, typeOverride);
          } else {
            artSelectDisplayed = true;
            addToArtSelectQueue(actor, image1, image2, formData, typeOverride);
          }
        }

        consoleProcessedTracking++;
        if (consoleProcessedTracking % 100 === 0)
          console.log(`TVA-Mapper: Processed ${consoleProcessedTracking} ${compendium.documentName}s`);
      };
    } else {
      processItem = async function (item) {
        const doc = item;
        if (doc.name === '#[CF_tempEntity]') return;

        let defaultImg = '';
        if (doc.schema.fields.img || doc.schema.fields.texture) {
          defaultImg = (doc.schema.fields.img ?? doc.schema.fields.texture).initial(doc);
        }
        const hasImage = doc.img != null && doc.img !== defaultImg && !missingImageList.includes(doc.img);

        let imageFound = false;
        if (formData.missingOnly && hasImage) return;
        if (formData.autoApply) {
          let results = await doImageSearch(doc.name, {
            searchType: typeOverride ?? compendium.documentName,
            simpleResults: true,
            searchOptions: formData.searchOptions,
          });

          if ((results ?? []).length != 0) {
            imageFound = true;
            await updateActorImage(doc, results[0], false, formData.compendium);
          }
        }

        if (!formData.autoApply || (formData.autoDisplayArtSelect && !imageFound)) {
          artSelectDisplayed = true;
          addToQueue(doc.name, {
            searchType: typeOverride ?? compendium.documentName,
            object: doc,
            image1: formData.showImages ? doc.img : '',
            displayMode: ArtSelect.IMAGE_DISPLAY.IMAGE,
            searchOptions: formData.searchOptions,
            callback: async function (imgSrc, name) {
              await updateActorImage(doc, imgSrc);
            },
          });
        }

        consoleProcessedTracking++;
        if (consoleProcessedTracking % 100 === 0)
          console.log(`TVA-Mapper: Processed ${consoleProcessedTracking} ${compendium.documentName}s`);
      };
    }

    console.log(`TVA-Mapper: Starting Batch ${compendium.documentName} load.`);
    const documents = await compendium.getDocuments();
    console.log(`TVA-Mapper: Load finished. Beginning processing.`);

    if (formData.autoApply) {
      let processing = true;
      let stopProcessing = false;
      let processed = 0;
      let counter = document.createElement('p');
      counter.textContent = `CACHING 0/${documents.length}`;
      let d;

      const startProcessing = async function () {
        while (processing && processed < documents.length) {
          await new Promise((resolve, reject) => {
            setTimeout(async () => {
              await processItem(documents[processed]);
              resolve();
            }, 10);
          });
          processed++;
          counter.textContent = `${processed}/${documents.length}`;
        }
        if (stopProcessing || processed === documents.length) {
          d?.close(true);
          addToQueue('DUMMY', { execute: endMapping });
          renderFromQueue();
        }
      };

      d = new Dialog({
        title: `Processing ${compendium.title}`,
        content: counter.outerHTML,
        buttons: {
          stop: {
            icon: "<i class='fas fa-stop'></i>",
            label: 'Stop',
            callback: () => {
              processing = false;
              stopProcessing = true;
            },
          },
        },
        close: () => {
          processing = false;
          stopProcessing = true;
        },
      }).render(true);

      startProcessing();
    } else {
      for (const doc of documents) {
        await processItem(doc);
      }
      addToQueue('DUMMY', { execute: endMapping });
      renderFromQueue();
    }
  }

  static async #onSubmit(event, form, formData) {
    const app = this;
    const data = formData.object;

    if (data.searchOptions) {
      foundry.utils.mergeObject(app.searchOptions, data.searchOptions);
      delete data.searchOptions;
    }

    updateSettings({ compendiumMapper: data });

    if (data.compendium) {
      app.startMapping(data);
    }
  }
}
