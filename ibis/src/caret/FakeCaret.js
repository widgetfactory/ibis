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
 * This module contains logic for rendering a fake visual caret.
 *
 * @private
 * @class ibis.caret.FakeCaret
 */
(function (ibis) {
  var NodeType = ibis.dom.NodeType,
    DOM = ibis.DOM,
    ClientRect = ibis.geom.ClientRect,
    CaretContainer = ibis.caret.CaretContainer,
    CaretContainerRemove = ibis.caret.CaretContainerRemove;

  var isContentEditableFalse = NodeType.isContentEditableFalse;

  ibis.caret.FakeCaret = function (rootNode, isBlock) {
    var cursorInterval, $lastVisualCaret, caretContainerNode;

    function getAbsoluteClientRect(node, before) {
      var clientRect = ClientRect.collapse(node.getBoundingClientRect(), before),
        docElm, scrollX, scrollY, margin, rootRect;

      if (rootNode.tagName == 'BODY') {
        docElm = rootNode.ownerDocument.documentElement;
        scrollX = rootNode.scrollLeft || docElm.scrollLeft;
        scrollY = rootNode.scrollTop || docElm.scrollTop;
      } else {
        rootRect = rootNode.getBoundingClientRect();
        scrollX = rootNode.scrollLeft - rootRect.left;
        scrollY = rootNode.scrollTop - rootRect.top;
      }

      clientRect.left += scrollX;
      clientRect.right += scrollX;
      clientRect.top += scrollY;
      clientRect.bottom += scrollY;
      clientRect.width = 1;

      margin = node.offsetWidth - node.clientWidth;

      if (margin > 0) {
        if (before) {
          margin *= -1;
        }

        clientRect.left += margin;
        clientRect.right += margin;
      }

      return clientRect;
    }

    function trimInlineCaretContainers() {
      var contentEditableFalseNodes, node, sibling, i, data;

      contentEditableFalseNodes = DOM.select('*[contentEditable=false]', rootNode);
      
      for (i = 0; i < contentEditableFalseNodes.length; i++) {
        node = contentEditableFalseNodes[i];

        sibling = node.previousSibling;
        if (CaretContainer.endsWithCaretContainer(sibling)) {
          data = sibling.data;

          if (data.length == 1) {
            sibling.parentNode.removeChild(sibling);
          } else {
            sibling.deleteData(data.length - 1, 1);
          }
        }

        sibling = node.nextSibling;
        if (CaretContainer.startsWithCaretContainer(sibling)) {
          data = sibling.data;

          if (data.length == 1) {
            sibling.parentNode.removeChild(sibling);
          } else {
            sibling.deleteData(0, 1);
          }
        }
      }

      return null;
    }

    function show(before, node) {
      var clientRect, rng;

      hide();

      if (isBlock(node)) {
        caretContainerNode = CaretContainer.insertBlock('p', node, before);
        clientRect = getAbsoluteClientRect(node, before);
        DOM.setStyle(caretContainerNode, 'top', clientRect.top);

        $lastVisualCaret = DOM.add(rootNode, 'div', { 'class': 'mce-visual-caret', 'data-mce-bogus': 'all', 'style': clientRect });

        if (before) {
          DOM.addClass($lastVisualCaret, 'mce-visual-caret-before');
        }

        startBlink();

        rng = node.ownerDocument.createRange();
        rng.setStart(caretContainerNode, 0);
        rng.setEnd(caretContainerNode, 0);
      } else {
        caretContainerNode = CaretContainer.insertInline(node, before);
        rng = node.ownerDocument.createRange();

        if (isContentEditableFalse(caretContainerNode.nextSibling)) {
          rng.setStart(caretContainerNode, 0);
          rng.setEnd(caretContainerNode, 0);
        } else {
          rng.setStart(caretContainerNode, 1);
          rng.setEnd(caretContainerNode, 1);
        }

        return rng;
      }

      return rng;
    }

    function hide() {
      trimInlineCaretContainers();

      if (caretContainerNode) {
        CaretContainerRemove.remove(caretContainerNode);
        caretContainerNode = null;
      }

      if ($lastVisualCaret) {
        $lastVisualCaret.remove();
        $lastVisualCaret = null;
      }

      clearInterval(cursorInterval);
    }

    function startBlink() {
      cursorInterval = setInterval(function () {
        var caret = DOM.select('div.mce-visual-caret', rootNode)[0];

        DOM.toggleClass(caret, 'mce-visual-caret-hidden');
        
      }, 500);
    }

    function destroy() {
      clearInterval(cursorInterval);
    }

    function getCss() {
      return (
        '.mce-visual-caret {' +
        'position: absolute;' +
        'background-color: black;' +
        'background-color: currentcolor;' +
        '}' +
        '.mce-visual-caret-hidden {' +
        'display: none;' +
        '}' +
        '*[data-mce-caret] {' +
        'position: absolute;' +
        'left: -1000px;' +
        'right: auto;' +
        'top: 0;' +
        'margin: 0;' +
        'padding: 0;' +
        '}'
      );
    }

    return {
      show: show,
      hide: hide,
      getCss: getCss,
      destroy: destroy
    };
  };

})(ibis);