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
 * This module lets you walk the document line by line
 * returing nodes and client rects for each line.
 *
 * @private
 * @class ibis.caret.LineWalker
 */
(function (ibis) {
  var Fun = ibis.util.Fun, Arr = ibis.util.Arr,
    Dimensions = ibis.dom.Dimensions,
    ClientRect = ibis.geom.ClientRect,
    CaretUtils = ibis.caret.CaretUtils,
    CaretCandidate = ibis.caret.CaretCandidate,
    CaretWalker = ibis.caret.CaretWalker,
    CaretPosition = ibis.caret.CaretPosition;

  var curry = Fun.curry;

  function findUntil(direction, rootNode, predicateFn, node) {
    while ((node = CaretUtils.findNode(node, direction, CaretCandidate.isEditableCaretCandidate, rootNode))) {
      if (predicateFn(node)) {
        return;
      }
    }
  }

  function walkUntil(direction, isAboveFn, isBeflowFn, rootNode, predicateFn, caretPosition) {
    var line = 0,
      node, result = [],
      targetClientRect;

    function add(node) {
      var i, clientRect, clientRects;

      clientRects = Dimensions.getClientRects(node);
      if (direction == -1) {
        clientRects = clientRects.reverse();
      }

      for (i = 0; i < clientRects.length; i++) {
        clientRect = clientRects[i];
        if (isBeflowFn(clientRect, targetClientRect)) {
          continue;
        }

        if (result.length > 0 && isAboveFn(clientRect, Arr.last(result))) {
          line++;
        }

        clientRect.line = line;

        if (predicateFn(clientRect)) {
          return true;
        }

        result.push(clientRect);
      }
    }

    targetClientRect = Arr.last(caretPosition.getClientRects());
    if (!targetClientRect) {
      return result;
    }

    node = caretPosition.getNode();
    add(node);
    findUntil(direction, rootNode, add, node);

    return result;
  }

  function aboveLineNumber(lineNumber, clientRect) {
    return clientRect.line > lineNumber;
  }

  function isLine(lineNumber, clientRect) {
    return clientRect.line === lineNumber;
  }

  var upUntil = curry(walkUntil, -1, ClientRect.isAbove, ClientRect.isBelow);
  var downUntil = curry(walkUntil, 1, ClientRect.isBelow, ClientRect.isAbove);

  function positionsUntil(direction, rootNode, predicateFn, node) {
    var caretWalker = new CaretWalker(rootNode),
      walkFn, isBelowFn, isAboveFn,
      caretPosition, result = [],
      line = 0,
      clientRect, targetClientRect;

    function getClientRect(caretPosition) {
      if (direction == 1) {
        return Arr.last(caretPosition.getClientRects());
      }

      return Arr.last(caretPosition.getClientRects());
    }

    if (direction == 1) {
      walkFn = caretWalker.next;
      isBelowFn = ClientRect.isBelow;
      isAboveFn = ClientRect.isAbove;
      caretPosition = CaretPosition.after(node);
    } else {
      walkFn = caretWalker.prev;
      isBelowFn = ClientRect.isAbove;
      isAboveFn = ClientRect.isBelow;
      caretPosition = CaretPosition.before(node);
    }

    targetClientRect = getClientRect(caretPosition);

    do {
      if (!caretPosition.isVisible()) {
        continue;
      }

      clientRect = getClientRect(caretPosition);

      if (isAboveFn(clientRect, targetClientRect)) {
        continue;
      }

      if (result.length > 0 && isBelowFn(clientRect, Arr.last(result))) {
        line++;
      }

      clientRect = ClientRect.clone(clientRect);
      clientRect.position = caretPosition;
      clientRect.line = line;

      if (predicateFn(clientRect)) {
        return result;
      }

      result.push(clientRect);
    } while ((caretPosition = walkFn(caretPosition)));

    return result;
  }

  ibis.caret.LineWalker = {
    upUntil: upUntil,
    downUntil: downUntil,

    /**
     * Find client rects with line and caret position until the predicate returns true.
     *
     * @method positionsUntil
     * @param {Number} direction Direction forward/backward 1/-1.
     * @param {DOMNode} rootNode Root node to walk within.
     * @param {function} predicateFn Gets the client rect as it's input.
     * @param {DOMNode} node Node to start walking from.
     * @return {Array} Array of client rects with line and position properties.
     */
    positionsUntil: positionsUntil,

    isAboveLine: curry(aboveLineNumber),
    isLine: curry(isLine)
  };

})(ibis);