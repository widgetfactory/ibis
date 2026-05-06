/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {

  var NodeType = ibis.dom.NodeType, Dispatcher = ibis.util.Dispatcher;

  var getPos = function (elm) {
    var x = 0,
      y = 0;

    var offsetParent = elm;
    while (offsetParent && offsetParent.nodeType) {
      x += offsetParent.offsetLeft || 0;
      y += offsetParent.offsetTop || 0;
      offsetParent = offsetParent.offsetParent;
    }

    return {
      x: x,
      y: y
    };
  };

  var fireScrollIntoViewEvent = function (editor, elm, alignToTop) {
    var scrollEvent = {
      elm: elm,
      alignToTop: alignToTop,
      cancel: false
    };

    editor.onScrollIntoView.dispatch(editor, scrollEvent);

    return scrollEvent.cancel === true;
  };

  ibis.dom.ScrollIntoView = function (editor, elm, alignToTop) {
    var y, viewPort, dom = editor.dom,
      root = dom.getRoot(),
      viewPortY, viewPortH, offsetY = 0;

    editor.onScrollIntoView = new Dispatcher();

    if (fireScrollIntoViewEvent(editor, elm, alignToTop)) {
      return;
    }

    if (!NodeType.isElement(elm)) {
      return;
    }

    if (alignToTop === false) {
      offsetY = elm.offsetHeight;
    }

    if (root.nodeName !== 'BODY') {
      var scrollContainer = editor.selection.getScrollContainer();
      if (scrollContainer) {
        y = getPos(elm).y - getPos(scrollContainer).y + offsetY;
        viewPortH = scrollContainer.clientHeight;
        viewPortY = scrollContainer.scrollTop;
        if (y < viewPortY || y + 25 > viewPortY + viewPortH) {
          scrollContainer.scrollTop = y < viewPortY ? y : y - viewPortH + 25;
        }

        return;
      }
    }

    viewPort = dom.getViewPort(editor.getWin());
    y = dom.getPos(elm).y + offsetY;
    viewPortY = viewPort.y;
    viewPortH = viewPort.h;
    if (y < viewPort.y || y + 25 > viewPortY + viewPortH) {
      editor.getWin().scrollTo(0, y < viewPortY ? y : y - viewPortH + 25);
    }
  };

})(ibis);