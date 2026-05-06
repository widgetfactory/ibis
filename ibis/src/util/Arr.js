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
 * Array utility class.
 *
 * @private
 * @class ibis.util.Arr
 */
(function (ibis) {
  var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  function toArray(obj) {
    var array = obj,
      i, l;

    if (!isArray(obj)) {
      array = [];
      for (i = 0, l = obj.length; i < l; i++) {
        array[i] = obj[i];
      }
    }

    return array;
  }

  function each(o, cb, s) {
    var n, l;

    if (!o) {
      return 0;
    }

    s = s || o;

    if (o.length !== undefined) {
      // Indexed arrays, needed for Safari
      for (n = 0, l = o.length; n < l; n++) {
        if (cb.call(s, o[n], n, o) === false) {
          return 0;
        }
      }
    } else {
      // Hashtables
      for (n in o) {
        // eslint-disable-next-line no-prototype-builtins
        if (o.hasOwnProperty(n)) {
          if (cb.call(s, o[n], n, o) === false) {
            return 0;
          }
        }
      }
    }

    return 1;
  }

  function map(array, callback) {
    var out = [];

    each(array, function (item, index) {
      out.push(callback(item, index, array));
    });

    return out;
  }

  function filter(a, f) {
    var o = [];

    each(a, function (v, index) {
      if (!f || f(v, index, a)) {
        o.push(v);
      }
    });

    return o;
  }

  function indexOf(a, v) {
    var i, l;

    if (a) {
      for (i = 0, l = a.length; i < l; i++) {
        if (a[i] === v) {
          return i;
        }
      }
    }

    return -1;
  }

  function contains(a, v) {
    return indexOf(a, v) > -1;
  }

  function forall(xs, pred) {
    for (var i = 0, len = xs.length; i < len; ++i) {
      var x = xs[i];
      if (pred(x, i) !== true) {
        return false;
      }
    }
    return true;
  }

  function reduce(collection, iteratee, accumulator, thisArg) {
    var i = 0;

    if (arguments.length < 3) {
      accumulator = collection[0];
    }

    for (; i < collection.length; i++) {
      accumulator = iteratee.call(thisArg, accumulator, collection[i], i);
    }

    return accumulator;
  }

  function findIndex(array, predicate, thisArg) {
    var i, l;

    for (i = 0, l = array.length; i < l; i++) {
      if (predicate.call(thisArg, array[i], i, array)) {
        return i;
      }
    }

    return -1;
  }

  function find(array, predicate, thisArg) {
    var idx = findIndex(array, predicate, thisArg);

    if (idx !== -1) {
      return array[idx];
    }

    return undefined;
  }

  function last(collection) {
    return collection[collection.length - 1];
  }

  function toObject(array, callback) {
    var i, l, object = {};

    for (i = 0, l = array.length; i < l; i++) {
      var x = array[i];
      object[x] = callback(x, i);
    }

    return object;
  }

  function flat(arr) {
    var i, l, out = [];

    for (i = 0, l = arr.length; i < l; i++) {
      if (isArray(arr[i])) {
        Array.prototype.push.apply(out, arr[i]);
      }
    }

    return out;
  }

  function flatMap(array, callback) {
    var output = map(array, callback);
    return flat(output);
  }

  ibis.util.Arr = {
    isArray: isArray,
    toArray: toArray,
    each: each,
    map: map,
    filter: filter,
    indexOf: indexOf,
    reduce: reduce,
    findIndex: findIndex,
    find: find,
    last: last,
    toObject: toObject,
    flat: flat,
    flatMap: flatMap,
    bind: flatMap,
    contains: contains,
    forall: forall
  };
})(ibis);