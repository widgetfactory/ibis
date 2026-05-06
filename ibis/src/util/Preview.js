/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


(function (ibis) {
  var each = ibis.each, extend = ibis.extend;

  var rgba = {}, luma = {}, white = 'rgb(255, 255, 255)';

  var previewElm;

  function getRGBA(val) {
    if (!rgba[val]) {
      var r = 0, b = 0, g = 0, a = 1, values, match;

      if (val.indexOf('#') !== -1) {
        val = val.substr(1);

        // fff -> ffffff
        if (val.length === 3) {
          val += val;
        }

        r = parseInt(val.substring(0, 2), 16);
        g = parseInt(val.substring(2, 4), 16);
        b = parseInt(val.substring(4, 6), 16);

        if (val.length > 6) {
          a = parseInt(val.substring(6, 8), 16);
          a = +(a / 255).toFixed(2);
        }

      } else {
        // remove spaces
        val = val.replace(/\s/g, '');
        match = /^(?:rgb|rgba)\(([^\)]*)\)$/.exec(val);

        if (match) {
          values = match[1].split(',').map(function (x) {
            return parseFloat(x);
          });
        }

        if (values) {
          r = values[0];
          g = values[1];
          b = values[2];

          if (values.length === 4) {
            a = values[3] || 1;
          }
        }
      }

      rgba[val] = { r: r, g: g, b: b, a: a };
    }

    return rgba[val];
  }
  // https://github.com/bgrins/TinyColor/blob/master/tinycolor.js#L75
  function getLuminance(val) {
    if (!luma[val]) {
      var col = getRGBA(val);

      // opacity is set
      /*if (col.a < 1 && color2) {
                var col2 = getRGBA(color2);

                col = {
                    r: ((col2.r - col.r) * col.a) + col.r,
                    g: ((col2.g - col.g) * col.a) + col.g,
                    b: ((col2.b - col.b) * col.a) + col.b
                };
            }*/

      var RsRGB, GsRGB, BsRGB, R, G, B;

      RsRGB = col.r / 255;
      GsRGB = col.g / 255;
      BsRGB = col.b / 255;

      if (RsRGB <= 0.03928) {
        R = RsRGB / 12.92;
      } else {
        R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4);
      }
      if (GsRGB <= 0.03928) {
        G = GsRGB / 12.92;
      } else {
        G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4);
      }
      if (BsRGB <= 0.03928) {
        B = BsRGB / 12.92;
      } else {
        B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4);
      }

      luma[val] = (0.2126 * R) + (0.7152 * G) + (0.0722 * B);

      //luma[val] = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b; // per ITU-R BT.709
    }

    return luma[val];
  }

  // https://github.com/bgrins/TinyColor/blob/master/tinycolor.js#L726
  function isReadable(color1, color2) {
    var l1 = getLuminance(color1);
    var l2 = getLuminance(color2);

    var lvl = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return lvl >= 2;
  }

  /**
 * Correct ES5 RGB→HSL conversion (keeps saturation in HSL space)
 */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      l = (max + min) / 2,
      d = max - min,
      h = 0,
      s = 0;

    if (d !== 0) {
      // H
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
        case g: h = ((b - r) / d + 2); break;
        case b: h = ((r - g) / d + 4); break;
      }
      h = h * 60;

      // S (correct for HSL)
      //   = d / (1 - |2L - 1|)
      s = d / (1 - Math.abs(2 * l - 1));
    }

    return [h, s, l];
  }

  /**
   * Convert HSL [0–360,0–1,0–1] back to RGB [0–255].
   */
  function hslToRgb(h, s, l) {
    h /= 360;
    function hue2rgb(p, q, t) {
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    }
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = (l < 0.5) ? (l * (1 + s)) : (l + s - l * s);
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  }

  /**
   * Compute contrast ratio between two CSS colors.
   */
  function getContrastRatio(c1, c2) {
    var l1 = getLuminance(c1);
    var l2 = getLuminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /**
   * Adjust a foreground color so that its contrast ratio against a background
   * meets the targetContrast, by tweaking HSL lightness via binary search.
   *
   * @param {string} fgColor       - any CSS color string
   * @param {string} bgColor       - any CSS color string
   * @param {number} targetContrast - desired contrast ratio, e.g. 2.0
   * @param {number} iterations    - binary search steps (default 20)
   * @returns {string}              - new foreground as "#rrggbb"
   */
  function adjustContrastColor(fgColor, bgColor, targetContrast, iterations) {
    if (iterations == null) {
      iterations = 20;
    }

    // Early exit if already readable
    if (getContrastRatio(fgColor, bgColor) >= targetContrast) {
      return fgColor;
    }

    // Parse FG to RGBA object via your existing helper
    var col = getRGBA(fgColor);
    var r = col.r, g = col.g, b = col.b;

    // Determine whether to lighten (fgLum > bgLum) or darken
    var lighten = getLuminance(fgColor) > getLuminance(bgColor);

    // Convert FG to HSL
    var hsl = rgbToHsl(r, g, b);
    var h = hsl[0], s = hsl[1], origL = hsl[2];

    var low = 0, high = 1, bestL = origL;

    for (var i = 0; i < iterations; i++) {
      var mid = (low + high) / 2;
      var testL = lighten ? origL + mid * (1 - origL) : origL - mid * origL;
      var rgb = hslToRgb(h, s, testL);
      var hex = '#' +
        ('0' + rgb[0].toString(16)).slice(-2) +
        ('0' + rgb[1].toString(16)).slice(-2) +
        ('0' + rgb[2].toString(16)).slice(-2);

      if (getContrastRatio(hex, bgColor) >= targetContrast) {
        bestL = testL;
        high = mid;
      } else {
        low = mid;
      }
    }

    var finalRgb = hslToRgb(h, s, bestL);

    return '#' +
      ('0' + finalRgb[0].toString(16)).slice(-2) +
      ('0' + finalRgb[1].toString(16)).slice(-2) +
      ('0' + finalRgb[2].toString(16)).slice(-2);
  }

  var resetElm = function () {
    if (previewElm && previewElm.parentNode) {
      previewElm.parentNode.removeChild(previewElm);

      previewElm = null;
    }
  };

  var getCssText = function (ed, fmt, reset) {
    var name, dom = ed.dom,
      previewCss = {};

    fmt = extend({ styles: [], attributes: [], classes: '' }, fmt);

    var previewStyles = ed.settings.preview_styles;

    // No preview forced
    if (previewStyles === false) {
      return '';
    }

    // Default preview
    if (!previewStyles) {
      previewStyles = 'font-family font-size font-weight text-decoration text-transform background-color color';
    }

    // Removes any variables since these can't be previewed
    function removeVars(val) {
      if (val && typeof (val) === "string") {
        val = val.replace(/%(\w+)/g, '');
      }

      return val;
    }

    // Create block/inline element to use for preview
    name = fmt.block || fmt.inline || 'div';

    if (!previewElm || previewElm.nodeName != name.toUpperCase()) {
      previewElm = dom.create(name);
      ed.getBody().appendChild(previewElm);
    }

    // clear preview element
    dom.removeAllAttribs(previewElm);

    // Add format styles to preview element
    each(fmt.styles, function (value, name) {
      value = removeVars(value);

      if (value) {
        dom.setStyle(previewElm, name, value);
      }
    });

    // Add attributes to preview element
    each(fmt.attributes, function (value, name) {
      value = removeVars(value);

      if (value) {
        dom.setAttrib(previewElm, name, value);
      }
    });

    // Add classes to preview element
    each(fmt.classes, function (value) {
      value = removeVars(value);

      dom.addClass(previewElm, value);
    });

    // Add the previewElm outside the visual area
    dom.setStyles(previewElm, {
      position: 'absolute',
      left: -0xFFFF
    });

    previewElm.setAttribute('data-mce-type', 'temp');

    // get body background color and element background color
    var bodybg = dom.getStyle(ed.getBody(), 'background-color', true), elmbg = dom.getStyle(previewElm, 'background-color', true);

    var styles = previewStyles.split(' ');

    var css = '';

    for (var i = 0, len = styles.length; i < len; i++) {
      var key = styles[i], value = dom.getStyle(previewElm, key, true);

      // skip if already added
      if (previewCss[key]) {
        continue;
      }

      // If text color is white and the background color is white or transparent, override with default color
      if (key == 'color') {
        // default to white if transparent
        if (/transparent|rgba\s*\([^)]+,\s*0\)/.test(elmbg)) {
          elmbg = white;
        }

        // if background color produces unreadable text, try body background color
        if (!isReadable(value, elmbg)) {
          // use body background color
          if (value && isReadable(value, bodybg)) {
            value = bodybg;
          } else {
            value = adjustContrastColor(value, elmbg, 2.0);
          }
        }
      }

      // default to inherit
      if (!value) {
        value = 'inherit';
      }

      // set to default if value is 0
      if (key == 'font-size' && parseInt(value, 10) === 0) {
        value = 'inherit';
      }

      previewCss[key] = value;

      css += key + ':' + value + ';';
    }

    if (reset) {
      resetElm();
    }

    return css;
  };

  ibis.util.PreviewCss = {
    getCssText: getCssText,
    reset: resetElm
  };
})(ibis);