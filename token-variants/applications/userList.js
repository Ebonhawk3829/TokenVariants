import { TVA_CONFIG, updateSettings } from '../scripts/settings.js';
import { SEARCH_TYPE, decodeURISafely } from '../scripts/utils.js';
import { insertArtSelectButton } from './artSelect.js';

export default class UserList extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(object, img, regenStyle) {
    super({});
    this.object = object;
    this.img = img;
    this.regenStyle = regenStyle;
  }

  static DEFAULT_OPTIONS = {
    id: 'token-variants-user-list',
    classes: ['sheet'],
    position: { width: 300 },
    window: { resizable: false, minimizable: false, title: 'User To Image' },
    form: {
      handler: UserList._onSubmitV2,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: { template: 'modules/token-variants/templates/userList.html' },
  };

  async _prepareContext(options) {
    const mappings = this.object.document.getFlag('token-variants', 'userMappings') || {};
    const users = [];
    game.users.forEach((user) => {
      users.push({
        avatar: user.avatar,
        name: user.name,
        apply: user.id in mappings && mappings[user.id] === this.img,
        userId: user.id,
        color: user.color,
      });
    });
    return { users, invisibleImage: TVA_CONFIG.invisibleImage };
  }

  _onRender(context, options) {
    insertArtSelectButton(this.element, 'invisibleImage', {
      search: 'Invisible Image',
      searchType: SEARCH_TYPE.TOKEN,
    });
  }

  static async _onSubmitV2(event, form, formData) {
    const app = this;
    const mappings = app.object.document.getFlag('token-variants', 'userMappings') || {};
    const data = formData.object;

    if (data.invisibleImage !== TVA_CONFIG.invisibleImage) {
      updateSettings({ invisibleImage: decodeURISafely(data.invisibleImage) });
    }
    delete data.invisibleImage;

    const affectedImages = [app.img];

    for (const [userId, apply] of Object.entries(data)) {
      if (apply) {
        if (mappings[userId] && mappings[userId] !== app.img) affectedImages.push(mappings[userId]);
        mappings[userId] = app.img;
      } else if (mappings[userId] === app.img) {
        delete mappings[userId];
        mappings['-=' + userId] = null;
      }
    }

    if (Object.keys(mappings).filter((userId) => !userId.startsWith('-=')).length === 0) {
      await app.object.document.unsetFlag('token-variants', 'userMappings');
    } else {
      await app.object.document.setFlag('token-variants', 'userMappings', mappings);
    }

    for (const img of affectedImages) {
      app.regenStyle(app.object, img);
    }
  }
}
