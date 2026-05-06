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
     * JSON parser and serializer class wrapper for native JSON
     *
     * @class ibis.util.JSON
     * @static
     * @example
     * // JSON parse a string into an object
     * var obj = ibis.util.JSON.parse(somestring);
     *
     * // JSON serialize a object into an string
     * var str = ibis.util.JSON.serialize(obj);
     */
  ibis.util.JSON = {
    /**
         * Serializes the specified object as a JSON string.
         *
         * @method serialize
         * @param {Object} obj Object to serialize as a JSON string.
         * @param {String} quote Optional quote string defaults to ".
         * @return {string} JSON string serialized from input.
         */
    serialize: function (obj) {
      try {
        return JSON.stringify(obj);
      } catch (ex) {
        // Ignore
      }
    },

    /**
         * Unserializes/parses the specified JSON string into a object.
         *
         * @method parse
         * @param {string} str JSON String to parse into a JavaScript object.
         * @return {Object} Object from input JSON string or undefined if it failed.
         */
    parse: function (str) {
      try {
        return JSON.parse(str);
      } catch (ex) {
        // Ignore
      }
    }
    /**#@-*/
  };
})(ibis);