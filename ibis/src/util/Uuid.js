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
 * Generates unique ids.
 *
 * @class ibis.util.Uuid
 * @private
 */

var count = 0;

var seed = function () {
  var rnd = function () {
    return Math.round(Math.random() * 0xFFFFFFFF).toString(36);
  };

  var now = new Date().getTime();
  return 's' + now.toString(36) + rnd() + rnd() + rnd();
};

var uuid = function (prefix) {
  return prefix + (count++) + seed();
};

ibis.util.Uuid = {
  uuid: uuid
};