# V14 Migration Notes — Token Variant Art v6.1.4

## Summary

All 13 `FormApplication` subclasses converted to `HandlebarsApplicationMixin(ApplicationV2)` for Foundry VTT v14 compatibility. Minimum Foundry requirement raised to v14.

## Template Rule: `<form>` → single root

**This is the single most impactful rule for FormApplication→AppV2 conversions.**

When converting FormApplication templates to AppV2 parts:

1. Remove the `<form>` wrapper from the template. The application root is the form (set via `tag: "form"` in `DEFAULT_OPTIONS` or `form: {}` in the part config). A nested `<form>` is invalid HTML.
2. **Replace it with exactly one non-form root element** — a `<div>` or `<section>`. Every part template must render a single top-level HTML element. Multiple siblings, leading comments, or conditional blocks that can produce zero elements will throw `"Template part must render a single HTML element"`.

This single rule would have prevented four rounds of fixups during this migration: the initial `<form>` stripping left zero-root templates, then the per-part `{{tab.cssClass}}` wiring failed because the monolithic template approach needed per-tab partials, then the single-root fixes needed auditing across all 13 forms.

## Deliberate deviations from idiomatic AppV2

### 1. Manual tab switching in `ConfigureSettings` instead of `static TABS`

`ConfigureSettings` uses a monolithic template with all 10 tabs, switched manually in `_onRender` via `classList.toggle('active')` on `data-tab`/`data-group` sections. The idiomatic AppV2 approach requires `static TABS` + per-tab partials in `static PARTS` + `_preparePartContext` setting `context.tab` for each part.

**Why the deviation:** Splitting the 880-line `configureSettings.html` into 12 partials (tabs nav + 10 tab bodies + footer) is a high-churn, high-risk change for a form that already works. The manual JS in `_onRender` wires the same `.tab.active` CSS pattern Foundry uses. A reviewer who prefers the idiomatic approach can request splitting in a follow-up PR.

### 2. Public static `_onSubmitV2` instead of private `#onSubmit`

All form handlers use `static async _onSubmitV2(event, form, formData)` rather than `static async #onSubmit(...)`. The `#` syntax is stylistic in Foundry's docs, not required by the `form.handler` API.

**Why the deviation:** Webpack 5's default acorn parser supports private fields natively, but the project's `webpack.config.js` uses no loaders and Terser has known mangling risks with private static methods at lower `ecma` targets. Public static handlers sidestep the Terser risk entirely and are functionally identical. The project already raised Terser's `ecma` to 2022 in `webpack.config.js` as future-proofing, but the handlers remain public for consistency across the codebase.

### 3. jQuery retained inside `_onRender` for TVA's own templates

Several forms (`ArtSelect`, `EffectMappingForm`, `OverlayConfig`) retain jQuery in `_onRender` for event binding and DOM manipulation on their own Handlebars templates. Core hook handlers that receive raw HTMLElements from Foundry V2 hooks (`insertArtSelectButton`, `renderTokenHUD`) were converted to native DOM.

**Why the deviation:** jQuery still ships with Foundry v14 and works. TVA controls these templates end-to-end, so the DOM they receive is never a core V2 element. A full jQuery→native conversion of `_onRender` for these three large forms would be mechanical but high-churn with risk of breaking event delegation (especially the mapping row add/remove buttons and the expression editor in `EffectMappingForm`). This can be revisited in a future deprecation pass when jQuery is removed from Foundry.

## Additional changes

- **`foundry.applications.instances`** replaces `ui.windows` in `ArtSelect` queue logic. `ui.windows` is legacy in v14 and does not contain ApplicationV2 instances.
- **`renderMeasuredTemplateConfig`** hook and `_modTemplateConfig` handler removed — `MeasuredTemplateConfig` / the `MeasuredTemplate` Document no longer exists in v14.
- **`*ConfigV2` hook registrations** removed from `artSelectButtonHooks.js`. Foundry v14 config classes (`TokenConfig`, `TileConfig`, etc.) fire the unsuffixed `renderTokenConfig` hook delivering a raw HTMLElement.
- **Two latent bugs fixed** in `tokenHUD.js`: shadowed variable in `filter((name) => name !== name)` and dead `forEach` assignment.

## Files changed

| File | Change |
|------|--------|
| `module.json` | `minimum: 14`, `verified: 14`, URLs to Ebonhawk3829 fork |
| `scripts/hooks/artSelectButtonHooks.js` | Remove dead `*ConfigV2` hooks, remove `MeasuredTemplateConfig` |
| `applications/artSelect.js` | `FormApplication` → `ApplicationV2`, `ui.windows` → `foundry.applications.instances` |
| `applications/compendiumMap.js` | `FormApplication` → `ApplicationV2` |
| `applications/configJsonEdit.js` | `FormApplication` → `ApplicationV2` |
| `applications/configScriptEdit.js` | `FormApplication` → `ApplicationV2` |
| `applications/configureSettings.js` | `FormApplication` → `ApplicationV2`, manual tab switching |
| `applications/effectMappingForm.js` | `FormApplication` → `ApplicationV2` |
| `applications/flagsConfig.js` | `FormApplication` → `ApplicationV2` |
| `applications/forgeSearchPaths.js` | `FormApplication` → `ApplicationV2` |
| `applications/missingImageConfig.js` | `FormApplication` → `ApplicationV2` |
| `applications/overlayConfig.js` | `FormApplication` → `ApplicationV2` |
| `applications/randomizerConfig.js` | `FormApplication` → `ApplicationV2` |
| `applications/tokenHUDClientSettings.js` | `FormApplication` → `ApplicationV2` |
| `applications/userList.js` | `FormApplication` → `ApplicationV2` |
| `applications/tokenHUD.js` | jQuery→native DOM, two bug fixes |
| `templates/*.html` (13 files) | Removed `<form>` wrapper, wrapped in single root `<div>` |
| `webpack.config.js` | Added `output.environment`, Terser `ecma: 2022`, `keep_classnames: true` |
