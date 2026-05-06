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
 * Utility functions for working with client rects.
 *
 * @private
 * @class ibis.geom.ClientRect
 */
(function (ibis) {
  var round = Math.round;

  var clone = function (rect) {
    if (!rect) {
      return {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0
      };
    }

    return {
      left: round(rect.left),
      top: round(rect.top),
      bottom: round(rect.bottom),
      right: round(rect.right),
      width: round(rect.width),
      height: round(rect.height)
    };
  };

  var collapse = function (clientRect, toStart) {
    clientRect = clone(clientRect);

    if (toStart) {
      clientRect.right = clientRect.left;
    } else {
      clientRect.left = clientRect.left + clientRect.width;
      clientRect.right = clientRect.left;
    }

    clientRect.width = 0;

    return clientRect;
  };

  var isEqual = function (rect1, rect2) {
    return (
      rect1.left === rect2.left &&
      rect1.top === rect2.top &&
      rect1.bottom === rect2.bottom &&
      rect1.right === rect2.right
    );
  };

  var isValidOverflow = function (overflowY, clientRect1, clientRect2) {
    return overflowY >= 0 && overflowY <= Math.min(clientRect1.height, clientRect2.height) / 2;

  };

  var isAbove = function (clientRect1, clientRect2) {
    if ((clientRect1.bottom - clientRect1.height / 2) < clientRect2.top) {
      return true;
    }

    if (clientRect1.top > clientRect2.bottom) {
      return false;
    }

    return isValidOverflow(clientRect2.top - clientRect1.bottom, clientRect1, clientRect2);
  };

  var isBelow = function (clientRect1, clientRect2) {
    if (clientRect1.top > clientRect2.bottom) {
      return true;
    }

    if (clientRect1.bottom < clientRect2.top) {
      return false;
    }

    return isValidOverflow(clientRect2.bottom - clientRect1.top, clientRect1, clientRect2);
  };

  var isLeft = function (clientRect1, clientRect2) {
    return clientRect1.left < clientRect2.left;
  };

  var isRight = function (clientRect1, clientRect2) {
    return clientRect1.right > clientRect2.right;
  };

  var compare = function (clientRect1, clientRect2) {
    if (isAbove(clientRect1, clientRect2)) {
      return -1;
    }

    if (isBelow(clientRect1, clientRect2)) {
      return 1;
    }

    if (isLeft(clientRect1, clientRect2)) {
      return -1;
    }

    if (isRight(clientRect1, clientRect2)) {
      return 1;
    }

    return 0;
  };

  var containsXY = function (clientRect, clientX, clientY) {
    return (
      clientX >= clientRect.left &&
      clientX <= clientRect.right &&
      clientY >= clientRect.top &&
      clientY <= clientRect.bottom
    );
  };

  ibis.geom.ClientRect = {
    clone: clone,
    collapse: collapse,
    isEqual: isEqual,
    isAbove: isAbove,
    isBelow: isBelow,
    isLeft: isLeft,
    isRight: isRight,
    compare: compare,
    containsXY: containsXY
  };

})(ibis);