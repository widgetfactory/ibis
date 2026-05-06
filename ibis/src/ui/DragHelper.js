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
 * Drag/drop helper class.
 *
 * @class ibis.ui.DragHelper
 * @example
 * new ibis.ui.DragHelper('mydiv', {
 *   start: function(e) {},
 *   drag:  function(e) {},
 *   stop:  function(e) {}
 * });
 */

(function (ibis) {
  var DOM = ibis.DOM, Event = ibis.dom.Event;

  function getDocumentSize(doc) {
    var de = doc.documentElement, body = doc.body, max = Math.max;
    return {
      width:  max(de.scrollWidth,  body.scrollWidth,  de.clientWidth,  body.clientWidth,  de.offsetWidth,  body.offsetWidth),
      height: max(de.scrollHeight, body.scrollHeight, de.clientHeight, body.clientHeight, de.offsetHeight, body.offsetHeight)
    };
  }

  function updateWithTouchData(e) {
    var keys, i;
    if (e.changedTouches) {
      keys = 'screenX screenY pageX pageY clientX clientY'.split(' ');
      for (i = 0; i < keys.length; i++) {
        e[keys[i]] = e.changedTouches[0][keys[i]];
      }
    }
  }

  function DragHelper(id, settings) {
    var self = this, doc = settings.document || document, downButton, startX, startY, overlayElm;

    settings = settings || {};

    function getHandleElm() {
      return doc.getElementById(settings.handle || id);
    }

    function start(e) {
      var docSize, handleElm, cursor;

      updateWithTouchData(e);
      e.preventDefault();

      downButton = e.button;
      handleElm = getHandleElm();
      startX = e.screenX;
      startY = e.screenY;

      if (window.getComputedStyle) {
        cursor = window.getComputedStyle(handleElm, null).getPropertyValue('cursor');
      } else {
        cursor = handleElm.runtimeStyle.cursor;
      }

      docSize = getDocumentSize(doc);
      overlayElm = DOM.add(doc.body, 'div', {
        style: 'position:absolute;top:0;left:0;z-index:2147483647;opacity:0.0001;' +
               'width:' + docSize.width + 'px;height:' + docSize.height + 'px;cursor:' + cursor
      });

      Event.add(doc, 'mousemove touchmove', drag);
      Event.add(doc, 'mouseup touchend', stop);

      settings.start(e);
    }

    function drag(e) {
      updateWithTouchData(e);

      if (e.button !== downButton) {
        return stop(e);
      }

      e.deltaX = e.screenX - startX;
      e.deltaY = e.screenY - startY;

      if (!e.changedTouches) {
        e.preventDefault();
      }

      settings.drag(e);
    }

    function stop(e) {
      updateWithTouchData(e);

      Event.remove(doc, 'mousemove touchmove', drag);
      Event.remove(doc, 'mouseup touchend', stop);

      DOM.remove(overlayElm);
      overlayElm = null;

      if (settings.stop) {
        settings.stop(e);
      }
    }

    self.destroy = function () {
      Event.clear(getHandleElm());
    };

    Event.add(getHandleElm(), 'mousedown touchstart', start);
  }

  ibis.ui.DragHelper = DragHelper;
})(ibis);
