Leaflet.MeasureControl (Leaflet v2 port)
========================================

Leaflet control to measure distances on the map.

**This branch is a port for [Leaflet v2](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html) (>= 2.0.0-alpha.1).**
Unlike the original plugin, it no longer depends on [Leaflet.Draw](https://github.com/leaflet/Leaflet.Draw)
(which does not support Leaflet v2): the measuring logic is now self-contained.

For Leaflet 0.7.x / 1.x, use the original plugin on the
[`master` branch of makinacorpus/Leaflet.MeasureControl](https://github.com/makinacorpus/Leaflet.MeasureControl).

Features
--------

* Click on the map to add measurement points; a tooltip follows the cursor showing the running distance (m/km, or ft/mi with `metric: false`).
* Finish the line with a double click or by clicking the last point.
* Click again to clear and start a new measurement; press <kbd>Escape</kbd> to deactivate.
* Fires a `measurefinish` event with `{ latlngs, distance }` (distance in meters).

Usage
-----

Leaflet v2 is ESM-only, so import the plugin as a module:

```js
import { Map, TileLayer } from 'leaflet';
import { MeasureControl } from 'leaflet.measurecontrol';
import 'leaflet.measurecontrol/leaflet.measurecontrol.css';
```

As map option:

```js
const map = new Map('map', { measureControl: true });
```

Or like any control:

```js
const measureControl = new MeasureControl().addTo(map);

measureControl.handler.on('measurefinish', (e) => {
  console.log(e.distance, e.latlngs);
});
```

Options
-------

```js
new MeasureControl({
  position: 'topleft',
  handler: {
    metric: true,                        // false: feet/miles
    shapeOptions: { color: '#3388ff' },  // measured polyline style
    guideOptions: { /* ... */ },         // dashed guide line style
    vertexOptions: { /* ... */ },        // vertex CircleMarker style
    texts: {                             // i18n
      start: 'Click to start drawing line',
      cont: 'Click to continue drawing line',
      end: 'Click last point to finish line'
    }
  }
});
```

Changelog
---------

See [CHANGELOG.md](./CHANGELOG.md).

Authors
-------

* Gilles Bassière
* Alexandra Janin

[![Makina Corpus](http://depot.makina-corpus.org/public/logo.gif)](http://makinacorpus.com)
