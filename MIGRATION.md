# V14 Migration Notes — Token Variant Art v6.1.4

## Summary

Migrated Token Variant Art from Foundry v13 to v14. Core work: dropped v13 support (min/verified now 14), converted all FormApplication subclasses to ApplicationV2, and replaced jQuery-based hook/DOM handling with native DOM throughout.

## What was done

**Manifest** — `compatibility.minimum` and `verified` set to `14`.

**Hooks** — Removed dead `render*ConfigV2` hook registrations; v14 fires the unsuffixed names (e.g. `renderTokenConfig`) for V2 core config sheets, delivering a raw DOM element instead of jQuery. Kept `renderActorSheetV2` (a real hook). Removed `renderMeasuredTemplateConfig` and its handler — `MeasuredTemplate` no longer exists in v14.

**FormApplication → ApplicationV2** — All 13 form classes converted to `HandlebarsApplicationMixin(ApplicationV2)`. Key patterns applied:

- `defaultOptions` → `DEFAULT_OPTIONS`; `getData` → `_prepareContext`; `activateListeners` logic → `_onRender` / `actions`.
- Localized window titles moved out of `DEFAULT_OPTIONS` into a `get title()` getter (static options evaluate at load time, before `game.i18n` is ready).
- Every part template must render a single root element, and must not contain a `<form>` tag — the app root becomes the form via `tag: "form"` in `DEFAULT_OPTIONS`.
- Forms that save need both `tag: "form"` and a `form: { handler }` in `DEFAULT_OPTIONS`.
- Add/delete-row handlers no longer call `this.submit()` (which crashes/closes in v14). Instead they sync current form values into an in-memory settings object, mutate it, and `render()`. Saving to disk happens only in the submit handler.

**jQuery cleanup** — Native DOM throughout. Note `renderTemplate()` returns a string in v14, so palette templates are parsed via `<template>` / `createElement` rather than `$()`. Removed leftover jQuery `[0]` unwraps on functions that now return DOM elements.

**Bug fixes made during migration** — `tokenHUD.js`: fixed a shadowed variable in a `.filter()` that always returned empty; removed a dead `dirFlagImages = ...forEach()` assignment.

**Build config** — `webpack.config.js`: added `output.environment` and Terser `ecma: 2022` to allow modern class syntax without transpiling down.

## Known deviations from idiomatic v14

These work but aren't the "textbook" v14 approach — flagged for reviewers:

- **Tabs in ConfigureSettings** use manual `classList.toggle('active')` in `_onRender` rather than the declarative `static TABS` / `_preparePartContext` system.
- **Form handlers** are public static (`_onSubmitV2`) rather than private (`#onSubmit`).
- **jQuery retained** inside some `_onRender` methods for TVA's own Handlebars templates (safe, since jQuery still ships in v14).

## Testing status

### Verified working (single-user)

- Module loads on v14 with no console errors on startup.
- Token/actor art is found and displayed (search + cache works — confirmed ~5600 images cached).
- Token HUD button opens the palette and successfully changes token art.
- ConfigureSettings form: opens, tab switching works, search paths can be added/deleted, and Save persists.

Everything below this line is converted but not tested — it built green and follows the same patterns as the verified pieces, but has not been exercised in-game.

### Still to do

**Needs verification (likely fine, unconfirmed):**

- The other 12 forms — confirm each opens, renders content, accepts input, and saves: `EffectMappingForm`, `TokenHUDClientSettings`, `CompendiumMapConfig`, `UserList`, `FlagsConfig`, `RandomizerConfig`, `MissingImageConfig`, `ForgeSearchPaths`, `OverlayConfig`, `TokenCustomConfig`, `EditJsonConfig`, `EditScriptConfig`.
- Dynamic-row handlers in other forms — `ConfigureSettings` had a `this.submit()` bug in its add/delete handlers that crashed in v14. Any other form with add/remove-row buttons (`ForgeSearchPaths`, `OverlayConfig`, `RandomizerConfig`, `EffectMappingForm`) likely has the same pattern. Grep for `this.submit()` across all forms and confirm they were given the same fix. **This is the highest-priority unchecked item — it's a known bug shape, not a hypothetical.**
- Right-click "art select" on actor sheets, item sheets, and the various config sheets (token/tile/scene/drawing/note/macro/active-effect) — the button/context-menu insertion was reworked for v14 hooks but only the token path was tested.
- `EffectMappingForm` depth test — group collapse toggles and drag-drop were converted but not exercised.

**Environment coverage not tested:**

- Only tested as a single user / GM. Player-permission paths (limited HUD access, shared variants) untested.
- Only tested on one game system (dnd5e, presumably). Other systems' sheet selectors may differ.

**Known deferred / not idiomatic** — See "Known deviations" above. Functional but candidates for future cleanup if pursuing a polished upstream PR.

