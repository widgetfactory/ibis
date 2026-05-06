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
 * This module contains logic for creating caret positions within a document a caretposition
 * is similar to a DOMRange object but it doesn't have two endpoints and is also more lightweight
 * since it's now updated live when the DOM changes.
 *
 * @private
 * @class ibis.caret.CaretPosition
 * @example
 * var caretPos1 = new CaretPosition(container, offset);
 * var caretPos2 = CaretPosition.fromRangeStart(someRange);
 */

(function (ibis) {
  var NodeType = ibis.dom.NodeType,
    CaretCandidate = ibis.caret.CaretCandidate,
    CaretPosition = ibis.caret.CaretPosition,
    CaretUtils = ibis.caret.CaretUtils,
    CaretWalker = ibis.caret.CaretWalker,
    Fun = ibis.util.Fun,
    Option = ibis.util.Option;

  var walkToPositionIn = function (forward, rootNode, startNode) {
    var position = forward ? CaretPosition.before(startNode) : CaretPosition.after(startNode);
    return fromPosition(forward, rootNode, position);
  };

  var afterElement = function (node) {
    return NodeType.isBr(node) ? CaretPosition.before(node) : CaretPosition.after(node);
  };

  var isBeforeOrStart = function (position) {
    if (CaretPosition.isTextPosition(position)) {
      return position.offset() === 0;
    } else {
      return CaretCandidate.isCaretCandidate(position.getNode());
    }
  };

  var isAfterOrEnd = function (position) {
    if (CaretPosition.isTextPosition(position)) {
      return position.offset() === position.container().data.length;
    } else {
      return CaretCandidate.isCaretCandidate(position.getNode(true));
    }
  };

  var isBeforeAfterSameElement = function (from, to) {
    return !CaretPosition.isTextPosition(from) && !CaretPosition.isTextPosition(to) && from.getNode() === to.getNode(true);
  };

  var isAtBr = function (position) {
    return !CaretPosition.isTextPosition(position) && NodeType.isBr(position.getNode());
  };

  var shouldSkipPosition = function (forward, from, to) {
    if (forward) {
      return !isBeforeAfterSameElement(from, to) && !isAtBr(from) && isAfterOrEnd(from) && isBeforeOrStart(to);
    } else {
      return !isBeforeAfterSameElement(to, from) && isBeforeOrStart(from) && isAfterOrEnd(to);
    }
  };

  // Finds: <p>a|<b>b</b></p> -> <p>a<b>|b</b></p>
  var fromPosition = function (forward, rootNode, position) {
    var walker = new CaretWalker(rootNode);
    return Option.from(forward ? walker.next(position) : walker.prev(position));
  };

  // Finds: <p>a|<b>b</b></p> -> <p>a<b>b|</b></p>
  var navigate = function (forward, rootNode, from) {
    return fromPosition(forward, rootNode, from).bind(function (to) {
      if (CaretUtils.isInSameBlock(from, to, rootNode) && shouldSkipPosition(forward, from, to)) {
        return fromPosition(forward, rootNode, to);
      } else {
        return Option.some(to);
      }
    });
  };

  var positionIn = function (forward, element) {
    var startNode = forward ? element.firstChild : element.lastChild;
    if (NodeType.isText(startNode)) {
      return Option.some(new CaretPosition(startNode, forward ? 0 : startNode.data.length));
    } else if (startNode) {
      if (CaretCandidate.isCaretCandidate(startNode)) {
        return Option.some(forward ? CaretPosition.before(startNode) : afterElement(startNode));
      } else {
        return walkToPositionIn(forward, element, startNode);
      }
    } else {
      return Option.none();
    }
  };

  ibis.caret.CaretFinder = {
    fromPosition: fromPosition,
    nextPosition: Fun.curry(fromPosition, true),
    prevPosition: Fun.curry(fromPosition, false),
    navigate: navigate,
    positionIn: positionIn,
    firstPositionIn: Fun.curry(positionIn, true),
    lastPositionIn: Fun.curry(positionIn, false)
  };

})(ibis);