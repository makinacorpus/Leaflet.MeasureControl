Leaflet.MeasureControl
======================

Leaflet control to mesure distances on the map.

Requires [Leaflet.Draw](https://github.com/leaflet/Leaflet.Draw#readme)

Check out the [demo](http://makinacorpus.github.io/Leaflet.MeasureControl/)

Install
-----

```
npm install leaflet.measurecontrol
```


Usage
-----

As map option :

```

var map = L.map('map', {measureControl:true});

```

Or like any control :


```

L.Control.measureControl().addTo(map);

```

Multiple Distance Strings
-----

If you would like multiple distance strings to appear in the tooltip, set `multiDistance` in the `handler` options to true. In addition, set the distance measurement systems that you would like to appear to true:

```

L.Control.measureControl({
  handler: {
    multiDistance: true,
    metric: true,
    imperial: true,
    nauticalMiles: true
  }
}).addTo(map);

```

Développement
-----

```
npm install      # install dependancies
npm run release  # minify js and copy sources in docs (example)
```


Changelog
-------

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
