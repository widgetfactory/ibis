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
 * Utility functions for working with zero width space
 * characters used as character containers etc.
 *
 * @private
 * @class ibis.text.Zwsp
 * @example
 * var isZwsp = Zwsp.isZwsp('\uFEFF');
 * var abc = Zwsp.trim('a\uFEFFc');
 */
(function (ibis) {
  // This is technically not a ZWSP but a ZWNBSP or a BYTE ORDER MARK it used to be a ZWSP
  var ZWSP = '\uFEFF';

  var isZwsp = function (chr) {
    return chr === ZWSP;
  };

  var trim = function (text) {
    return text.replace(new RegExp(ZWSP, 'g'), '');
  };

  ibis.text.Zwsp = {
    isZwsp: isZwsp,
    ZWSP: ZWSP,
    trim: trim
  };
})(ibis);