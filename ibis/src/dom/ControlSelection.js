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
  var Dispatcher = ibis.util.Dispatcher,
    VK = ibis.VK;

  function debounce(callback, time) {
    var timer, func;

    func = function () {
      var args = arguments;

      clearTimeout(timer);

      timer = setTimeout(function () {
        callback.apply(this, args);
      }, time || 0);
    };

    func.stop = function () {
      clearTimeout(timer);
    };

    return func;
  }

  function hasContentEditableState(node, value) {
    if (node && node.nodeType === 1) {
      if (node.contentEditable === value) {
        return true;
      }

      if (node.getAttribute('data-mce-contenteditable') === value) {
        return true;
      }
    }

    return false;
  }

  /**
	 * This class handles control selection of elements. Controls are elements
	 * that can be resized and needs to be selected as a whole. It adds custom resize handles
	 * to all browser engines that support properly disabling the built in resize logic.
	 *
	 * @class ibis.dom.ControlSelection
	 */

  /**
	 * Constucts a new ControlSelection class.
	 *
	 * @constructor
	 * @method Serializer
	 * @param {Object} settings Serializer settings object.
	 * @param {ibis.dom.DOMUtils} dom DOMUtils instance reference.
	 * @param {ibis.html.Schema} schema Optional schema reference.
	 */
  ibis.dom.ControlSelection = function (selection, editor) {

    function getContentEditableRoot(root, node) {
      while (node && node != root) {
        if (hasContentEditableState(node, 'true') || hasContentEditableState(node, 'false')) {
          return node;
        }

        node = node.parentNode;
      }

      return null;
    }

    var dom = editor.dom,
      each = ibis.each;
    var selectedElm, selectedElmGhost, resizeHelper, resizeHandles, selectedHandle, lastMouseDownEvent;
    var startX, startY, selectedElmX, selectedElmY, startW, startH, ratio, resizeStarted;
    var width, height, editableDoc = editor.getDoc(),
      rootDocument = document,
      isIE = ibis.isIE && ibis.isIE < 11;

    var abs = Math.abs,
      round = Math.round,
      rootElement = editor.getBody(),
      startScrollWidth, startScrollHeight;

    // Set up events
    editor.onObjectSelected = new Dispatcher();
    editor.onObjectResizeStart = new Dispatcher();
    editor.onObjectResized = new Dispatcher();

    // Details about each resize handle how to scale etc
    resizeHandles = {
      /*n: [0.5, 0, 0, -1],
			e: [1, 0.5, 1, 0],
			s: [0.5, 1, 0, 1],
			w: [0, 0.5, -1, 0],*/
      nw: [0, 0, -1, -1],
      ne: [1, 0, 1, -1],
      se: [1, 1, 1, 1],
      sw: [0, 1, -1, 1]
    };

    function isResizable(elm) {
      var selector = editor.settings.object_resizing;

      if (selector === false) {
        return false;
      }

      /*if (ibis.isIOS) {
				return false;
			}*/

      if (typeof selector != 'string') {
        selector = 'table,img,[data-mce-resize]';
      }

      if (elm.getAttribute('data-mce-resize') === 'false') {
        return false;
      }

      if (elm == editor.getBody()) {
        return false;
      }

      return editor.dom.is(elm, selector);
    }

    function updateWithTouchData(e) {
      var keys, i;

      if (e.changedTouches) {
        keys = "screenX screenY pageX pageY clientX clientY".split(' ');
        for (i = 0; i < keys.length; i++) {
          e[keys[i]] = e.changedTouches[0][keys[i]];
        }
      }
    }

    function isProportionalResize(elm) {
      return elm.nodeName === 'IMG' || elm.getAttribute('data-mce-resize') === 'proportional';
    }

    function resizeGhostElement(e) {
      var deltaX, deltaY, proportional;
      var resizeHelperX, resizeHelperY;

      updateWithTouchData(e);

      // Calc new width/height
      deltaX = e.screenX - startX;
      deltaY = e.screenY - startY;

      // Calc new size
      width = deltaX * selectedHandle[2] + startW;
      height = deltaY * selectedHandle[3] + startH;

      // Never scale down lower than 5 pixels
      width = width < 5 ? 5 : width;
      height = height < 5 ? 5 : height;

      if (isProportionalResize(selectedElm) && editor.settings.resize_img_proportional !== false) {
        proportional = !VK.modifierPressed(e);
      } else {
        proportional = VK.modifierPressed(e) || (selectedElm.nodeName == "IMG" && selectedHandle[2] * selectedHandle[3] !== 0);
      }

      // Constrain proportions
      if (proportional) {
        if (abs(deltaX) > abs(deltaY)) {
          height = round(width * ratio);
          width = round(height / ratio);
        } else {
          width = round(height / ratio);
          height = round(width * ratio);
        }
      }

      // Update ghost size
      dom.setStyles(selectedElmGhost, {
        width: width,
        height: height
      });

      // Update resize helper position
      resizeHelperX = selectedHandle.startPos.x + deltaX;
      resizeHelperY = selectedHandle.startPos.y + deltaY;
      resizeHelperX = resizeHelperX > 0 ? resizeHelperX : 0;
      resizeHelperY = resizeHelperY > 0 ? resizeHelperY : 0;

      dom.setStyles(resizeHelper, {
        left: resizeHelperX,
        top: resizeHelperY,
        display: 'block'
      });

      resizeHelper.innerHTML = width + ' &times; ' + height;

      // Update ghost X position if needed
      if (selectedHandle[2] < 0 && selectedElmGhost.clientWidth <= width) {
        dom.setStyle(selectedElmGhost, 'left', selectedElmX + (startW - width));
      }

      // Update ghost Y position if needed
      if (selectedHandle[3] < 0 && selectedElmGhost.clientHeight <= height) {
        dom.setStyle(selectedElmGhost, 'top', selectedElmY + (startH - height));
      }

      // Calculate how must overflow we got
      deltaX = rootElement.scrollWidth - startScrollWidth;
      deltaY = rootElement.scrollHeight - startScrollHeight;

      // Re-position the resize helper based on the overflow
      if (deltaX + deltaY !== 0) {
        dom.setStyles(resizeHelper, {
          left: resizeHelperX - deltaX,
          top: resizeHelperY - deltaY
        });
      }

      if (!resizeStarted) {
        editor.onObjectResizeStart.dispatch(editor, selectedElm, startW, startH);
        resizeStarted = true;
      }
    }

    function endGhostResize() {
      resizeStarted = false;

      function setSizeProp(name, value) {
        if (value) {
          // Resize by using style or attribute
          if (selectedElm.nodeName !== 'IMG') {
            dom.setStyle(selectedElm, name, value);
          } else {
            dom.setAttrib(selectedElm, name, value);
          }
        }
      }

      // Set width/height properties
      setSizeProp('width', width);
      setSizeProp('height', height);

      dom.unbind(editableDoc, 'mousemove touchmove', resizeGhostElement);
      dom.unbind(editableDoc, 'mouseup touchend', endGhostResize);

      if (rootDocument != editableDoc) {
        dom.unbind(rootDocument, 'mousemove touchmove', resizeGhostElement);
        dom.unbind(rootDocument, 'mouseup touchend', endGhostResize);
      }

      // Remove ghost/helper and update resize handle positions
      dom.remove(selectedElmGhost);
      dom.remove(resizeHelper);

      dom.removeClass(selectedElm, 'mce-resizing');

      if (!isIE || selectedElm.nodeName == "TABLE") {
        showResizeRect(selectedElm);
      }

      editor.onObjectResized.dispatch(editor, selectedElm, width, height);

      dom.setAttrib(selectedElm, 'style', dom.getAttrib(selectedElm, 'style'));
      editor.nodeChanged();
    }

    function showResizeRect(targetElm, mouseDownHandleName, mouseDownEvent) {
      var position, targetWidth, targetHeight, rect;

      hideResizeRect();
      unbindResizeHandleEvents();

      // Get position and size of target
      position = dom.getPos(targetElm, rootElement);
      selectedElmX = position.x;
      selectedElmY = position.y;
      rect = targetElm.getBoundingClientRect(); // Fix for Gecko offsetHeight for table with caption
      targetWidth = rect.width || (rect.right - rect.left);
      targetHeight = rect.height || (rect.bottom - rect.top);

      // Reset width/height if user selects a new image/table
      if (selectedElm != targetElm) {
        detachResizeStartListener();
        selectedElm = targetElm;
        width = height = 0;
      }

      // Makes it possible to disable resizing
      editor.onObjectSelected.dispatch(editor, targetElm);

      if (isResizable(targetElm)) {
        each(resizeHandles, function (handle, name) {
          var handleElm;

          function startDrag(e) {
            startX = e.screenX;
            startY = e.screenY;
            startW = selectedElm.clientWidth;
            startH = selectedElm.clientHeight;
            ratio = startH / startW;
            selectedHandle = handle;

            handle.startPos = {
              x: targetWidth * handle[0] + selectedElmX,
              y: targetHeight * handle[1] + selectedElmY
            };

            startScrollWidth = rootElement.scrollWidth;
            startScrollHeight = rootElement.scrollHeight;

            // create clone as ghost of parent item only
            selectedElmGhost = selectedElm.cloneNode();
            dom.addClass(selectedElmGhost, 'mce-clonedresizable');
            dom.setAttrib(selectedElmGhost, 'data-mce-bogus', 'all');
            selectedElmGhost.contentEditable = false; // Hides IE move layer cursor
            selectedElmGhost.unSelectabe = true;

            dom.setStyles(selectedElmGhost, {
              left: selectedElmX,
              top: selectedElmY,
              margin: 0
            });

            // mark selectedElm
            dom.addClass(selectedElm, 'mce-resizing');

            selectedElmGhost.removeAttribute('data-mce-selected');
            rootElement.appendChild(selectedElmGhost);

            dom.bind(editableDoc, 'mousemove touchmove', resizeGhostElement);
            dom.bind(editableDoc, 'mouseup touchend', endGhostResize);

            if (rootDocument != editableDoc) {
              dom.bind(rootDocument, 'mousemove touchmove', resizeGhostElement);
              dom.bind(rootDocument, 'mouseup touchend', endGhostResize);
            }

            resizeHelper = dom.add(rootElement, 'div', {
              'class': 'mce-resize-helper',
              'data-mce-bogus': 'all'
            }, startW + ' &times; ' + startH);
          }

          if (mouseDownHandleName) {
            // Drag started by IE native resizestart
            if (name == mouseDownHandleName) {
              startDrag(mouseDownEvent);
            }

            return;
          }

          // Get existing or render resize handle
          handleElm = dom.get('mceResizeHandle' + name.toUpperCase());

          if (handleElm) {
            dom.remove(handleElm);
          }

          handleElm = dom.add(rootElement, 'div', {
            id: 'mceResizeHandle' + name.toUpperCase(),
            'data-mce-bogus': 'all',
            'class': 'mce-resizehandle mce-resizehandle-' + name,
            unselectable: true,
            style: 'cursor:' + name + '-resize;'
          });

          // Hides IE move layer cursor
          // If we set it on Chrome we get this wounderful bug: #6725
          // Edge doesn't have this issue however setting contenteditable
          // will move the selection to that element on Edge 17 see #TINY-1679
          if (isIE === 11) {
            handleElm.contentEditable = false;
          }

          dom.bind(handleElm, 'mousedown', function (e) {
            e.stopImmediatePropagation();
            e.preventDefault();
            startDrag(e);
          });

          handle.elm = handleElm;

          // Position element
          dom.setStyles(handleElm, {
            left: (targetWidth * handle[0] + selectedElmX) - (handleElm.offsetWidth / 2),
            top: (targetHeight * handle[1] + selectedElmY) - (handleElm.offsetHeight / 2)
          });
        });
      } else {
        hideResizeRect();
      }

      selectedElm.setAttribute('data-mce-selected', '1');
    }

    function hideResizeRect() {
      var name, handleElm;

      unbindResizeHandleEvents();

      if (selectedElm) {
        selectedElm.removeAttribute('data-mce-selected');
      }

      for (name in resizeHandles) {
        handleElm = dom.get('mceResizeHandle' + name.toUpperCase());
        if (handleElm) {
          dom.unbind(handleElm);
          dom.remove(handleElm);
        }
      }
    }

    function updateResizeRect(e) {
      var startElm, controlElm;

      function isChildOrEqual(node, parent) {
        if (node) {
          do {
            if (node === parent) {
              return true;
            }
          } while ((node = node.parentNode));
        }
      }

      // Ignore all events while resizing or if the editor instance was removed
      if (resizeStarted || editor.removed || editor !== ibis.activeEditor) {
        return;
      }

      // Remove data-mce-selected from all elements since they might have been copied using Ctrl+c/v
      each(dom.select('img[data-mce-selected][data-mce-resize],hr[data-mce-selected][data-mce-resize],span[data-mce-selected][data-mce-resize]'), function (img) {
        img.removeAttribute('data-mce-selected');
      });

      controlElm = e.type == 'mousedown' ? e.target : selection.getNode();
      controlElm = dom.closest(controlElm, isIE ? 'table' : 'table,img,[data-mce-resize]')[0];

      if (isChildOrEqual(controlElm, rootElement)) {
        disableGeckoResize();
        startElm = selection.getStart(true);

        if (isChildOrEqual(startElm, controlElm) && isChildOrEqual(selection.getEnd(true), controlElm)) {
          if (!isIE || (controlElm != startElm && startElm.nodeName !== 'IMG')) {
            showResizeRect(controlElm);
            return;
          }
        }
      }

      hideResizeRect();
    }

    function attachEvent(elm, name, func) {
      if (elm && elm.attachEvent) {
        elm.attachEvent('on' + name, func);
      }
    }

    function detachEvent(elm, name, func) {
      if (elm && elm.detachEvent) {
        elm.detachEvent('on' + name, func);
      }
    }

    function resizeNativeStart(e) {
      var target = e.srcElement,
        pos, name, corner, cornerX, cornerY, relativeX, relativeY;

      pos = target.getBoundingClientRect();
      relativeX = lastMouseDownEvent.clientX - pos.left;
      relativeY = lastMouseDownEvent.clientY - pos.top;

      // Figure out what corner we are draging on
      for (name in resizeHandles) {
        corner = resizeHandles[name];

        cornerX = target.offsetWidth * corner[0];
        cornerY = target.offsetHeight * corner[1];

        if (abs(cornerX - relativeX) < 8 && abs(cornerY - relativeY) < 8) {
          selectedHandle = corner;
          break;
        }
      }

      // Remove native selection and let the magic begin
      resizeStarted = true;

      editor.onObjectResizeStart.dispatch(editor, selectedElm, selectedElm.clientWidth, selectedElm.clientHeight);

      editor.getDoc().selection.empty();
      showResizeRect(target, name, lastMouseDownEvent);
    }

    function preventDefault(e) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false; // IE
      }
    }

    function isWithinContentEditableFalse(elm) {
      return hasContentEditableState(getContentEditableRoot(editor.getBody(), elm), 'false');
    }

    function nativeControlSelect(e) {
      var target = e.srcElement;

      if (isWithinContentEditableFalse(target)) {
        preventDefault(e);
        return;
      }

      if (target != selectedElm) {
        editor.onObjectSelected.dispatch(editor, target);

        detachResizeStartListener();

        if (target.id.indexOf('mceResizeHandle') === 0) {
          e.returnValue = false;
          return;
        }

        if (target.nodeName == 'IMG' || target.nodeName == 'TABLE') {
          hideResizeRect();
          selectedElm = target;
          attachEvent(target, 'resizestart', resizeNativeStart);
        }
      }
    }

    function detachResizeStartListener() {
      detachEvent(selectedElm, 'resizestart', resizeNativeStart);
    }

    function unbindResizeHandleEvents() {
      for (var name in resizeHandles) {
        var handle = resizeHandles[name];

        if (handle.elm) {
          dom.unbind(handle.elm);
          delete handle.elm;
        }
      }
    }

    function disableGeckoResize() {
      try {
        // Disable object resizing on Gecko
        editor.getDoc().execCommand('enableObjectResizing', false, false);
      } catch (ex) {
        // Ignore
      }
    }

    function controlSelect(elm) {
      var ctrlRng;

      if (!isIE) {
        return;
      }

      ctrlRng = editableDoc.body.createControlRange();

      try {
        ctrlRng.addElement(elm);
        ctrlRng.select();
        return true;
      } catch (ex) {
        // Ignore since the element can't be control selected for example a P tag
      }
    }

    function selectControl(editor, e) {
      var target = e.target,
        nodeName = target.nodeName;

      if (!resizeStarted && /^(TABLE|IMG|HR)$/.test(nodeName) && !isWithinContentEditableFalse(target)) {
        editor.selection.select(target, nodeName == 'TABLE');

        // Only fire once since nodeChange is expensive
        if (e.type == 'mousedown') {
          editor.nodeChanged();
        }
      }
    }

    editor.onInit.add(function (editor) {
      if (isIE) {
        // Hide the resize rect on resize and reselect the image
        editor.onObjectResized.add(function (editor, e) {
          if (e.target.nodeName != 'TABLE') {
            hideResizeRect();
            controlSelect(e.target);
          }
        });

        attachEvent(rootElement, 'controlselect', nativeControlSelect);

        editor.onMouseDown.add(function (editor, e) {
          lastMouseDownEvent = e;
        });
      } else {
        disableGeckoResize();

        // Sniff sniff, hard to feature detect this stuff
        if (ibis.isIE >= 11 || ibis.isIE12) {
          // Needs to be click on Edge / WebKit to properly select images
          editor.onClick.add(selectControl);

          // Needs to be mousedown for drag/drop to work on IE 11
          editor.onMouseDown.add(selectControl);

          editor.dom.bind(rootElement, 'mscontrolselect', function (e) {
            function delayedSelect(node) {
              setTimeout(function () {
                editor.selection.select(node);
              }, 0);
            }

            if (isWithinContentEditableFalse(e.target)) {
              e.preventDefault();
              delayedSelect(e.target);
              return;
            }

            if (/^(TABLE|IMG|HR)$/.test(e.target.nodeName)) {
              e.preventDefault();

              // This moves the selection from being a control selection to a text like selection like in WebKit #6753
              // TODO: Fix this the day IE works like other browsers without this nasty native ugly control selections.
              if (e.target.tagName == 'IMG') {
                delayedSelect(e.target);
              }
            }
          });
        }
      }

      var throttledUpdateResizeRect = debounce(function (e) {
        updateResizeRect(e);
      });

      // Toogle resize when image is selected
      editor.onNodeChange.add(function () {        
        setTimeout(function () {
          throttledUpdateResizeRect({
            type: ''
          });
        }, 100);
      });

      // Toogle resize when image is dropped
      editor.dom.bind(editor.getBody(), 'drop', function (e) {
        throttledUpdateResizeRect(e);
      });

      // Remove resize rect when getting content from the editor
      editor.onBeforeGetContent.add(hideResizeRect);

      function updateTableRect(editor, e) {
        if (selectedElm && selectedElm.nodeName == "TABLE") {
          throttledUpdateResizeRect(e);
        }
      }

      // Update resize rect while typing in a table
      editor.onKeyUp.add(updateTableRect);

      // Don't update the resize rect while composing since it blows away the IME see: #2710
      editor.dom.bind(editor.getBody(), 'compositionend', function (e) {
        updateTableRect(editor, e);
      });

      editor.onBlur.add(hideResizeRect);
      editor.onHide.add(hideResizeRect);
    });

    editor.onRemove.add(unbindResizeHandleEvents);

    function destroy() {
      selectedElm = selectedElmGhost = null;

      if (isIE) {
        detachResizeStartListener();
        detachEvent(rootElement, 'controlselect', nativeControlSelect);
      }
    }

    return {
      isResizable: isResizable,
      showResizeRect: showResizeRect,
      hideResizeRect: hideResizeRect,
      updateResizeRect: updateResizeRect,
      controlSelect: controlSelect,
      destroy: destroy
    };
  };
})(ibis);