# SMTinel Bonepile Visual Tracker

External, dependency-free module for visual bonepile/WIP follow-up. It reads existing SMTinel Yield Flow globals and never rewrites the source data.

## What it does

- Resolves the current logical location as `Line|CurrentStation`.
- Shows SMT lines 12–18 with AOI2/AOI4 separation.
- Separates Fresh input, Bonepile, Old 91D+, Repair and Unknown location.
- Filters by line, station, aging, repair status, SN, WO and SKU.
- Opens serial-level drill-down and exports the filtered scope as TSV.
- Exposes an API for future connection to the immersive plant layout.

## Data sources

The module automatically reads:

- `TRACEOPS_YIELD_SN_TO_SFC`
- `TRACEOPS_YIELD_LINE_BY_SN`
- `TRACEOPS_YIELD_REPAIRS_BY_SN`
- `TRACEOPS_YIELD_FT_ROWS`
- `traceOpsRecoveryDaysFromBuild()` when available

The primary key is the serial number. The physical/logical key is:

```text
LocationKey = Line + "|" + CurrentStation
```

## Integration

Load one external script after SMTinel's main application:

```html
<script src="modules/bonepile/bonepile-loader.js?v=0.1.0"></script>
```

The loader injects the CSS and main module. It also installs a `Bonepile Map` launcher.

## API

```js
SMTinelBonepile.open();
SMTinelBonepile.close();
SMTinelBonepile.refresh();
SMTinelBonepile.selectLocation('L13|AOI2');
SMTinelBonepile.getState();
SMTinelBonepile.setData(rows); // optional standalone dataset
```

Events:

```text
smtinel:bonepile:ready
smtinel:bonepile:updated
smtinel:serial:open
```

## Classification defaults

- Fresh: 0–30 days
- Bonepile: 31–90 days
- Old: 91 days or more
- Repair: serial with linked Repair Record evidence
- Unknown: line or current station not resolved

Override before loading:

```html
<script>
window.SMTINEL_BONEPILE_CONFIG = {
  freshMaxDays: 30,
  oldMinDays: 91,
  autoLauncher: true,
  maxTableRows: 1000
};
</script>
```

## Current scope

This first iteration provides the operational module and logical plant map. A later iteration can replace the CSS line cards with the exact immersive layout image/SVG while keeping the same `LocationKey` and filters.
