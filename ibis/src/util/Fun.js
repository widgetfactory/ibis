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
 * Functional utility class.
 *
 * @private
 * @class ibis.util.Fun
 */
(function (ibis) {
  var slice = [].slice;

  function constant(value) {
    return function () {
      return value;
    };
  }

  function negate(predicate) {
    return function (x) {
      return !predicate(x);
    };
  }

  function compose(f, g) {
    return function (x) {
      return f(g(x));
    };
  }

  function or() {
    var args = slice.call(arguments);

    return function (x) {
      for (var i = 0; i < args.length; i++) {
        if (args[i](x)) {
          return true;
        }
      }

      return false;
    };
  }

  function and() {
    var args = slice.call(arguments);

    return function (x) {
      for (var i = 0; i < args.length; i++) {
        if (!args[i](x)) {
          return false;
        }
      }

      return true;
    };
  }

  var curry = function (fn) {
    var args = slice.call(arguments);

    if (args.length - 1 >= fn.length) {
      return fn.apply(this, args.slice(1));
    }

    return function () {
      var tempArgs = args.concat([].slice.call(arguments));
      return curry.apply(this, tempArgs);
    };
  };

  function noop() { }

  ibis.util.Fun = {
    constant: constant,
    negate: negate,
    and: and,
    or: or,
    curry: curry,
    compose: compose,
    noop: noop
  };
})(ibis);