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
  /**
     * This class contains simple storage manangement functions.
     *
     * @class ibis.util.Storage
     * @static
     * @example
     * // Gets a cookie from the browser
     * console.debug(ibis.util.Storage.get('mycookie'));
     *
     * // Gets a hash table cookie from the browser and takes out the x parameter from it
     * console.debug(ibis.util.Storage.getHash('mycookie').x);
     *
     * // Sets a hash table cookie to the browser
     * ibis.util.Storage.setHash({x : '1', y : '2'});
     */
  ibis.util.Storage = {
    /**
      * Parses the specified query string into an name/value object.
      *
      * @method getHash
      * @param {String} n String to parse into a n Hashtable object.
      * @return {Object} Name/Value object with items parsed from querystring.
      */
    getHash: function (n) {
      var v = this.get(n),
        h;

      if (v) {
        try {
          h = JSON.parse(v);
        } catch (e) {
          /* error */
        }
      }

      return h;
    },

    /**
      * Sets a hashtable name/value object to a sessionStorage item.
      *
      * @method setHash
      * @param {String} n Name of the item.
      * @param {Object} v Hashtable object to set as item.
      */
    setHash: function (n, v) {
      this.set(n, JSON.stringify(v));
    },

    /**
      * Gets the raw data of an item by name.
      *
      * @method get
      * @param {String} n Name of item to retrive.
      * @param {String} s Default value to return.
      * @return {String} Item data string.
      */
    get: function (n, s) {
      if (!window.sessionStorage) {
        return null;
      }

      var val = sessionStorage.getItem(n);

      // return default
      if (!ibis.is(val) || val == null) {
        return s;
      }

      if (val === "true") {
        return true;
      }

      if (val === "false") {
        return false;
      }

      if (val === "null") {
        return null;
      }

      return val;
    },

    /**
      * Sets a raw cookie string.
      *
      * @method set
      * @param {String} n Name of the cookie.
      * @param {String} v Raw cookie data.
      */
    set: function (n, v) {
      if (!window.sessionStorage) {
        return;
      }

      sessionStorage.setItem(n, v);
    }
  };

  ibis.util.Cookie = {
    getHash: function (n) {
      return ibis.util.Storage.getHash(n);
    },

    setHash: function (n, v) {
      return ibis.util.Storage.setHash(n, v);
    },

    get: function (n, s) {
      return ibis.util.Storage.get(n, s);
    },

    set: function (n, v) {
      return ibis.util.Storage.set(n, v);
    }
  };
})(ibis);