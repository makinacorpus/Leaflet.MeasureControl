/*
 * Leaflet.MeasureControl, port to Leaflet v2 (>= 2.0.0-alpha.1)
 * https://github.com/makinacorpus/Leaflet.MeasureControl (1.x: Leaflet 0.7/1.x + Leaflet.Draw)
 *
 * Differences from 1.x:
 *  - No dependency on Leaflet.Draw (which does not support Leaflet v2):
 *    drawing and measuring are implemented here.
 *  - ESM module with native classes, as required by Leaflet v2.
 *  - Pointer events ('pointermove') instead of mouse events.
 *
 * Usage:
 *   import { Map, TileLayer } from 'leaflet';
 *   import { MeasureControl } from './leaflet.measurecontrol.js';
 *
 *   const map = new Map('map', { measureControl: true, center: [...], zoom: ... });
 *   // or:
 *   new MeasureControl().addTo(map);
 */

import {
  Control,
  Evented,
  LayerGroup,
  Polyline,
  CircleMarker,
  Marker,
  DivIcon,
  DomEvent,
  Map as LeafletMap,
} from 'leaflet';

const DEFAULT_HANDLER_OPTIONS = {
  shapeOptions: {
    color: '#3388ff',
    weight: 4,
    opacity: 0.7,
    fill: false,
    interactive: false,
  },
  guideOptions: {
    color: '#3388ff',
    weight: 2,
    opacity: 0.5,
    dashArray: '6 6',
    interactive: false,
  },
  vertexOptions: {
    radius: 4,
    color: '#3388ff',
    weight: 2,
    fillColor: '#ffffff',
    fillOpacity: 1,
    bubblingPointerEvents: false,
  },
  metric: true, // false: feet/miles
  segmentsDistance: false, // true: show the length of each segment
  texts: {
    start: 'Click to start drawing line',
    cont: 'Click to continue drawing line',
    end: 'Click last point to finish line',
  },
};

/**
 * Measuring handler, replaces L.Polyline.Measure (which extended L.Draw.Polyline).
 * Extends Evented to keep the 1.x events ('enabled'/'disabled')
 * and adds 'measurefinish' with { latlngs, distance } when a measure ends.
 */
class MeasureHandler extends Evented {
  constructor(map, options = {}) {
    super();
    this._map = map;
    this.options = {
      ...DEFAULT_HANDLER_OPTIONS,
      ...options,
      shapeOptions: { ...DEFAULT_HANDLER_OPTIONS.shapeOptions, ...(options.shapeOptions || {}) },
      guideOptions: { ...DEFAULT_HANDLER_OPTIONS.guideOptions, ...(options.guideOptions || {}) },
      vertexOptions: { ...DEFAULT_HANDLER_OPTIONS.vertexOptions, ...(options.vertexOptions || {}) },
      texts: { ...DEFAULT_HANDLER_OPTIONS.texts, ...(options.texts || {}) },
    };
    this._enabled = false;
    this._drawing = false;
  }

  enabled() {
    return this._enabled;
  }

  enable() {
    if (this._enabled) return this;
    this._enabled = true;
    this.addHooks();
    this.fire('enabled');
    return this;
  }

  disable() {
    if (!this._enabled) return this;
    this._enabled = false;
    this.removeHooks();
    this.fire('disabled');
    return this;
  }

  toggle() {
    return this._enabled ? this.disable() : this.enable();
  }

  addHooks() {
    const map = this._map;
    this._layerGroup = new LayerGroup().addTo(map);

    // Double click ends the measure, so double click zoom is suspended.
    this._restoreDoubleClickZoom = !!(map.doubleClickZoom && map.doubleClickZoom.enabled());
    if (this._restoreDoubleClickZoom) map.doubleClickZoom.disable();

    map.on('click', this._onMapClick, this);
    map.on('pointermove', this._onPointerMove, this);
    map.on('dblclick', this._onDblClick, this);

    this._onKeyDown = (ev) => {
      if (ev.key === 'Escape') this.disable();
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._createTooltip();
    this._startShape();
  }

  removeHooks() {
    const map = this._map;
    map.off('click', this._onMapClick, this);
    map.off('pointermove', this._onPointerMove, this);
    map.off('dblclick', this._onDblClick, this);
    document.removeEventListener('keydown', this._onKeyDown);

    if (this._layerGroup) {
      map.removeLayer(this._layerGroup);
      this._layerGroup = null;
    }
    this._poly = null;
    this._guide = null;
    this._markers = [];
    this._latlngs = [];
    this._drawing = false;

    this._removeTooltip();
    map.getContainer().style.cursor = '';

    if (this._restoreDoubleClickZoom && map.doubleClickZoom) {
      map.doubleClickZoom.enable();
    }
  }

  _startShape() {
    this._drawing = true;
    this._latlngs = [];
    this._markers = [];
    this._poly = new Polyline([], this.options.shapeOptions).addTo(this._layerGroup);
    this._guide = new Polyline([], this.options.guideOptions).addTo(this._layerGroup);
    this._map.getContainer().style.cursor = 'crosshair';
    this._setTooltip(this.options.texts.start);
  }

  _clearShape() {
    if (this._layerGroup) this._layerGroup.clearLayers();
    this._poly = null;
    this._guide = null;
    this._markers = [];
    this._latlngs = [];
  }

  _finishShape() {
    if (!this._drawing) return;
    this._drawing = false;

    if (this._guide) {
      this._layerGroup.removeLayer(this._guide);
      this._guide = null;
    }
    this._map.getContainer().style.cursor = '';
    this._setTooltip(''); // as in 1.x: empty tooltip once the measure ends

    this.fire('measurefinish', {
      latlngs: this._latlngs.slice(),
      distance: this._measure(this._latlngs),
    });
  }

  _onMapClick(e) {
    if (!this._enabled) return;

    // Once a measure ends, a new click clears it and starts a new one (as in 1.x).
    if (!this._drawing) {
      this._clearShape();
      this._startShape();
    }

    const latlng = e.latlng;
    const last = this._latlngs[this._latlngs.length - 1];
    if (last && last.equals(latlng)) return;

    this._latlngs.push(latlng);
    this._poly.addLatLng(latlng);
    if (this.options.segmentsDistance && last) {
      this._addSegmentLabel(last, latlng);
    }

    const marker = new CircleMarker(latlng, this.options.vertexOptions).addTo(this._layerGroup);
    // A click on the last vertex ends the line (bubblingPointerEvents: false
    // keeps the same click from reaching the map as a new point).
    marker.on('click', () => {
      const isLast = this._markers[this._markers.length - 1] === marker;
      if (this._drawing && isLast && this._latlngs.length > 1) {
        this._finishShape();
      }
    });
    this._markers.push(marker);

    this._setTooltip(
      this._latlngs.length > 1 ? this.options.texts.end : this.options.texts.cont,
      this._readableDistance(this._measure(this._latlngs))
    );
  }

  _onDblClick() {
    if (this._drawing && this._latlngs.length > 1) this._finishShape();
  }

  _onPointerMove(e) {
    this._moveTooltip(e.containerPoint);
    if (!this._drawing || !this._latlngs.length) return;

    const last = this._latlngs[this._latlngs.length - 1];
    this._guide.setLatLngs([last, e.latlng]);

    const total = this._measure(this._latlngs) + this._map.distance(last, e.latlng);
    this._setTooltip(
      this._latlngs.length > 1 ? this.options.texts.end : this.options.texts.cont,
      this._readableDistance(total)
    );
  }

  _addSegmentLabel(from, to) {
    // Middle of the segment as drawn on the map (projected coordinates)
    const zoom = this._map.getZoom();
    const middle = this._map.unproject(
      this._map.project(from, zoom).add(this._map.project(to, zoom)).divideBy(2),
      zoom
    );
    const text = document.createElement('span');
    text.textContent = this._readableDistance(this._map.distance(from, to));
    const icon = new DivIcon({
      className: 'leaflet-measure-segment-distance',
      html: text,
      iconSize: null,
    });
    new Marker(middle, { icon, interactive: false, keyboard: false }).addTo(this._layerGroup);
  }

  _measure(latlngs) {
    let d = 0;
    for (let i = 1; i < latlngs.length; i++) {
      d += this._map.distance(latlngs[i - 1], latlngs[i]);
    }
    return d;
  }

  _readableDistance(meters) {
    if (this.options.metric) {
      return meters > 1000
        ? `${(meters / 1000).toFixed(2)} km`
        : `${Math.round(meters)} m`;
    }
    const feet = meters * 3.28084;
    return feet > 5280
      ? `${(feet / 5280).toFixed(2)} mi`
      : `${Math.round(feet)} ft`;
  }

  // --- Tooltip following the cursor (replaces L.Draw.Tooltip) ---

  _createTooltip() {
    this._tooltip = document.createElement('div');
    this._tooltip.className = 'leaflet-measure-tooltip';
    this._tooltip.style.display = 'none';
    this._map.getContainer().appendChild(this._tooltip);
  }

  _removeTooltip() {
    if (this._tooltip) {
      this._tooltip.remove();
      this._tooltip = null;
    }
  }

  _setTooltip(label, distance) {
    if (!this._tooltip) return;
    if (!label && !distance) {
      this._tooltip.style.display = 'none';
      return;
    }
    this._tooltip.style.display = '';
    const labelNode = document.createElement('span');
    labelNode.className = 'leaflet-measure-tooltip-label';
    labelNode.textContent = label;
    this._tooltip.replaceChildren(labelNode);
    if (distance) {
      const distanceNode = document.createElement('span');
      distanceNode.className = 'leaflet-measure-tooltip-distance';
      distanceNode.textContent = distance;
      this._tooltip.append(distanceNode);
    }
  }

  _moveTooltip(containerPoint) {
    if (!this._tooltip) return;
    this._tooltip.style.transform =
      `translate(${Math.round(containerPoint.x) + 12}px, ${Math.round(containerPoint.y) - 12}px)`;
  }
}

class MeasureControl extends Control {
  static {
    this.setDefaultOptions({
      position: 'topleft',
      handler: {},
    });
  }

  static TITLE = 'Measure distances';

  toggle() {
    this.handler.toggle();
  }

  onAdd(map) {
    this._container = document.createElement('div');
    this._container.className = 'leaflet-control-draw leaflet-bar';

    this.handler = new MeasureHandler(map, this.options.handler);
    this.handler.on('enabled', () => this._container.classList.add('enabled'));
    this.handler.on('disabled', () => this._container.classList.remove('enabled'));

    const link = document.createElement('a');
    link.className = 'leaflet-control-draw-measure';
    link.href = '#';
    link.title = MeasureControl.TITLE;
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', MeasureControl.TITLE);
    this._container.appendChild(link);

    DomEvent.disableClickPropagation(this._container);
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.toggle();
    });

    return this._container;
  }

  onRemove() {
    if (this.handler) this.handler.disable();
  }
}

// Same map option as 1.x: new Map('map', { measureControl: true })
LeafletMap.mergeOptions({ measureControl: false });
LeafletMap.addInitHook(function () {
  if (this.options.measureControl) {
    this.measureControl = new MeasureControl().addTo(this);
  }
});

export { MeasureControl, MeasureHandler };
export default MeasureControl;
