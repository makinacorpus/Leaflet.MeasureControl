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

Development
-----------

```shell
npm install      # install dependencies
npm run release  # minify js and copy sources in docs (example)
```

Changelog
---------

### 1.1.0
* Add npm support
* Add support for AMD and CommonJS loading
* Set example in docs folder

### 1.0.0
* Initial version

Authors
-------

* Gilles Bassière
* Alexandra Janin

[![Makina Corpus](http://depot.makina-corpus.org/public/logo.gif)](http://makinacorpus.com)
