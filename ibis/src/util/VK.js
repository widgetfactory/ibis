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
 * This file exposes a set of the common KeyCodes for use.  Please grow it as needed.
 */

(function (ibis) {

  ibis.VK = {
    BACKSPACE: 8,
    DELETE: 46,
    DOWN: 40,
    ENTER: 13,
    LEFT: 37,
    RIGHT: 39,
    SPACEBAR: 32,
    TAB: 9,
    UP: 38,

    modifierPressed: function (e) {
      return e.shiftKey || e.ctrlKey || e.altKey || this.metaKeyPressed(e);
    },

    metaKeyPressed: function (e) {
      // Check if ctrl or meta key is pressed also check if alt is false for Polish users
      if (ibis.isMac) {
        return e.metaKey;
      }

      return e.ctrlKey && !e.altKey;
    }
  };
})(ibis);