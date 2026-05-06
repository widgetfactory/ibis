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
 * This module contains logic for handling caret candidates. A caret candidate is
 * for example text nodes, images, input elements, cE=false elements etc.
 *
 * @private
 * @class ibis.caret.CaretCandidate
 */
(function (ibis) {
  var NodeType = ibis.dom.NodeType, CaretContainer = ibis.caret.CaretContainer;
  var Arr = ibis.util.Arr;

  var isContentEditableTrue = NodeType.isContentEditableTrue,
    isContentEditableFalse = NodeType.isContentEditableFalse,
    isBr = NodeType.isBr,
    isText = NodeType.isText,
    isInvalidTextElement = NodeType.matchNodeNames('script style textarea'),
    isAtomicInline = NodeType.matchNodeNames('img input textarea hr iframe video audio object'),
    isTable = NodeType.matchNodeNames('table'),
    isCaretContainer = CaretContainer.isCaretContainer;

  function isCaretCandidate(node) {
    if (isCaretContainer(node)) {
      return false;
    }

    if (isText(node)) {
      if (isInvalidTextElement(node.parentNode)) {
        return false;
      }

      return true;
    }

    return isAtomicInline(node) || isBr(node) || isTable(node) || isContentEditableFalse(node);
  }

  function isInEditable(node, rootNode) {
    for (node = node.parentNode; node && node != rootNode; node = node.parentNode) {
      if (isContentEditableFalse(node)) {
        return false;
      }

      if (isContentEditableTrue(node)) {
        return true;
      }
    }

    return true;
  }

  function isAtomicContentEditableFalse(node) {
    if (!isContentEditableFalse(node)) {
      return false;
    }

    return Arr.reduce(node.getElementsByTagName('*'), function (result, elm) {
      return result || isContentEditableTrue(elm);
    }, false) !== true;
  }

  function isAtomic(node) {
    return isAtomicInline(node) || isAtomicContentEditableFalse(node);
  }

  function isEditableCaretCandidate(node, rootNode) {
    return isCaretCandidate(node) && isInEditable(node, rootNode);
  }

  ibis.caret.CaretCandidate = {
    isCaretCandidate: isCaretCandidate,
    isInEditable: isInEditable,
    isAtomic: isAtomic,
    isEditableCaretCandidate: isEditableCaretCandidate
  };
})(ibis);