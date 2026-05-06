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
 * Utility functions for working with lines.
 *
 * @private
 * @class ibis.caret.LineUtils
 */
(function (ibis) {
  var NodeType = ibis.dom.NodeType,
    Fun = ibis.util.Fun, Arr = ibis.util.Arr,
    Dimensions = ibis.dom.Dimensions,
    ClientRect = ibis.geom.ClientRect,
    CaretUtils = ibis.caret.CaretUtils,
    CaretCandidate = ibis.caret.CaretCandidate;

  var isContentEditableFalse = NodeType.isContentEditableFalse,
    findNode = CaretUtils.findNode,
    curry = Fun.curry;

  function distanceToRectLeft(clientRect, clientX) {
    return Math.abs(clientRect.left - clientX);
  }

  function distanceToRectRight(clientRect, clientX) {
    return Math.abs(clientRect.right - clientX);
  }

  function findClosestClientRect(clientRects, clientX) {
    function isInside(clientX, clientRect) {
      return clientX >= clientRect.left && clientX <= clientRect.right;
    }

    return Arr.reduce(clientRects, function (oldClientRect, clientRect) {
      var oldDistance, newDistance;

      oldDistance = Math.min(distanceToRectLeft(oldClientRect, clientX), distanceToRectRight(oldClientRect, clientX));
      newDistance = Math.min(distanceToRectLeft(clientRect, clientX), distanceToRectRight(clientRect, clientX));

      if (isInside(clientX, clientRect)) {
        return clientRect;
      }

      if (isInside(clientX, oldClientRect)) {
        return oldClientRect;
      }

      // cE=false has higher priority
      if (newDistance == oldDistance && isContentEditableFalse(clientRect.node)) {
        return clientRect;
      }

      if (newDistance < oldDistance) {
        return clientRect;
      }

      return oldClientRect;
    });
  }

  function walkUntil(direction, rootNode, predicateFn, node) {
    while ((node = findNode(node, direction, CaretCandidate.isEditableCaretCandidate, rootNode))) {
      if (predicateFn(node)) {
        return;
      }
    }
  }

  function findLineNodeRects(rootNode, targetNodeRect) {
    var clientRects = [];

    function collect(checkPosFn, node) {
      var lineRects;

      lineRects = Arr.filter(Dimensions.getClientRects(node), function (clientRect) {
        return !checkPosFn(clientRect, targetNodeRect);
      });

      clientRects = clientRects.concat(lineRects);

      return lineRects.length === 0;
    }

    clientRects.push(targetNodeRect);
    walkUntil(-1, rootNode, curry(collect, ClientRect.isAbove), targetNodeRect.node);
    walkUntil(1, rootNode, curry(collect, ClientRect.isBelow), targetNodeRect.node);

    return clientRects;
  }

  function getContentEditableFalseChildren(rootNode) {
    return Arr.filter(Arr.toArray(rootNode.getElementsByTagName('*')), isContentEditableFalse);
  }

  function caretInfo(clientRect, clientX) {
    return {
      node: clientRect.node,
      before: distanceToRectLeft(clientRect, clientX) < distanceToRectRight(clientRect, clientX)
    };
  }

  function closestCaret(rootNode, clientX, clientY) {
    var contentEditableFalseNodeRects, closestNodeRect;

    contentEditableFalseNodeRects = Dimensions.getClientRects(getContentEditableFalseChildren(rootNode));
    contentEditableFalseNodeRects = Arr.filter(contentEditableFalseNodeRects, function (clientRect) {
      return clientY >= clientRect.top && clientY <= clientRect.bottom;
    });

    closestNodeRect = findClosestClientRect(contentEditableFalseNodeRects, clientX);
    if (closestNodeRect) {
      closestNodeRect = findClosestClientRect(findLineNodeRects(rootNode, closestNodeRect), clientX);
      if (closestNodeRect && isContentEditableFalse(closestNodeRect.node)) {
        return caretInfo(closestNodeRect, clientX);
      }
    }

    return null;
  }

  ibis.caret.LineUtils = {
    findClosestClientRect: findClosestClientRect,
    findLineNodeRects: findLineNodeRects,
    closestCaret: closestCaret
  };

})(ibis);