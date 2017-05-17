(function(factory, window) {
    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], function(L) {
            factory(L, window.toGeoJSON);
        });

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = function(L) {
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
}(function(L) {
    L.Polyline.Measure = L.Draw.Polyline.extend({
        addHooks: function() {
            L.Draw.Polyline.prototype.addHooks.call(this);
            if (this._map) {
                this._markerGroup = new L.LayerGroup();
                this._map.addLayer(this._markerGroup);

                this._markers = [];
                this._map.on('click', this._onClick, this);
                this._startShape();
            }
        },

        addVertex: function(latlng) {
            L.Draw.Polyline.prototype.addVertex.call(this, latlng);

            if (this.options.segmentsDistance) {

                if (this._prevLatLng) var distance = L.latLng(this._prevLatLng).distanceTo(this._currentLatLng);

                if (this._poly.getLatLngs().length > 1) {
                    var middleCoords = this._getMiddleCoords(this._prevLatLng, this._currentLatLng, distance / 2);
                    const iconString = L.GeometryUtil.readableDistance(distance, this.options.metric, this.options.feet),
                        icon = L.divIcon({ className: 'leaflet-draw-measure-segment-distance', html: iconString });
                    L.marker(middleCoords, { icon: icon }).addTo(this._markerGroup);
                }

                this._prevLatLng = this._currentLatLng;
            }
        },

        removeHooks: function() {
            L.Draw.Polyline.prototype.removeHooks.call(this);

            this._clearHideErrorTimeout();

            // !\ Still useful when control is disabled before any drawing (refactor needed?)
            this._map
                .off('pointermove', this._onMouseMove, this)
                .off('mousemove', this._onMouseMove, this)
                .off('click', this._onClick, this);

            this._clearGuides();
            this._container.style.cursor = '';

            this._removeShape();
        },

        _startShape: function() {
            this._drawing = true;
            this._poly = new L.Polyline([], this.options.shapeOptions);
            this._tooltip._container.classList.add("measure-class");
            this.originalToolTipStyle = Object.assign({},(this._tooltip._container.currentStyle || window.getComputedStyle(this._tooltip._container)));
            // this is added as a placeholder, if leaflet doesn't recieve
            // this when the tool is turned off all onclick events are removed
            this._poly._onClick = function() {};

            this._container.style.cursor = 'crosshair';

            this._updateTooltip();
            this._map
                .on('pointermove', this._onMouseMove, this)
                .on('mousemove', this._onMouseMove, this);
        },

        _finishShape: function() {
            this._drawing = false;

            this._cleanUpShape();
            this._clearGuides();

            this._updateTooltip();

            this._map
                .off('pointermove', this._onMouseMove, this)
                .off('mousemove', this._onMouseMove, this);

            this._container.style.cursor = '';
        },

        _removeShape: function() {
            if (!this._poly) return;
            this._map.removeLayer(this._poly);
            delete this._poly;
            this._markers.splice(0);
            this._markerGroup.clearLayers();
        },

        _onClick: function() {
            if (!this._drawing) {
                this._removeShape();
                this._startShape();
                return;
            }
        },

        _getTooltipText: function() {
            var labelText = L.Draw.Polyline.prototype._getTooltipText.call(this);
            if (!this._drawing) {
                labelText.text = '';
            }
            return labelText;
        },

        _getMiddleCoords: function(prevLatlng, nextLatlng, distance) {
            const originHyp = L.latLng(prevLatlng).distanceTo(nextLatlng),
                O = [nextLatlng.lat, prevLatlng.lng],
                originCathA = L.latLng(prevLatlng).distanceTo(O),
                originCathB = Math.sqrt(Math.pow(originHyp, 2) - Math.pow(originCathA, 2)),
                sin = originCathA / originHyp,
                newCathA = distance * sin,
                newCathB = Math.sqrt(Math.pow(distance, 2) - Math.pow(newCathA, 2)),
                newX = newCathA / (originCathA / (nextLatlng.lat - prevLatlng.lat)) + prevLatlng.lat,
                newY = newCathB / (originCathB / (nextLatlng.lng - prevLatlng.lng)) + prevLatlng.lng;
            return { lat: newX, lng: newY };
        },

        _onMouseMove: function (event) {
            L.Draw.Polyline.prototype._onMouseMove.call(this,event);
            const $toolTip = document.querySelector('.measure-class'),
                  measureRect = $toolTip.getBoundingClientRect(),
                  containerRect = document.querySelector('.leaflet-container').getBoundingClientRect(),
                  leftCrossing = containerRect.width+containerRect.left - event.originalEvent.x - measureRect.width,
                  originalTop = Number(this.originalToolTipStyle.marginTop.split('px')[0]),
                  topCrossing = event.originalEvent.y-measureRect.height-containerRect.top+originalTop,
                  bottomCrossing = containerRect.height+containerRect.top - event.originalEvent.y - measureRect.height,
                  direction = topCrossing < containerRect.height/2 ? 'top' : 'bottom';
            $toolTip.style.marginLeft = leftCrossing < 0 ? leftCrossing+'px' : this.originalToolTipStyle.marginLeft;
            if (direction == 'top') $toolTip.style.marginTop = topCrossing < 0 ? Math.abs(topCrossing)-measureRect.height+originalTop+'px' : this.originalToolTipStyle.marginTop;
            if (direction == 'bottom') $toolTip.style.marginTop = bottomCrossing < 0 ? bottomCrossing+'px' : this.originalToolTipStyle.marginTop;
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

        toggle: function() {
            if (this.handler.enabled()) {
                this.handler.disable.call(this.handler);
            } else {
                this.handler.enable.call(this.handler);
            }
        },

        onAdd: function(map) {
            var link = null;
            var className = 'leaflet-control-draw';

            this._container = L.DomUtil.create('div', 'leaflet-bar');

            this.handler = new L.Polyline.Measure(map, this.options);

            this.handler.on('enabled', function() {
                this.enabled = true;
                L.DomUtil.addClass(this._container, 'enabled');
            }, this);

            this.handler.on('disabled', function() {
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


    L.Map.addInitHook(function() {
        if (this.options.measureControl) {
            this.measureControl = L.Control.measureControl().addTo(this);
        }
    });


    L.Control.measureControl = function(options) {
        return new L.Control.MeasureControl(options);
    };
}, window));
