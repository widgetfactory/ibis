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
  var extend = ibis.extend,
    JSON = ibis.util.JSON,
    XHR = ibis.util.XHR;

  /**
   * This class enables you to use JSON-RPC to call backend methods.
   *
   * @class ibis.util.JSONRequest
   * @example
   * var json = new ibis.util.JSONRequest({
   * 		url : 'somebackend.php'
   * });
   *
   * // Send RPC call 1
   * json.send({
   *     method : 'someMethod1',
   *     params : ['a', 'b'],
   *     success : function(result) {
   *         console.dir(result);
   * 	   }
   * });
   *
   * // Send RPC call 2
   * json.send({
   *     method : 'someMethod2',
   *     params : ['a', 'b'],
   *     success : function(result) {
   *         console.dir(result);
   *     }
   * });
   */
  ibis.util.JSONRequest = function (settings) {
    this.settings = extend({}, settings);
    this.count = 0;
  };

  ibis.util.JSONRequest.prototype = {
    /**
     * Sends a JSON-RPC call. Consult the Wiki API documentation for more details on what you can pass to this function.
     *
     * @method send
     * @param {Object} o Call object where there are three field id, method and params this object should also contain callbacks etc.
     */
    send: function (o) {
      var ecb = o.error,
        scb = o.success;

      o = extend(this.settings, o);

      o.success = function (c, x) {
        c = JSON.parse(c);

        if (typeof c == 'undefined') {
          c = {
            error: 'JSON Parse error.'
          };
        }

        if (c.error) {
          ecb.call(o.error_scope || o.scope, c.error, x);
        } else {
          scb.call(o.success_scope || o.scope, c.result);
        }
      };

      o.error = function (ty, x) {
        if (ecb) {
          ecb.call(o.error_scope || o.scope, ty, x);
        }
      };

      o.data = JSON.serialize({
        id: o.id || 'c' + (this.count++),
        method: o.method,
        params: o.params
      });

      // JSON content type for Ruby on rails. Bug: #1883287
      o.content_type = 'application/json';

      XHR.send(o);
    }
  };

  /**
       * Simple helper function to send a JSON-RPC request without the need to initialize an object.
       * Consult the Wiki API documentation for more details on what you can pass to this function.
       *
       * @method sendRPC
       * @static
       * @param {Object} o Call object where there are three field id, method and params this object should also contain callbacks etc.
       */
  ibis.util.JSONRequest.sendRPC = function (o) {
    return new ibis.util.JSONRequest().send(o);
  };

})(ibis);