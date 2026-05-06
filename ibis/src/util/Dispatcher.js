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
 * This class is used to dispatch event to observers/listeners.
 * All internal events inside TinyMCE uses this class.
 *
 * @class ibis.util.Dispatcher
 * @example
 * // Creates a custom event
 * this.onSomething = new ibis.util.Dispatcher(this);
 *
 * // Dispatch/fire the event
 * this.onSomething.dispatch('some string');
 */

ibis.util.Dispatcher = function (scope) {
  var self = this;

  self.scope = scope || self;
  self.listeners = [];
  self.inDispatch = false;
};

ibis.util.Dispatcher.prototype = {
  /**
     * Add an observer function to be executed when a dispatch call is done.
     *
     * @method add
     * @param {function} callback Callback function to execute when a dispatch event occurs.
     * @param {Object} s Optional execution scope, defaults to the one specified in the class constructor.
     * @return {function} Returns the same function as the one passed on.
     */
  add: function (callback, scope) {
    this.listeners.push({
      cb: callback,
      scope: scope || this.scope
    });

    return callback;
  },

  /**
     * Add an observer function to be executed to the top of the list of observers.
     *
     * @method addToTop
     * @param {function} callback Callback function to execute when a dispatch event occurs.
     * @param {Object} scope Optional execution scope, defaults to the one specified in the class constructor.
     * @return {function} Returns the same function as the one passed on.
     */
  addToTop: function (callback, scope) {
    var self = this,
      listener = {
        cb: callback,
        scope: scope || self.scope
      };

    // Create new listeners if addToTop is executed in a dispatch loop
    if (self.inDispatch) {
      self.listeners = [listener].concat(self.listeners);
    } else {
      self.listeners.unshift(listener);
    }

    return callback;
  },

  /**
     * Removes an observer function.
     *
     * @method remove
     * @param {function} callback Observer function to remove.
     * @return {function} The same function that got passed in or null if it wasn't found.
     */
  remove: function (callback) {
    var listeners = this.listeners,
      output = null;

    ibis.each(listeners, function (listener, i) {
      if (callback == listener.cb) {
        output = listener;
        listeners.splice(i, 1);
        return false;
      }
    });

    return output;
  },

  /**
     * Dispatches an event to all observers/listeners.
     *
     * @method dispatch
     * @param {Object} .. Any number of arguments to dispatch.
     * @return {Object} Last observer functions return value.
     */
  dispatch: function () {
    var self = this,
      returnValue, args = arguments,
      i, listeners = self.listeners,
      listener;

    self.inDispatch = true;

    // Needs to be a real loop since the listener count might change while looping
    // And this is also more efficient
    for (i = 0; i < listeners.length; i++) {
      listener = listeners[i];
      returnValue = listener.cb.apply(listener.scope, args.length > 0 ? args : [listener.scope]);

      if (returnValue === false) {
        break;
      }
    }

    self.inDispatch = false;

    return returnValue;
  }
};