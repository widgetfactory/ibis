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
 * Contains various node validation functions.
 *
 * @private
 * @class ibis.dom.NodeType
 */
(function (ibis) {
  function isNodeType(type) {
    return function (node) {
      return !!node && node.nodeType == type;
    };
  }

  var isElement = isNodeType(1);

  function matchNodeNames(names) {
    names = names.toLowerCase().split(' ');

    return function (node) {
      var i, name;

      if (node && node.nodeType) {
        name = node.nodeName.toLowerCase();

        for (i = 0; i < names.length; i++) {
          if (name === names[i]) {
            return true;
          }
        }
      }

      return false;
    };
  }

  function matchStyleValues(name, values) {
    values = values.toLowerCase().split(' ');

    return function (node) {
      var i, cssValue;

      if (isElement(node)) {
        for (i = 0; i < values.length; i++) {
          cssValue = node.ownerDocument.defaultView.getComputedStyle(node, null).getPropertyValue(name);
          if (cssValue === values[i]) {
            return true;
          }
        }
      }

      return false;
    };
  }

  function hasPropValue(propName, propValue) {
    return function (node) {
      return isElement(node) && node[propName] === propValue;
    };
  }

  function hasAttributeValue(attrName, attrValue) {
    return function (node) {
      return isElement(node) && node.getAttribute(attrName) === attrValue;
    };
  }

  function isBogus(node) {
    return isElement(node) && node.hasAttribute('data-mce-bogus');
  }

  function isBookmark(node) {
    return isElement(node) && node.getAttribute('data-mce-type') == 'bookmark';
  }

  function isCaret(node) {
    return isElement(node) && node.id === '_mce_caret';
  }

  function isInternal(node) {
    return isBogus(node) || isBookmark(node) || isCaret(node);
  }

  function hasContentEditableState(value) {
    return function (node) {
      if (isElement(node)) {

        // check contenteditable override
        if (node.hasAttribute('data-mce-contenteditable')) {
          return node.getAttribute('data-mce-contenteditable') === value;
        }

        // check attribute
        if (node.contentEditable === value) {
          return true;
        }

        /*if (node.getAttribute('data-mce-contenteditable') === value) {
          return true;
        }*/
      }

      return false;
    };
  }

  ibis.dom.NodeType = {
    isText: isNodeType(3),
    isElement: isElement,
    isComment: isNodeType(8),
    isDocument: isNodeType(9),
    isDocumentFragment: isNodeType(11),
    isBr: matchNodeNames('br'),
    isContentEditableTrue: hasContentEditableState('true'),
    isContentEditableFalse: hasContentEditableState('false'),
    matchNodeNames: matchNodeNames,
    hasPropValue: hasPropValue,
    hasAttributeValue: hasAttributeValue,
    matchStyleValues: matchStyleValues,
    isBogus: isBogus,
    isBookmark: isBookmark,
    isInternal: isInternal
  };

})(ibis);