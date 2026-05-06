/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

/**
 * Color picker control. Renders an HSV color picker with a hue slider.
 *
 * @class ibis.ui.ColorPicker
 * @extends ibis.ui.Control
 */

(function (ibis) {
  var DOM = ibis.DOM;

  ibis.create('ibis.ui.ColorPicker:ibis.ui.Control', {

    ColorPicker: function (id, s, ed) {
      this._super(id, s, ed);
      this.type = 'colorpicker';
      this.classPrefix = 'mceColorPicker';
    },

    color: function () {
      if (!this._color) {
        this._color = new ibis.util.Color();
      }
      return this._color;
    },

    value: function (value) {
      var self = this;

      if (arguments.length) {
        self.color().parse(value);
        if (self._rendered) {
          self._repaint();
        }
      } else {
        return self.color().toHex();
      }
    },

    rgb: function () {
      return this.color().toRgb();
    },

    renderHTML: function () {
      var id = this.id, prefix = this.classPrefix;
      var stops = '#ff0000,#ff0080,#ff00ff,#8000ff,#0000ff,#0080ff,#00ffff,#00ff80,#00ff00,#80ff00,#ffff00,#ff8000,#ff0000';
      var gradientStyle = 'background:linear-gradient(to bottom,' + stops + ');';

      return (
        '<div id="' + id + '" class="' + prefix + '">' +
          '<div id="' + id + '-sv" class="' + prefix + '-sv">' +
            '<div class="' + prefix + '-overlay1">' +
              '<div class="' + prefix + '-overlay2">' +
                '<div id="' + id + '-svp" class="' + prefix + '-selector1">' +
                  '<div class="' + prefix + '-selector2"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="' + id + '-h" class="' + prefix + '-h" style="' + gradientStyle + '">' +
            '<div id="' + id + '-hp" class="' + prefix + '-h-marker"></div>' +
          '</div>' +
        '</div>'
      );
    },

    postRender: function () {
      var self = this, id = self.id, color = self.color(), hsv;
      var hueRootElm = DOM.get(id + '-h');
      var huePointElm = DOM.get(id + '-hp');
      var svRootElm = DOM.get(id + '-sv');
      var svPointElm = DOM.get(id + '-svp');

      function getPos(elm, e) {
        var pos = DOM.getPos(elm), x, y;

        x = e.pageX - pos.x;
        y = e.pageY - pos.y;
        x = Math.max(0, Math.min(x / elm.clientWidth, 1));
        y = Math.max(0, Math.min(y / elm.clientHeight, 1));

        return { x: x, y: y };
      }

      function updateColor(hsv, hueOnly) {
        var hue = (360 - hsv.h) / 360;

        DOM.setStyle(huePointElm, 'top', (hue * 100) + '%');

        if (!hueOnly) {
          DOM.setStyles(svPointElm, {
            left: hsv.s + '%',
            top:  (100 - hsv.v) + '%'
          });
        }

        svRootElm.style.background = new ibis.util.Color({ s: 100, v: 100, h: hsv.h }).toHex();
        color.parse({ h: hsv.h, s: hsv.s, v: hsv.v });
      }

      function updateSaturationAndValue(e) {
        var pos = getPos(svRootElm, e);
        hsv.s = pos.x * 100;
        hsv.v = (1 - pos.y) * 100;
        updateColor(hsv);
        self.onChange.dispatch(self);
      }

      function updateHue(e) {
        var pos = getPos(hueRootElm, e);
        hsv = color.toHsv();
        hsv.h = (1 - pos.y) * 360;
        updateColor(hsv, true);
        self.onChange.dispatch(self);
      }

      self._repaint = function () {
        hsv = color.toHsv();
        updateColor(hsv);
      };

      self._svDragHelper = new ibis.ui.DragHelper(id + '-sv', {
        start: updateSaturationAndValue,
        drag:  updateSaturationAndValue
      });

      self._hDragHelper = new ibis.ui.DragHelper(id + '-h', {
        start: updateHue,
        drag:  updateHue
      });

      self._repaint();
      self._rendered = true;
    },

    destroy: function () {
      if (this._svDragHelper) {
        this._svDragHelper.destroy();
      }
      if (this._hDragHelper) {
        this._hDragHelper.destroy();
      }
      this._super();
    }
  });
})(ibis);
