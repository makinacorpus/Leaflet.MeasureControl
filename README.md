<a href="https://www.npmjs.com/package/leaflet.measurecontrol"><img alt="npm" src="https://img.shields.io/npm/dt/leaflet.measurecontrol"></a>
<a href="https://www.npmjs.com/package/leaflet.measurecontrol"><img alt="npm" src= "https://img.shields.io/npm/v/leaflet.measurecontrol?color=red"></a>

Leaflet.MeasureControl
======================

Leaflet control to mesure distances on the map.

Requires [Leaflet.Draw](https://github.com/leaflet/Leaflet.Draw#readme)

Check out the [demo](http://makinacorpus.github.io/Leaflet.MeasureControl/)

Install
-------

```shell
npm install leaflet.measurecontrol
```

Usage
-----

As map option:

```js
var map = L.map('map', { measureControl:true });
```

Or like any control:

```js
L.Control.measureControl().addTo(map);
```

Multiple distance strings
-------------------------

To show the distance in several measurement systems in the tooltip, set
`multiDistance` to true in the `handler` options, and enable the systems to show:

```js
L.Control.measureControl({
  handler: {
    multiDistance: true,
    metric: true,
    imperial: true,
    nauticalMiles: true
  }
}).addTo(map);
```

Development
-----------

```shell
npm install      # install dependencies
npm run release  # minify js and copy sources in docs (example)
```

Changelog
---------

See [CHANGELOG.md](./CHANGELOG.md).

Authors
-------

* Gilles Bassière
* Alexandra Janin

[![Makina Corpus](http://depot.makina-corpus.org/public/logo.gif)](http://makinacorpus.com)
