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
 * Color utility class. Parses and converts between hex, rgb, and hsv.
 *
 * @class ibis.util.Color
 * @example
 * var white = new ibis.util.Color({r: 255, g: 255, b: 255});
 * var red = new ibis.util.Color('#FF0000');
 * console.log(white.toHex(), red.toHsv());
 */

(function (ibis) {
  var min = Math.min, max = Math.max, round = Math.round;

  function Color(value) {
    var self = this, r = 0, g = 0, b = 0;

    function rgb2hsv(r, g, b) {
      var h, s, v, d, minRGB, maxRGB;

      h = 0; s = 0; v = 0;
      r = r / 255; g = g / 255; b = b / 255;

      minRGB = min(r, min(g, b));
      maxRGB = max(r, max(g, b));

      if (minRGB == maxRGB) {
        return { h: 0, s: 0, v: minRGB * 100 };
      }

      d = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r);
      h = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);
      h = 60 * (h - d / (maxRGB - minRGB));
      s = (maxRGB - minRGB) / maxRGB;
      v = maxRGB;

      return { h: round(h), s: round(s * 100), v: round(v * 100) };
    }

    function hsvToRgb(hue, saturation, brightness) {
      var side, chroma, x, match;

      hue = (parseInt(hue, 10) || 0) % 360;
      saturation = parseInt(saturation, 10) / 100;
      brightness = parseInt(brightness, 10) / 100;
      saturation = max(0, min(saturation, 1));
      brightness = max(0, min(brightness, 1));

      if (saturation === 0) {
        r = g = b = round(255 * brightness);
        return;
      }

      side = hue / 60;
      chroma = brightness * saturation;
      x = chroma * (1 - Math.abs(side % 2 - 1));
      match = brightness - chroma;

      switch (Math.floor(side)) {
        case 0: r = chroma; g = x;      b = 0;      break;
        case 1: r = x;      g = chroma; b = 0;      break;
        case 2: r = 0;      g = chroma; b = x;      break;
        case 3: r = 0;      g = x;      b = chroma; break;
        case 4: r = x;      g = 0;      b = chroma; break;
        case 5: r = chroma; g = 0;      b = x;      break;
        default: r = g = b = 0;
      }

      r = round(255 * (r + match));
      g = round(255 * (g + match));
      b = round(255 * (b + match));
    }

    function toHex() {
      function hex(val) {
        val = parseInt(val, 10).toString(16);
        return val.length > 1 ? val : '0' + val;
      }
      return '#' + hex(r) + hex(g) + hex(b);
    }

    function toRgb() {
      return { r: r, g: g, b: b };
    }

    function toHsv() {
      return rgb2hsv(r, g, b);
    }

    function parse(value) {
      var matches;

      if (typeof value == 'object') {
        if ('r' in value) {
          r = value.r; g = value.g; b = value.b;
        } else if ('v' in value) {
          hsvToRgb(value.h, value.s, value.v);
        }
      } else {
        if ((matches = /rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)[^\)]*\)/gi.exec(value))) {
          r = parseInt(matches[1], 10);
          g = parseInt(matches[2], 10);
          b = parseInt(matches[3], 10);
        } else if ((matches = /#([0-F]{2})([0-F]{2})([0-F]{2})/gi.exec(value))) {
          r = parseInt(matches[1], 16);
          g = parseInt(matches[2], 16);
          b = parseInt(matches[3], 16);
        } else if ((matches = /#([0-F])([0-F])([0-F])/gi.exec(value))) {
          r = parseInt(matches[1] + matches[1], 16);
          g = parseInt(matches[2] + matches[2], 16);
          b = parseInt(matches[3] + matches[3], 16);
        }
      }

      r = r < 0 ? 0 : (r > 255 ? 255 : r);
      g = g < 0 ? 0 : (g > 255 ? 255 : g);
      b = b < 0 ? 0 : (b > 255 ? 255 : b);

      return self;
    }

    if (value) {
      parse(value);
    }

    self.toRgb = toRgb;
    self.toHsv = toHsv;
    self.toHex = toHex;
    self.parse = parse;
  }

  ibis.util.Color = Color;
})(ibis);
