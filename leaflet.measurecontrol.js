(function (factory, window) {
  // define an AMD module that relies on 'leaflet'
  if (typeof define === 'function' && define.amd) {
    define(['leaflet'], function (L) {
        factory(L, window.toGeoJSON);
    });

    // define a Common JS module that relies on 'leaflet'
  } else if (typeof exports === 'object') {
    module.exports = function (L) {
      if (L === undefined) {
        if (typeof window !== 'undefined') {
          L = require('leaflet');
        }
      }
      factory(L);
      return L;
    };
  } else if (typeof window !== 'undefined' && window.L) {
    factory(window.L);
  }
}(function (L) {
  L.Polyline.Measure = L.Draw.Polyline.extend({
    addHooks: function () {
      L.Draw.Polyline.prototype.addHooks.call(this);
      if (this._map) {
        this._map.on('contextmenu', this._onCancel, this);
        this._map.doubleClickZoom.disable();

        this._startShape();

        this._tooltip._container.addEventListener('mouseover', function () {
            map.dragging.disable();
        });

        this._tooltip._container.addEventListener('mouseout', function () {
            map.dragging.enable();
        });
      }
    },

    removeHooks: function () {
      L.Draw.Polyline.prototype.removeHooks.call(this);

      if (this._map) {
        this._map.off('contextmenu', this._onCancel, this);
        this._map.doubleClickZoom.enable();        
      }

      this._container.style.cursor = '';
    },

    _startShape: function () {
      this._drawing = true;
      this._poly = new L.Polyline([], this.options.shapeOptions);
      // this is added as a placeholder, if leaflet doesn't recieve
      // this when the tool is turned off all onclick events are removed
      this._poly._onClick = function () {};

      this._markerGroup.clearLayers();
      this._markers = [];

      this._container.style.cursor = 'crosshair';

      if (!L.Browser.touch) {
        this._map.on('mouseup', this._onMouseUp, this); // Necessary for 0.7 compatibility
      }

      this._mouseMarker
        .on('mouseout', this._onMouseOut, this)
        .on('mousemove', this._onMouseMove, this) // Necessary to prevent 0.8 stutter
        .on('mousedown', this._onMouseDown, this)
        .on('mouseup', this._onMouseUp, this) // Necessary for 0.8 compatibility
        .addTo(this._map);

      this._map
        .on('mouseup', this._onMouseUp, this) // Necessary for 0.7 compatibility
        .on('mousemove', this._onMouseMove, this)
        .on('zoomlevelschange', this._onZoomEnd, this)
        .on('touchstart', this._onTouch, this);

      this._updateTooltip();
    },

    _finishShape: function () {
      this._drawing = false;

      this._mouseMarker
        .off('mousedown', this._onMouseDown, this)
        .off('mouseout', this._onMouseOut, this)
        .off('mouseup', this._onMouseUp, this)
        .off('mousemove', this._onMouseMove, this);

      this._map
      .off('mouseup', this._onMouseUp, this)
      .off('mousemove', this._onMouseMove, this)
      .off('touchstart', this._onTouch, this)
      .off('click', this._onTouch, this);

      this._updateTooltip(this._markers[this._markers.length-1].getLatLng());
      this._container.style.cursor = '';

    },    

    _removeShape: function () {
      if (!this._poly) return;
      this._map.removeLayer(this._poly);
      delete this._poly;
      this._markers.splice(0);
      this._markerGroup.clearLayers();
    },

    _onCancel: function () {
      if (!this._drawing) {
        this._removeShape();
        this._startShape();
        return;
      }
    },

    _getTooltipText: function () {
      var showLength = this.options.showLength,
        labelText, distanceStr;

      if (this._markers.length === 0) {
        labelText = {
          text: L.drawLocal.draw.handlers.polyline.tooltip.start
        };
      } else {
        distanceStr = showLength ? this._getMeasurementString() : '';

        if (this._markers.length === 1) {
          labelText = {
            text: L.drawLocal.draw.handlers.polyline.tooltip.cont,
            subtext: distanceStr
          };
        } else {
          labelText = {
            text: L.drawLocal.draw.handlers.polyline.tooltip.end,
            subtext: distanceStr
          };
        }
      }

      if (!this._drawing) {
        labelText.text = '';
      }
      return labelText;
    },

    _onZoomEnd: function () {
      L.Draw.Polyline.prototype._onZoomEnd.call(this);

      if (this._markers[this._markers.length-1])
        this._updateTooltip(this._markers[this._markers.length-1].getLatLng());
    }  
  });

  L.Control.MeasureControl = L.Control.extend({

    statics: {
      TITLE: 'Measure distances'
    },
    options: {
      position: 'topleft',
      handler: {}
    },

    toggle: function () {
      if (this.handler.enabled()) {
        this.handler.disable.call(this.handler);
      } else {
        this.handler.enable.call(this.handler);
      }
    },

    onAdd: function (map) {
      var link = null;
      var className = 'leaflet-control-draw';

      this._container = L.DomUtil.create('div', 'leaflet-bar');

      this.handler = new L.Polyline.Measure(map, this.options.handler);

      this.handler.on('enabled', function () {
        this.enabled = true;
        L.DomUtil.addClass(this._container, 'enabled');
      }, this);

      this.handler.on('disabled', function () {
        delete this.enabled;
        L.DomUtil.removeClass(this._container, 'enabled');
      }, this);

      link = L.DomUtil.create('a', className + '-measure', this._container);
      link.href = '#';
      link.title = L.Control.MeasureControl.TITLE;

      L.DomEvent
      .addListener(link, 'click', L.DomEvent.stopPropagation)
      .addListener(link, 'click', L.DomEvent.preventDefault)
      .addListener(link, 'click', this.toggle, this);

      return this._container;
    }
  });


  L.Map.mergeOptions({
    measureControl: false
  });


  L.Map.addInitHook(function () {
    if (this.options.measureControl) {
      this.measureControl = L.Control.measureControl().addTo(this);
    }
  });


  L.Control.measureControl = function (options) {
    return new L.Control.MeasureControl(options);
  };
}, window));
