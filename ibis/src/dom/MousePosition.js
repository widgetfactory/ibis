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
 * This module calculates an absolute coordinate inside the editor body for both local and global mouse events.
 *
 * @private
 * @class ibis.dom.MousePosition
 */
(function (ibis) {
    var getAbsolutePosition = function (elm) {
      var doc, docElem, win, clientRect;

      clientRect = elm.getBoundingClientRect();
      doc = elm.ownerDocument;
      docElem = doc.documentElement;
      win = doc.defaultView;

      return {
        top: clientRect.top + win.pageYOffset - docElem.clientTop,
        left: clientRect.left + win.pageXOffset - docElem.clientLeft
      };
    };

    var getBodyPosition = function (editor) {
      return editor.inline ? getAbsolutePosition(editor.getBody()) : { left: 0, top: 0 };
    };

    var getScrollPosition = function (editor) {
      var body = editor.getBody();
      return editor.inline ? { left: body.scrollLeft, top: body.scrollTop } : { left: 0, top: 0 };
    };

    var getBodyScroll = function (editor) {
      var body = editor.getBody(), docElm = editor.getDoc().documentElement;
      var inlineScroll = { left: body.scrollLeft, top: body.scrollTop };
      var iframeScroll = { left: body.scrollLeft || docElm.scrollLeft, top: body.scrollTop || docElm.scrollTop };

      return editor.inline ? inlineScroll : iframeScroll;
    };

    var getMousePosition = function (editor, event) {
      if (event.target.ownerDocument !== editor.getDoc()) {
        var iframePosition = getAbsolutePosition(editor.getContentAreaContainer());
        var scrollPosition = getBodyScroll(editor);

        return {
          left: event.pageX - iframePosition.left + scrollPosition.left,
          top: event.pageY - iframePosition.top + scrollPosition.top
        };
      }

      return {
        left: event.pageX,
        top: event.pageY
      };
    };

    var calculatePosition = function (bodyPosition, scrollPosition, mousePosition) {
      return {
        pageX: (mousePosition.left - bodyPosition.left) + scrollPosition.left,
        pageY: (mousePosition.top - bodyPosition.top) + scrollPosition.top
      };
    };

    var calc = function (editor, event) {
      return calculatePosition(getBodyPosition(editor), getScrollPosition(editor), getMousePosition(editor, event));
    };

    ibis.dom.MousePosition = {
      calc: calc
    };
})(ibis);
