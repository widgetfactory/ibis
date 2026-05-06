/**
 * Copyright (c) Moxiecode Systems AB
 * Copyright (c) 1999–2017 Ephox Corporation. All rights reserved.
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Copyright (c) 2009 - 2025 Ryan Demmer. All rights reserved.
 *
 * @note Forked from or includes code from TinyMCE 4.x/5.x (originally LGPL v2.1),
 * TinyMCE 6.x (MIT), and TinyMCE 7.x (GPL v2.0 or later).
 *
 * Code originally under LGPL v2.1 is relicensed under GPL v2.0 or later
 * as permitted by Section 3 of the LGPL v2.1.
 * Code originally under MIT is incorporated under its permissive terms.
 * Code originally under GPL v2.0 or later remains under GPL v2.0 or later.
 *
 * Licensed under the GNU General Public License v2.0 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var NONE = {
    bind: function () {
      return NONE;
    },
    isNone: function () {
      return true;
    }
  };

  var some = function (a) {
    return {
      bind: function (f) {
        return f(a);
      },
      isNone: function () {
        return false;
      }
    };
  };

  var none = function () {
    return NONE;
  };

  var from = function (value) {
    return value === null || value === undefined ? NONE : some(value);
  };

  ibis.util.Option = {
    some: some,
    none: none,
    from: from
  };

})(ibis);
