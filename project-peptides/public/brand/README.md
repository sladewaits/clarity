# Brand assets — Project Peptides

## ⚠️ Outstanding asset dependency: the approved interlocking-PP monogram

The approved **interlocking double-P** symbol artwork was not provided and does
not exist in this repository, so it could not be traced or embedded. Everything
else in the brand identity (colors, typography, component styling, wordmark
treatment, messaging) is implemented.

The logo currently renders an **interim placeholder** symbol (a Deep Petrol
tile with an abstract mark). It is deliberately **not** a claim to match the
approved monogram. The files here (`favicon.svg`, `app-icon.svg`) use that same
interim mark.

### To drop in the approved symbol (single change)

1. Export the approved monogram as transparent-background SVGs and place here:
   - `pp-symbol.svg` — dark-on-light (petrol/teal), for light surfaces
   - `pp-symbol-white.svg` — white-on-petrol, for the Deep Petrol sidebar / panels
2. In `src/components/brand/brand-logo.tsx`, set:
   ```ts
   export const APPROVED_SYMBOL_AVAILABLE = true;
   ```
3. Replace `favicon.svg` and `app-icon.svg` with exports of the approved mark.

`BrandLogo` / `BrandSymbol` then use the approved artwork everywhere the logo
appears (sidebar, mobile nav, login, admin header, favicon). No other code
changes are required.

## Color source of truth

| Token | Hex |
| --- | --- |
| Deep Petrol | `#0F3B52` |
| Clinical Teal | `#00C2B3` |
| Pale Aqua | `#E6F7F5` |
| Mineral White | `#FBF6F2` |
| Graphite | `#1F2A2E` |
| Surface White | `#FFFFFF` |

These are defined as semantic tokens in `src/app/globals.css`.
