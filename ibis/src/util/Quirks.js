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
 * This file includes fixes for various browser quirks it's made to make it easy to add/remove browser specific fixes.
 */
ibis.util.Quirks = function (editor) {
  var VK = ibis.VK,
    BACKSPACE = VK.BACKSPACE,
    DELETE = VK.DELETE,
    dom = editor.dom,
    selection = editor.selection,
    settings = editor.settings,
    parser = editor.parser,
    each = ibis.each,
    RangeUtils = ibis.dom.RangeUtils,
    TreeWalker = ibis.dom.TreeWalker;

  var mceInternalUrlPrefix = 'data:text/mce-internal,';
  var mceInternalDataType = ibis.isIE ? 'Text' : 'URL';

  /**
   * Executes a command with a specific state this can be to enable/disable browser editing features.
   */
  function setEditorCommandState(cmd, state) {
    try {
      editor.getDoc().execCommand(cmd, false, state);
    } catch (ex) {
      // Ignore
    }
  }

  /**
   * Returns true/false if the event is prevented or not.
   *
   * @param {Event} e Event object.
   * @return {Boolean} true/false if the event is prevented or not.
   */
  function isDefaultPrevented(e) {
    return e.isDefaultPrevented();
  }

  /**
   * Sets Text/URL data on the event's dataTransfer object to a special data:text/mce-internal url.
   * This is to workaround the inability to set custom contentType on IE and Safari.
   * The editor's selected content is encoded into this url so drag and drop between editors will work.
   *
   * @private
   * @param {DragEvent} e Event object
   */
  function setMceInternalContent(e) {
    var selectionHtml, internalContent;

    if (e.dataTransfer) {
      if (editor.selection.isCollapsed() && e.target.tagName == 'IMG') {
        selection.select(e.target);
      }

      selectionHtml = editor.selection.getContent();

      // Safari/IE doesn't support custom dataTransfer items so we can only use URL and Text
      if (selectionHtml.length > 0) {
        internalContent = mceInternalUrlPrefix + escape(editor.id) + ',' + escape(selectionHtml);
        e.dataTransfer.setData(mceInternalDataType, internalContent);
      }
    }
  }

  /**
   * Gets content of special data:text/mce-internal url on the event's dataTransfer object.
   * This is to workaround the inability to set custom contentType on IE and Safari.
   * The editor's selected content is encoded into this url so drag and drop between editors will work.
   *
   * @private
   * @param {DragEvent} e Event object
   * @returns {String} mce-internal content
   */
  function getMceInternalContent(e) {
    var internalContent;

    if (e.dataTransfer) {
      internalContent = e.dataTransfer.getData(mceInternalDataType);

      if (internalContent && internalContent.indexOf(mceInternalUrlPrefix) >= 0) {
        internalContent = internalContent.substr(mceInternalUrlPrefix.length).split(',');

        return {
          id: unescape(internalContent[0]),
          html: unescape(internalContent[1])
        };
      }
    }

    return null;
  }

  /**
   * Inserts contents using the paste clipboard command if it's available if it isn't it will fallback
   * to the core command.
   *
   * @private
   * @param {String} content Content to insert at selection.
   */
  function insertClipboardContents(content) {
    if (editor.queryCommandSupported('mceInsertClipboardContent')) {
      editor.execCommand('mceInsertClipboardContent', false, {
        content: content
      });
    } else {
      editor.execCommand('mceInsertContent', false, content);
    }
  }

  /**
   * Fixes a WebKit bug when deleting contents using backspace or delete key.
   * WebKit will produce a span element if you delete across two block elements.
   *
   * Example:
   * <h1>a</h1><p>|b</p>
   *
   * Will produce this on backspace:
   * <h1>a<span style="<all runtime styles>">b</span></p>
   *
   * This fixes the backspace to produce:
   * <h1>a|b</p>
   *
   * See bug: https://bugs.webkit.org/show_bug.cgi?id=45784
   *
   * This fixes the following delete scenarios:
   *  1. Delete by pressing backspace key.
   *  2. Delete by pressing delete key.
   *  3. Delete by pressing backspace key with ctrl/cmd (Word delete).
   *  4. Delete by pressing delete key with ctrl/cmd (Word delete).
   *  5. Delete by drag/dropping contents inside the editor.
   *  6. Delete by using Cut Ctrl+X/Cmd+X.
   *  7. Delete by selecting contents and writing a character.
   *
   * This code is a ugly hack since writing full custom delete logic for just this bug
   * fix seemed like a huge task. I hope we can remove this before the year 2030.
   */
  function cleanupStylesWhenDeleting() {
    var dom = editor.dom,
      selection = editor.selection;
    var MutationObserver = window.MutationObserver;

    function isTrailingBr(node) {
      var blockElements = dom.schema.getBlockElements(),
        rootNode = dom.getRoot();

      if (node.nodeName != 'BR') {
        return false;
      }

      for (; node != rootNode && !blockElements[node.nodeName]; node = node.parentNode) {
        if (node.nextSibling) {
          return false;
        }
      }

      return true;
    }

    function isSiblingsIgnoreWhiteSpace(node1, node2) {
      var node;

      for (node = node1.nextSibling; node && node != node2; node = node.nextSibling) {
        if (node.nodeType == 3 && ibis.trim(node.data).length === 0) {
          continue;
        }

        if (node !== node2) {
          return false;
        }
      }

      return node === node2;
    }

    function findCaretNode(node, forward, startNode) {
      var walker, current, nonEmptyElements, rootNode = dom.getRoot();

      // Protect against the possibility we are asked to find a caret node relative
      // to a node that is no longer in the DOM tree. In this case attempting to
      // select on any match leads to a scenario where selection is completely removed
      // from the editor. This scenario is met in real world at a minimum on
      // WebKit browsers when selecting all and Cmd-X cutting to delete content.
      if (!dom.isChildOf(node, rootNode)) {
        return;
      }

      nonEmptyElements = dom.schema.getNonEmptyElements();

      walker = new TreeWalker(startNode || node, node);

      while ((current = walker[forward ? 'next' : 'prev']())) {
        if (nonEmptyElements[current.nodeName] && !isTrailingBr(current)) {
          return current;
        }

        if (current.nodeType == 3 && current.data.length > 0) {
          return current;
        }
      }
    }

    function deleteRangeBetweenTextBlocks(rng) {
      var startBlock, endBlock, caretNodeBefore, caretNodeAfter, textBlockElements;

      if (rng.collapsed) {
        return;
      }

      startBlock = dom.getParent(RangeUtils.getNode(rng.startContainer, rng.startOffset), dom.isBlock);
      endBlock = dom.getParent(RangeUtils.getNode(rng.endContainer, rng.endOffset), dom.isBlock);
      textBlockElements = editor.schema.getTextBlockElements();

      if (startBlock == endBlock) {
        return;
      }

      if (!textBlockElements[startBlock.nodeName] || !textBlockElements[endBlock.nodeName]) {
        return;
      }

      if (dom.getContentEditable(startBlock) === "false" || dom.getContentEditable(endBlock) === "false") {
        return;
      }

      rng.deleteContents();

      caretNodeBefore = findCaretNode(startBlock, false);
      caretNodeAfter = findCaretNode(endBlock, true);

      // backspace from the beginning of one block element into the previous block element...
      if (caretNodeBefore && caretNodeAfter) {
        if (!dom.isEmpty(endBlock)) {
          var nodes = ibis.toArray(endBlock.childNodes);

          each(nodes, function (node) {
            if (node && node.nodeType) {
              startBlock.appendChild(node);
            }
          });
        }

        dom.remove(endBlock);
      }

      // remove block elment only if it is empty
      each([startBlock, endBlock], function (node) {
        if (dom.isEmpty(node)) {
          dom.remove(node);
        }
      });

      if (caretNodeBefore) {
        if (caretNodeBefore.nodeType == 1) {
          if (caretNodeBefore.nodeName == "BR") {
            rng.setStartBefore(caretNodeBefore);
            rng.setEndBefore(caretNodeBefore);
          } else {
            rng.setStartAfter(caretNodeBefore);
            rng.setEndAfter(caretNodeBefore);
          }
        } else {
          rng.setStart(caretNodeBefore, caretNodeBefore.data.length);
          rng.setEnd(caretNodeBefore, caretNodeBefore.data.length);
        }
      } else if (caretNodeAfter) {
        if (caretNodeAfter.nodeType == 1) {
          rng.setStartBefore(caretNodeAfter);
          rng.setEndBefore(caretNodeAfter);
        } else {
          rng.setStart(caretNodeAfter, 0);
          rng.setEnd(caretNodeAfter, 0);
        }
      }

      selection.setRng(rng);

      return true;
    }

    function expandBetweenBlocks(rng, isForward) {
      var caretNode, targetCaretNode, textBlock, targetTextBlock, container, offset;

      if (!rng.collapsed) {
        return rng;
      }

      container = rng.startContainer;
      offset = rng.startOffset;

      if (container.nodeType == 3) {
        if (isForward) {
          if (offset < container.data.length) {
            return rng;
          }
        } else {
          if (offset > 0) {
            return rng;
          }
        }
      }

      caretNode = RangeUtils.getNode(container, offset);
      textBlock = dom.getParent(caretNode, dom.isBlock);
      targetCaretNode = findCaretNode(editor.getBody(), isForward, caretNode);
      targetTextBlock = dom.getParent(targetCaretNode, dom.isBlock);
      var isAfter = container.nodeType === 1 && offset > container.childNodes.length - 1;

      if (!caretNode || !targetCaretNode) {
        return rng;
      }

      if (targetTextBlock && textBlock != targetTextBlock) {
        if (!isForward) {
          if (!isSiblingsIgnoreWhiteSpace(targetTextBlock, textBlock)) {
            return rng;
          }

          if (targetCaretNode.nodeType == 1) {
            if (targetCaretNode.nodeName == "BR") {
              rng.setStartBefore(targetCaretNode);
            } else {
              rng.setStartAfter(targetCaretNode);
            }
          } else {
            rng.setStart(targetCaretNode, targetCaretNode.data.length);
          }

          if (caretNode.nodeType == 1) {
            if (isAfter) {
              rng.setEndAfter(caretNode);
            } else {
              rng.setEndBefore(caretNode);
            }
          } else {
            rng.setEndBefore(caretNode);
          }
        } else {
          if (!isSiblingsIgnoreWhiteSpace(textBlock, targetTextBlock)) {
            return rng;
          }

          if (caretNode.nodeType == 1) {
            if (caretNode.nodeName == "BR") {
              rng.setStartBefore(caretNode);
            } else {
              rng.setStartAfter(caretNode);
            }
          } else {
            rng.setStart(caretNode, caretNode.data.length);
          }

          if (targetCaretNode.nodeType == 1) {
            rng.setEnd(targetCaretNode, 0);
          } else {
            rng.setEndBefore(targetCaretNode);
          }
        }
      }

      return rng;
    }

    function handleTextBlockMergeDelete(isForward) {
      var rng = selection.getRng();

      rng = expandBetweenBlocks(rng, isForward);

      if (deleteRangeBetweenTextBlocks(rng)) {
        return true;
      }
    }

    /**
     * This retains the formatting if the last character is to be deleted.
     *
     * Backspace on this: <p><b><i>a|</i></b></p> would become <p>|</p> in WebKit.
     * With this patch: <p><b><i>|<br></i></b></p>
     */
    function handleLastBlockCharacterDelete(isForward, rng) {
      var path, blockElm, newBlockElm, clonedBlockElm, sibling,
        container, offset, br, currentFormatNodes;

      function cloneTextBlockWithFormats(blockElm, node) {
        currentFormatNodes = dom.getParents(node, function (n) {
          return !!editor.schema.getTextInlineElements()[n.nodeName];
        });

        newBlockElm = blockElm.cloneNode(false);

        currentFormatNodes = ibis.map(currentFormatNodes, function (formatNode) {
          formatNode = formatNode.cloneNode(false);

          if (newBlockElm.hasChildNodes()) {
            formatNode.appendChild(newBlockElm.firstChild);
            newBlockElm.appendChild(formatNode);
          } else {
            newBlockElm.appendChild(formatNode);
          }

          newBlockElm.appendChild(formatNode);

          return formatNode;
        });

        if (currentFormatNodes.length) {
          br = dom.create('br');
          currentFormatNodes[0].appendChild(br);
          dom.replace(newBlockElm, blockElm);

          rng.setStartBefore(br);
          rng.setEndBefore(br);
          editor.selection.setRng(rng);

          return br;
        }

        return null;
      }

      function isTextBlock(node) {
        return node && editor.schema.getTextBlockElements()[node.tagName];
      }

      function NodePathCreate(rootNode, targetNode, normalized) {
        var path = [];

        for (; targetNode && targetNode != rootNode; targetNode = targetNode.parentNode) {
          path.push(ibis.DOM.nodeIndex(targetNode, normalized));
        }

        return path;
      }

      function NodePathResolve(rootNode, path) {
        var i, node, children;

        for (node = rootNode, i = path.length - 1; i >= 0; i--) {
          children = node.childNodes;

          if (path[i] > children.length - 1) {
            return null;
          }

          node = children[path[i]];
        }

        return node;
      }

      if (!rng.collapsed) {
        return;
      }

      container = rng.startContainer;
      offset = rng.startOffset;
      blockElm = dom.getParent(container, dom.isBlock);
      if (!isTextBlock(blockElm)) {
        return;
      }

      if (container.nodeType == 1) {
        container = container.childNodes[offset];
        if (container && container.tagName != 'BR') {
          return;
        }

        if (isForward) {
          sibling = blockElm.nextSibling;
        } else {
          sibling = blockElm.previousSibling;
        }

        if (dom.isEmpty(blockElm) && isTextBlock(sibling) && dom.isEmpty(sibling)) {
          if (cloneTextBlockWithFormats(blockElm, container)) {
            dom.remove(sibling);
            return true;
          }
        }
      } else if (container.nodeType == 3) {
        path = NodePathCreate(blockElm, container);
        clonedBlockElm = blockElm.cloneNode(true);
        container = NodePathResolve(clonedBlockElm, path);

        if (isForward) {
          if (offset >= container.data.length) {
            return;
          }

          container.deleteData(offset, 1);
        } else {
          if (offset <= 0) {
            return;
          }

          container.deleteData(offset - 1, 1);
        }

        if (dom.isEmpty(clonedBlockElm)) {
          return cloneTextBlockWithFormats(blockElm, container);
        }
      }
    }

    function customDelete(isForward) {
      var mutationObserver, rng, caretElement, rootNode = editor.dom.getRoot();

      if (handleTextBlockMergeDelete(isForward)) {
        return;
      }

      ibis.each(rootNode.getElementsByTagName('*'), function (elm) {
        // Mark existing spans
        if (elm.tagName == 'SPAN') {
          elm.setAttribute('data-mce-marked', 1);
        }

        // Make sure all elements has a data-mce-style attribute
        if (!elm.hasAttribute('data-mce-style') && elm.hasAttribute('style')) {
          editor.dom.setAttrib(elm, 'style', editor.dom.getAttrib(elm, 'style'));
        }
      });

      // Observe added nodes and style attribute changes
      mutationObserver = new MutationObserver(function () { });
      mutationObserver.observe(editor.getDoc(), {
        childList: true,
        attributes: true,
        subtree: true,
        attributeFilter: ['style']
      });

      editor.getDoc().execCommand(isForward ? 'ForwardDelete' : 'Delete', false, null);

      rng = editor.selection.getRng();
      caretElement = rng.startContainer.parentNode;

      ibis.each(mutationObserver.takeRecords(), function (record) {
        if (!dom.isChildOf(record.target, rootNode)) {
          return;
        }

        // Restore style attribute to previous value
        if (record.attributeName == "style") {
          var oldValue = record.target.getAttribute('data-mce-style');

          if (oldValue) {
            record.target.setAttribute("style", oldValue);
          } else {
            record.target.removeAttribute("style");
          }
        }

        // Remove all spans that aren't marked and retain selection
        ibis.each(record.addedNodes, function (node) {
          if (node.nodeType !== 1) {
            return true;
          }

          // remove new runtime style attributes on addedNodes
          if (node.getAttribute('style') && !node.getAttribute('data-mce-style')) {
            node.removeAttribute("style");
          }

          if (node.nodeName == "SPAN" && !node.getAttribute('data-mce-marked')) {
            var offset, container;

            if (node == caretElement) {
              offset = rng.startOffset;
              container = node.firstChild;
            }

            dom.remove(node, true);

            if (container) {
              rng.setStart(container, offset);
              rng.setEnd(container, offset);
              editor.selection.setRng(rng);
            }
          }
        });
      });

      mutationObserver.disconnect();

      // Remove any left over marks
      ibis.each(editor.dom.select('span[data-mce-marked]', editor.dom.getRoot()), function (span) {
        span.removeAttribute('data-mce-marked');
      });
    }

    editor.onKeyDown.add(function (editor, e) {
      var isForward = e.keyCode == DELETE,
        isMetaOrCtrl = e.ctrlKey || e.metaKey;

      if (!isDefaultPrevented(e) && (isForward || e.keyCode == BACKSPACE)) {
        var rng = editor.selection.getRng(),
          container = rng.startContainer,
          offset = rng.startOffset;

        // Shift+Delete is cut
        if (isForward && e.shiftKey) {
          return;
        }

        if (handleLastBlockCharacterDelete(isForward, rng)) {
          e.preventDefault();
          return;
        }

        // Ignore non meta delete in the where there is text before/after the caret
        if (!isMetaOrCtrl && rng.collapsed && container.nodeType == 3) {
          if (isForward ? offset < container.data.length : offset > 0) {
            return;
          }
        }

        e.preventDefault();

        if (isMetaOrCtrl) {
          editor.selection.getSel().modify("extend", isForward ? "forward" : "backward", e.metaKey ? "lineboundary" : "word");
        }

        customDelete(isForward);
      }
    });

    // Handle case where text is deleted by typing over
    /*editor.onKeyPress.add(function (editor, e) {
      if (!isDefaultPrevented(e) && !selection.isCollapsed() && e.charCode > 31 && !VK.metaKeyPressed(e)) {
        var rng, currentFormatNodes, fragmentNode, blockParent, caretNode, charText;

        if (editor.settings.forced_root_block === false) {
          return;
        }

        rng = editor.selection.getRng();
        charText = String.fromCharCode(e.charCode);
        e.preventDefault();

        // Keep track of current format nodes
        currentFormatNodes = dom.getParents(rng.startContainer, function (node) {
          return !!editor.schema.getTextInlineElements()[node.nodeName];
        });

        customDelete(true);

        // Check if the browser removed them
        currentFormatNodes = currentFormatNodes.filter(function (idx, node) {
          return !editor.getBody().contains(node);
        });

        // Then re-add them
        if (currentFormatNodes.length) {
          fragmentNode = dom.createFragment();

          currentFormatNodes.each(function (idx, formatNode) {
            formatNode = formatNode.cloneNode(false);

            if (fragmentNode.hasChildNodes()) {
              formatNode.appendChild(fragmentNode.firstChild);
              fragmentNode.appendChild(formatNode);
            } else {
              caretNode = formatNode;
              fragmentNode.appendChild(formatNode);
            }

            fragmentNode.appendChild(formatNode);
          });

          caretNode.appendChild(editor.getDoc().createTextNode(charText));

          // Prevent edge case where older WebKit would add an extra BR element
          blockParent = dom.getParent(rng.startContainer, dom.isBlock);
          if (dom.isEmpty(blockParent)) {
            dom.empty(blockParent);
            dom.add(blockParent, fragmentNode);
          } else {
            rng.insertNode(fragmentNode);
          }

          rng.setStart(caretNode.firstChild, 1);
          rng.setEnd(caretNode.firstChild, 1);
          editor.selection.setRng(rng);
        } else {
          editor.selection.setContent(charText);
        }
      }
    });*/

    editor.addCommand('Delete', function () {
      customDelete();
    });

    editor.addCommand('ForwardDelete', function () {
      customDelete(true);
    });
  }

  /**
   * Remove runtime styles from Chrome / Safari, eg: <span style="color: inherit; font-family: inherit; font-size: 1rem;">
   */
  function cleanupRuntimeStyles() {
    function removeRuntimeStyle(node) {
      var style = node.attr('style');

      if (style) {
        style = style.replace(/\s/g, '');

        if (style === 'color:inherit;font-family:inherit;font-size:1rem;') {
          node.unwrap();
        }
      }
    }

    editor.parser.addNodeFilter('span', function (nodes) {
      var i = nodes.length,
        node;
      while (i--) {
        node = nodes[i];
        removeRuntimeStyle(node);
      }
    });

    editor.serializer.addNodeFilter('span', function (nodes) {
      var i = nodes.length,
        node;
      while (i--) {
        node = nodes[i];
        removeRuntimeStyle(node);
      }
    });
  }

  /**
   * Makes sure that the editor body becomes empty when backspace or delete is pressed in empty editors.
   *
   * For example:
   * <p><b>|</b></p>
   *
   * Or:
   * <h1>|</h1>
   *
   * Or:
   * [<h1></h1>]
   */
  function emptyEditorWhenDeleting() {
    function serializeRng(rng) {
      var body = dom.create("body");
      var contents = rng.cloneContents();
      body.appendChild(contents);
      return selection.serializer.serialize(body, {
        format: 'html'
      });
    }

    function allContentsSelected(rng) {
      if (!rng.setStart) {
        if (rng.item) {
          return false;
        }

        var bodyRng = rng.duplicate();
        bodyRng.moveToElementText(editor.getBody());
        return RangeUtils.compareRanges(rng, bodyRng);
      }

      var selection = serializeRng(rng);

      var allRng = dom.createRng();
      allRng.selectNode(editor.getBody());

      var allSelection = serializeRng(allRng);
      return selection === allSelection;
    }

    editor.onKeyDown.add(function (editor, e) {
      var keyCode = e.keyCode,
        isCollapsed, root;

      // Empty the editor if it's needed for example backspace at <p><b>|</b></p>
      if (!isDefaultPrevented(e) && (keyCode == DELETE || keyCode == BACKSPACE)) {
        isCollapsed = editor.selection.isCollapsed();
        root = dom.getRoot();//editor.getBody();

        // Selection is collapsed but the editor isn't empty
        if (isCollapsed && !dom.isEmpty(root)) {
          return;
        }

        // Selection isn't collapsed but not all the contents is selected
        if (!isCollapsed && !allContentsSelected(editor.selection.getRng())) {
          return;
        }

        // Manually empty the editor
        e.preventDefault();
        editor.setContent('');

        if (root.firstChild && dom.isBlock(root.firstChild)) {
          editor.selection.setCursorLocation(root.firstChild, 0);
        } else {
          editor.selection.setCursorLocation(root, 0);
        }

        editor.nodeChanged();
      }
    });
  }

  /**
   * WebKit doesn't select all the nodes in the body when you press Ctrl+A.
   * This selects the whole body so that backspace/delete logic will delete everything
   */
  function selectAll() {
    editor.onKeyDown.add(function (editor, e) {
      if (!isDefaultPrevented(e) && e.keyCode == 65 && VK.metaKeyPressed(e)) {
        e.preventDefault();
        editor.execCommand('SelectAll');
      }
    });
  }

  /**
   * WebKit has a weird issue where it some times fails to properly convert keypresses to input method keystrokes.
   * The IME on Mac doesn't initialize when it doesn't fire a proper focus event.
   *
   * This seems to happen when the user manages to click the documentElement element then the window doesn't get proper focus until
   * you enter a character into the editor.
   *
   * It also happens when the first focus in made to the body.
   *
   * See: https://bugs.webkit.org/show_bug.cgi?id=83566
   */
  function inputMethodFocus() {
    if (!editor.settings.content_editable) {
      // Case 1 IME doesn't initialize if you focus the document
      // Disabled since it was interferring with the cE=false logic
      // Also coultn't reproduce the issue on Safari 9
      /*dom.bind(editor.getDoc(), 'focusin', function() {
        selection.setRng(selection.getRng());
      });*/

      // Case 2 IME doesn't initialize if you click the documentElement it also doesn't properly fire the focusin event
      // Needs to be both down/up due to weird rendering bug on Chrome Windows
      dom.bind(editor.getDoc(), 'mousedown mouseup', function (e) {
        var rng;

        if (e.target == editor.getDoc().documentElement) {
          rng = selection.getRng();
          editor.getBody().focus();

          if (e.type == 'mousedown') {
            /*if (CaretContainer.isCaretContainer(rng.startContainer)) {
              return;
            }*/

            // Edge case for mousedown, drag select and mousedown again within selection on Chrome Windows to render caret
            selection.placeCaretAt(e.clientX, e.clientY);
          } else {
            selection.setRng(rng);
          }
        }
      });
    }
  }

  /**
   * Backspacing in FireFox/IE from a paragraph into a horizontal rule results in a floating text node because the
   * browser just deletes the paragraph - the browser fails to merge the text node with a horizontal rule so it is
   * left there. TinyMCE sees a floating text node and wraps it in a paragraph on the key up event (ForceBlocks.js
   * addRootBlocks), meaning the action does nothing. With this code, FireFox/IE matche the behaviour of other
   * browsers.
   *
   * It also fixes a bug on Firefox where it's impossible to delete HR elements.
   */
  function removeHrOnBackspace() {
    editor.onKeyDown.add(function (editor, e) {
      if (!isDefaultPrevented(e) && e.keyCode === BACKSPACE) {
        // Check if there is any HR elements this is faster since getRng on IE 7 & 8 is slow
        if (!editor.getBody().getElementsByTagName('hr').length) {
          return;
        }

        if (selection.isCollapsed() && selection.getRng(true).startOffset === 0) {
          var node = selection.getNode();
          var previousSibling = node.previousSibling;

          if (node.nodeName == 'HR') {
            dom.remove(node);
            e.preventDefault();
            return;
          }

          if (previousSibling && previousSibling.nodeName && previousSibling.nodeName.toLowerCase() === "hr") {
            dom.remove(previousSibling);
            e.preventDefault();
          }
        }
      }
    });
  }

  /**
   * Fixes a Gecko bug where the style attribute gets added to the wrong element when deleting between two block elements.
   *
   * Fixes do backspace/delete on this:
   * <p>bla[ck</p><p style="color:red">r]ed</p>
   *
   * Would become:
   * <p>bla|ed</p>
   *
   * Instead of:
   * <p style="color:red">bla|ed</p>
   */
  function removeStylesWhenDeletingAcrossBlockElements() {
    function getAttributeApplyFunction() {
      var template = dom.getAttribs(selection.getStart().cloneNode(false));

      return function () {
        var target = selection.getStart();

        if (target !== dom.getRoot()) {
          dom.setAttrib(target, "style", null);

          each(template, function (attr) {
            target.setAttributeNode(attr.cloneNode(true));
          });
        }
      };
    }

    function isSelectionAcrossElements() {
      return !selection.isCollapsed() &&
        dom.getParent(selection.getStart(), dom.isBlock) != dom.getParent(selection.getEnd(), dom.isBlock);
    }

    editor.onKeyPress.add(function (editor, e) {
      var applyAttributes;

      if (!isDefaultPrevented(e) && (e.keyCode == 8 || e.keyCode == 46) && isSelectionAcrossElements()) {
        applyAttributes = getAttributeApplyFunction();
        editor.getDoc().execCommand('delete', false, null);
        applyAttributes();
        e.preventDefault();
        return false;
      }
    });

    dom.bind(editor.getDoc(), 'cut', function (e) {
      var applyAttributes;

      if (!isDefaultPrevented(e) && isSelectionAcrossElements()) {
        applyAttributes = getAttributeApplyFunction();

        setTimeout(function () {
          applyAttributes();
        }, 0);
      }
    });
  }

  /**
   * Fire a nodeChanged when the selection is changed on WebKit this fixes selection issues on iOS5. It only fires the nodeChange
   * event every 50ms since it would other wise update the UI when you type and it hogs the CPU.
   */
  /*function selectionChangeNodeChanged() {
    var lastRng, selectionTimer;

    dom.bind(editor.getDoc(), 'selectionchange', function () {
      if (selectionTimer) {
        clearTimeout(selectionTimer);
        selectionTimer = 0;
      }

      selectionTimer = window.setTimeout(function () {
        var rng = selection.getRng();

        // Compare the ranges to see if it was a real change or not
        if (!lastRng || !ibis.dom.RangeUtils.compareRanges(rng, lastRng)) {
          editor.nodeChanged();
          lastRng = rng;
        }
      }, 50);
    });
  }*/

  /**
   * Backspacing into a table behaves differently depending upon browser type.
   * Therefore, disable Backspace when cursor immediately follows a table.
   */
  function disableBackspaceIntoATable() {
    editor.onKeyDown.add(function (editor, e) {
      if (!isDefaultPrevented(e) && e.keyCode === BACKSPACE) {
        if (selection.isCollapsed() && selection.getRng(true).startOffset === 0) {
          var previousSibling = selection.getNode().previousSibling;
          if (previousSibling && previousSibling.nodeName && previousSibling.nodeName.toLowerCase() === "table") {
            e.preventDefault();
            return false;
          }
        }
      }
    });
  }

  /**
   * Backspace or delete on WebKit will combine all visual styles in a span if the last character is deleted.
   *
   * For example backspace on:
   * <p><b>x|</b></p>
   *
   * Will produce:
   * <p><span style="font-weight: bold">|<br></span></p>
   *
   * When it should produce:
   * <p><b>|<br></b></p>
   *
   * See: https://bugs.webkit.org/show_bug.cgi?id=81656
   */
  /*function keepInlineElementOnDeleteBackspace() {
    editor.onKeyDown.add(function (editor, e) {
      var isDelete, rng, container, offset, brElm, sibling, collapsed;

      isDelete = e.keyCode == DELETE;
      if (!isDefaultPrevented(e) && (isDelete || e.keyCode == BACKSPACE) && !VK.modifierPressed(e)) {
        rng = selection.getRng();
        container = rng.startContainer;
        offset = rng.startOffset;
        collapsed = rng.collapsed;

        // Override delete if the start container is a text node and is at the beginning of text or
        // just before/after the last character to be deleted in collapsed mode
        if (container.nodeType == 3 && container.nodeValue.length > 0 && ((offset === 0 && !collapsed) || (collapsed && offset === (isDelete ? 0 : 1)))) {
          // Edge case when deleting <p><b><img> |x</b></p>
          sibling = container.previousSibling;
          if (sibling && sibling.nodeName == "IMG") {
            return;
          }

          nonEmptyElements = editor.schema.getNonEmptyElements();

          // Prevent default logic since it's broken
          e.preventDefault();

          // Insert a BR before the text node this will prevent the containing element from being deleted/converted
          brElm = dom.create('br', {
            id: '__tmp'
          });
          container.parentNode.insertBefore(brElm, container);

          // Do the browser delete
          editor.getDoc().execCommand(isDelete ? 'ForwardDelete' : 'Delete', false, null);

          // Check if the previous sibling is empty after deleting for example: <p><b></b>|</p>
          container = selection.getRng().startContainer;
          sibling = container.previousSibling;
          if (sibling && sibling.nodeType == 1 && !dom.isBlock(sibling) && dom.isEmpty(sibling) && !nonEmptyElements[sibling.nodeName.toLowerCase()]) {
            dom.remove(sibling);
          }

          // Remove the temp element we inserted
          dom.remove('__tmp');
        }
      }
    });
  }*/

  /**
   * Removes a blockquote when backspace is pressed at the beginning of it.
   *
   * For example:
   * <blockquote><p>|x</p></blockquote>
   *
   * Becomes:
   * <p>|x</p>
   */
  function removeBlockQuoteOnBackSpace() {
    // Add block quote deletion handler
    editor.onKeyDown.add(function (editor, e) {
      var rng, container, offset, root, parent;

      if (isDefaultPrevented(e) || e.keyCode != VK.BACKSPACE) {
        return;
      }

      rng = selection.getRng();
      container = rng.startContainer;
      offset = rng.startOffset;
      root = dom.getRoot();
      parent = container;

      if (!rng.collapsed || offset !== 0) {
        return;
      }

      while (parent && parent.parentNode && parent.parentNode.firstChild == parent && parent.parentNode != root) {
        parent = parent.parentNode;
      }

      // Is the cursor at the beginning of a blockquote?
      if (parent.tagName === 'BLOCKQUOTE') {
        // Remove the blockquote
        editor.formatter.toggle('blockquote', null, parent);

        // Move the caret to the beginning of container
        rng = dom.createRng();
        rng.setStart(container, 0);
        rng.setEnd(container, 0);
        selection.setRng(rng);
      }
    });
  }

  /**
   * Sets various Gecko editing options on mouse down and before a execCommand to disable inline table editing that is broken etc.
   */
  function setGeckoEditingOptions() {
    function setOpts() {
      setEditorCommandState("StyleWithCSS", false);
      setEditorCommandState("enableInlineTableEditing", false);

      if (!settings.object_resizing) {
        setEditorCommandState("enableObjectResizing", false);
      }
    }

    if (!settings.readonly) {
      editor.onBeforeExecCommand.add(setOpts);
      editor.onMouseDown.add(setOpts);
    }
  }

  /**
   * Fixes a gecko link bug, when a link is placed at the end of block elements there is
   * no way to move the caret behind the link. This fix adds a bogus br element after the link.
   *
   * For example this:
   * <p><b><a href="#">x</a></b></p>
   *
   * Becomes this:
   * <p><b><a href="#">x</a></b><br></p>
   */
  function addBrAfterLastLinks() {
    function fixLinks() {
      each(dom.select('a'), function (node) {
        var parentNode = node.parentNode,
          root = dom.getRoot();

        if (parentNode.lastChild === node) {
          while (parentNode && !dom.isBlock(parentNode)) {
            if (parentNode.parentNode.lastChild !== parentNode || parentNode === root) {
              return;
            }

            parentNode = parentNode.parentNode;
          }

          dom.add(parentNode, 'br', {
            'data-mce-bogus': 1
          });
        }
      });
    }

    editor.onExecCommand.add(function (editor, cmd) {
      if (cmd === 'mceInsertLink') {
        fixLinks(editor);
      }
    });

    editor.onSetContent.add(selection.onSetContent.add(fixLinks));
  }

  /**
   * WebKit will produce DIV elements here and there by default. But since TinyMCE uses paragraphs by
   * default we want to change that behavior.
   */
  function setDefaultBlockType() {
    if (settings.forced_root_block) {
      editor.onInit.add(function () {
        setEditorCommandState('DefaultParagraphSeparator', settings.forced_root_block);
      });
    }
  }

  /**
   * Forces Gecko to render a broken image icon if it fails to load an image.
   */
  function showBrokenImageIcon() {
    editor.contentStyles.push(
      'img:-moz-broken {' +
      '-moz-force-broken-image-icon:1;' +
      'min-width:24px;' +
      'min-height:24px' +
      '}'
    );
  }

  /**
   * iOS has a bug where it's impossible to type if the document has a touchstart event
   * bound and the user touches the document while having the on screen keyboard visible.
   *
   * The touch event moves the focus to the parent document while having the caret inside the iframe
   * this fix moves the focus back into the iframe document.
   */
  function restoreFocusOnKeyDown() {
    editor.onKeyDown.add(function () {
      if (document.activeElement == document.body) {
        editor.getWin().focus();
      }
    });
  }

  /**
   * IE 11 has an annoying issue where you can't move focus into the editor
   * by clicking on the white area HTML element. We used to be able to to fix this with
   * the fixCaretSelectionOfDocumentElementOnIe fix. But since M$ removed the selection
   * object it's not possible anymore. So we need to hack in a ungly CSS to force the
   * body to be at least 150px. If the user clicks the HTML element out side this 150px region
   * we simply move the focus into the first paragraph. Not ideal since you loose the
   * positioning of the caret but good enough for most cases.
   */
  function bodyHeight() {
    if (!editor.inline) {
      editor.contentStyles.push('body {min-height: 150px}');
      editor.onClick.add(function (editor, e) {
        var rng;

        if (e.target.nodeName == 'HTML') {
          // Edge seems to only need focus if we set the range
          // the caret will become invisible and moved out of the iframe!!
          if (ibis.isIE12) {
            editor.getBody().focus();
            return;
          }

          // Need to store away non collapsed ranges since the focus call will mess that up see #7382
          rng = editor.selection.getRng();
          editor.getBody().focus();
          editor.selection.setRng(rng);
          editor.selection.normalize();
          editor.nodeChanged();
        }
      });
    }
  }

  /**
   * Firefox on Mac OS will move the browser back to the previous page if you press CMD+Left arrow.
   * You might then loose all your work so we need to block that behavior and replace it with our own.
   */
  function blockCmdArrowNavigation() {
    if (ibis.isMac) {
      editor.onKeyDown.add(function (editor, e) {
        if (VK.metaKeyPressed(e) && !e.shiftKey && (e.keyCode == 37 || e.keyCode == 39)) {
          e.preventDefault();
          editor.selection.getSel().modify('move', e.keyCode == 37 ? 'backward' : 'forward', 'lineboundary');
        }
      });
    }
  }

  /**
   * Disables the autolinking in IE 9+ this is then re-enabled by the autolink plugin.
   */
  function disableAutoUrlDetect() {
    setEditorCommandState("AutoUrlDetect", false);
  }

  /**
   * iOS 7.1 introduced two new bugs:
   * 1) It's possible to open links within a contentEditable area by clicking on them.
   * 2) If you hold down the finger it will display the link/image touch callout menu.
   */
  function tapLinksAndImages() {
    editor.onClick.add(function (editor, e) {
      var elm = e.target;

      do {
        if (elm.tagName === 'A') {
          e.preventDefault();
          return;
        }
      } while ((elm = elm.parentNode));
    });

    editor.contentStyles.push('.mce-content-body {-webkit-touch-callout: none}');
  }

  /**
   * iOS Safari and possible other browsers have a bug where it won't fire
   * a click event when a contentEditable is focused. This function fakes click events
   * by using touchstart/touchend and measuring the time and distance travelled.
   */
  /*
  function touchClickEvent() {
    editor.on('touchstart', function(e) {
      var elm, time, startTouch, changedTouches;

      elm = e.target;
      time = new Date().getTime();
      changedTouches = e.changedTouches;

      if (!changedTouches || changedTouches.length > 1) {
        return;
      }

      startTouch = changedTouches[0];

      editor.once('touchend', function(e) {
        var endTouch = e.changedTouches[0], args;

        if (new Date().getTime() - time > 500) {
          return;
        }

        if (Math.abs(startTouch.clientX - endTouch.clientX) > 5) {
          return;
        }

        if (Math.abs(startTouch.clientY - endTouch.clientY) > 5) {
          return;
        }

        args = {
          target: elm
        };

        each('pageX pageY clientX clientY screenX screenY'.split(' '), function(key) {
          args[key] = endTouch[key];
        });

        args = editor.fire('click', args);

        if (!args.isDefaultPrevented()) {
          // iOS WebKit can't place the caret properly once
          // you bind touch events so we need to do this manually
          // TODO: Expand to the closest word? Touble tap still works.
          editor.selection.placeCaretAt(endTouch.clientX, endTouch.clientY);
          editor.nodeChanged();
        }
      });
    });
  }
  */

  /**
   * WebKit has a bug where it will allow forms to be submitted if they are inside a contentEditable element.
   * For example this: <form><button></form>
   */
  function blockFormSubmitInsideEditor() {
    editor.onInit.add(function () {
      editor.dom.bind(editor.getBody(), 'submit', function (e) {
        e.preventDefault();
      });
    });
  }

  /**
   * Sometimes WebKit/Blink generates BR elements with the Apple-interchange-newline class.
   *
   * Scenario:
   *  1) Create a table 2x2.
   *  2) Select and copy cells A2-B2.
   *  3) Paste and it will add BR element to table cell.
   */
  function removeAppleInterchangeBrs() {
    parser.addNodeFilter('br', function (nodes) {
      var i = nodes.length;

      while (i--) {
        if (nodes[i].attr('class') == 'Apple-interchange-newline') {
          nodes[i].remove();
        }
      }
    });
  }

  /**
   * IE cannot set custom contentType's on drag events, and also does not properly drag/drop between
   * editors. This uses a special data:text/mce-internal URL to pass data when drag/drop between editors.
   */
  function ieInternalDragAndDrop() {
    editor.dom.bind('dragstart', function (e) {
      setMceInternalContent(e);
    });

    editor.dom.bind('dragstart', function (e) {
      if (!isDefaultPrevented(e)) {
        var internalContent = getMceInternalContent(e);

        if (internalContent && internalContent.id != editor.id) {
          e.preventDefault();

          var rng = RangeUtils.getCaretRangeFromPoint(e.x, e.y, editor.getDoc());
          selection.setRng(rng);
          insertClipboardContents(internalContent.html);
        }
      }
    });
  }

  function imageFloatLinkBug() {
    editor.onBeforeExecCommand.add(function (ed, cmd) {
      // remove img styles
      if (cmd == 'mceInsertLink') {
        var se = ed.selection,
          n = se.getNode();

        // store class and style
        if (n && n.nodeName == 'IMG') {
          ed.dom.setAttrib(n, 'data-mce-style', n.style.cssText);
          n.style.cssText = null;
        }
      }
    });

    editor.onExecCommand.add(function (ed, cmd) {
      // restore img styles
      if (cmd == 'mceInsertLink') {
        var se = ed.selection,
          n = se.getNode();

        ibis.each(ed.dom.select('img[data-mce-style]', n), function (el) {
          if (el.parentNode.nodeName == 'A' && !el.style.cssText) {
            el.style.cssText = ed.dom.getAttrib(el, 'data-mce-style');
          }
        });
      }
    });
  }

  /**
   * WebKit has a bug where it isn't possible to select image, hr or anchor elements
   * by clicking on them so we need to fake that.
   */
  function selectControlElements() {
    editor.onClick.add(function (editor, e) {
      var target = e.target;

      function selectElm(e) {
        e.preventDefault();
        selection.select(target);
        editor.nodeChanged();
      }

      // Workaround for bug, http://bugs.webkit.org/show_bug.cgi?id=12250
      // WebKit can't even do simple things like selecting an image
      if (/^(IMG|HR)$/.test(target.nodeName) && dom.getContentEditableParent(target) !== "false") {
        selectElm(e);
      }

      if (target.nodeName == 'A' && dom.hasClass(target, 'mce-item-anchor')) {
        selectElm(e);
      }
    });
  }

  /**
   * Fixes selection issues where the caret can be placed between two inline elements like <b>a</b>|<b>b</b>
   * this fix will lean the caret right into the closest inline element.
   */
  function normalizeSelection() {
    var normalize = function (e) {
      if (e.keyCode != 65 || !VK.metaKeyPressed(e)) {
        selection.normalize();
      }
    };

    // Normalize selection for example <b>a</b><i>|a</i> becomes <b>a|</b><i>a</i> except for Ctrl+A since it selects everything
    editor.onKeyUp.addToTop(normalize);
    editor.onMouseUp.addToTop(normalize);
  }

  function inlineBoundary() {
    var marker;

    var Zwsp = ibis.text.Zwsp;
    var CaretPosition = ibis.caret.CaretPosition;
    var CaretContainer = ibis.caret.CaretContainer;
    var CaretWalker = ibis.caret.CaretWalker;

    function isBr(node) {
      return node && node.nodeType == 1 && node.nodeName == 'BR';
    }

    // Normalizes a CaretPosition so that a cursor sitting immediately after a
    // leading ZWSP (offset 1) is treated as offset 0 for start-boundary checks,
    // and a cursor sitting immediately before a trailing ZWSP (offset length-1)
    // is treated as offset length for end-boundary checks.
    function normalizePos(pos, forEnd) {
      var container = pos.container(), offset = pos.offset();
      if (container.nodeType == 3) {
        if (!forEnd && CaretContainer.startsWithCaretContainer(container) && offset === 1) {
          return new CaretPosition(container, 0);
        }
        if (forEnd && CaretContainer.endsWithCaretContainer(container) && offset === container.data.length - 1) {
          return new CaretPosition(container, container.data.length);
        }
      }
      return pos;
    }

    // Returns the relevant anchor/inline node if the cursor is at its start, null otherwise.
    // Uses CaretWalker so boundary detection is browser-agnostic — no offset-value assumptions.
    // When node is null, also detects the cursor positioned just before an <a>.
    function isCursorAtStart(rng, container, node) {
      if (node) {
        var pos = normalizePos(CaretPosition.fromRangeStart(rng), false);
        return new CaretWalker(node).prev(pos) === null ? node : null;
      }

      // node is null: cursor is outside any inline — check if it sits just before an <a>.
      if (container.nodeType == 3 && rng.startOffset >= container.data.length) {
        var nextSib = container.nextSibling;
        if (nextSib && nextSib.nodeName === 'A') {
          return nextSib;
        }
      } else if (container.nodeType == 1) {
        var nextChild = container.childNodes[rng.startOffset];
        if (nextChild && nextChild.nodeName === 'A') {
          return nextChild;
        }
      }

      return null;
    }

    function isCursorAtEnd(rng, container, node) {
      var pos = normalizePos(CaretPosition.fromRangeStart(rng), true);
      return new CaretWalker(node).next(pos) === null;
    }

    // Detects if the cursor is at the end of a matching inline element and repositions it
    // just outside. Returns true if the cursor was moved, false otherwise.
    function relocateCursorOutOfInline(selector) {
      var rng = selection.getRng(), container = rng.startContainer, node = container.parentNode;

      if (!node || node == editor.dom.getRoot()) {
        return false;
      }

      node = dom.getParent(node, selector);

      // When the browser positions the cursor in the element node itself (not a text child),
      // container.parentNode won't be the element, so also try from container directly.
      if (!node && container.nodeType == 1) {
        node = dom.getParent(container, selector);
      }

      if (!node) {
        return false;
      }

      if (!isCursorAtEnd(rng, container, node)) {
        return false;
      }

      marker = dom.create('span', { 'data-mce-type': "caret" }, '\uFEFF');

      // Insert marker immediately after the inline element (or after a trailing <br>).
      // Always use insertAdjacentElement so the marker lands right after the <a>,
      // whether it's the last child of its block or has siblings following it.
      var insertAfter = node;
      if (isBr(node.nextSibling) && node.nextSibling == node.parentNode.lastChild) {
        insertAfter = node.nextSibling;
      }

      insertAfter.insertAdjacentElement('afterend', marker);

      var newRng = dom.createRng();
      newRng.setStartAfter(marker);
      newRng.setEndAfter(marker);
      newRng.collapse();
      selection.setRng(newRng);

      dom.remove(marker);

      // nodeChange may not fire reliably after a programmatic range move, so
      // clear the boundary marker directly now that the cursor has left the element.
      dom.setAttrib(node, 'data-mce-selected', null);

      return true;
    }

    // Detects if the cursor is at the start of a matching inline element and repositions it
    // just before it. Returns true if the cursor was moved, false otherwise.
    function relocateCursorBeforeInline(selector) {
      var rng = selection.getRng(), container = rng.startContainer, node = container.parentNode;

      if (!node || node == editor.dom.getRoot()) {
        return false;
      }

      node = dom.getParent(node, selector);

      if (!node && container.nodeType == 1) {
        node = dom.getParent(container, selector);
      }

      if (!node) {
        return false;
      }

      if (!isCursorAtStart(rng, container, node)) {
        return false;
      }

      marker = dom.create('span', { 'data-mce-type': "caret" }, '\uFEFF');
      node.insertAdjacentElement('beforebegin', marker);

      var newRng = dom.createRng();
      newRng.setStartBefore(marker);
      newRng.setEndBefore(marker);
      selection.setRng(newRng);

      dom.remove(marker);

      // nodeChange may not fire reliably after a programmatic range move, so
      // clear the boundary marker directly now that the cursor has left the element.
      dom.setAttrib(node, 'data-mce-selected', null);

      return true;
    }

    function ensureZwspAtAnchorStart() {
      var rng = selection.getRng();

      if (!rng || !rng.collapsed) {
        return;
      }

      var container = rng.startContainer;
      var anchor = dom.getParent(container, 'a');

      // Find the anchor to act on: either we're inside one, or just before one.
      var targetAnchor = anchor || isCursorAtStart(rng, container, null);

      if (!targetAnchor) {
        return;
      }

      // If inside the anchor, confirm the cursor is at the logical start using
      // CaretWalker — no offset-value assumptions, works across Chrome and Gecko.
      if (anchor) {
        var pos = normalizePos(CaretPosition.fromRangeStart(rng), false);
        if (new CaretWalker(anchor).prev(pos) !== null) {
          return; // not at start
        }
      }

      // Ensure a leading ZWSP exists in the first text node so the browser treats
      // the position as unambiguously inside the element when typing.
      var firstText = null;
      var walker = new TreeWalker(targetAnchor, targetAnchor), current;
      while ((current = walker.next())) {
        if (current.nodeType == 3) {
          firstText = current;
          break;
        }
      }

      if (!firstText) {
        return;
      }

      if (!Zwsp.isZwsp(firstText.data[0])) {
        firstText.data = Zwsp.ZWSP + firstText.data;
      }

      // Only reposition the cursor when we're inside the anchor — if we came from
      // outside (adjacentAnchor case), the cursor stays in the adjacent text.
      if (anchor) {
        var newRng = dom.createRng();
        newRng.setStart(firstText, 1);
        newRng.setEnd(firstText, 1);
        selection.setRng(newRng);
      }
    }

    // Move caret past inline boundary elements on Left/Right Arrow and Enter.
    // Uses addToTop so the marker is removed before any other keydown handler runs.
    editor.onKeyDown.addToTop(function (editor, e) {
      dom.remove(marker);

      switch (e.keyCode) {
        case VK.RIGHT:
          if (relocateCursorOutOfInline('a,span[data-mce-item="font"]')) {
            e.preventDefault();
            editor.nodeChanged();
          }
          break;

        case VK.LEFT:
          if (relocateCursorBeforeInline('a,span[data-mce-item="font"]')) {
            e.preventDefault();
            editor.nodeChanged();
          }
          break;

        case VK.ENTER:
          // Reposition cursor outside the <a> before EnterKey splits the block,
          // but do NOT prevent default — Enter should still create a new paragraph.
          if (relocateCursorOutOfInline('a,span[data-mce-item="font"]')) {
            editor.nodeChanged();
          }
          break;
      }
    });

    editor.onMouseUp.add(function (editor, e) {
      dom.remove(marker);

      ensureZwspAtAnchorStart();

      if (relocateCursorOutOfInline('span[data-mce-item="font"]')) {
        editor.nodeChanged();
      }
    });

    // Chrome positions the cursor at {<a>, childNodes.length} or {lastTextNode, data.length}
    // when the caret is at the visual end of a link. At those ambiguous boundary positions,
    // Chrome inserts typed text outside the <a> even though the range appears to be inside.
    // beforeinput fires just before the insertion and selection changes made here ARE
    // respected — redirect the caret to the end of the last text node inside the link.
    if (ibis.isWebKit) {
      editor.onBeforeInput.add(function (editor, e) {

        if (e.inputType !== 'insertText') {
          return;
        }

        var rng = selection.getRng();

        if (!rng || !rng.collapsed) {
          return;
        }

        var container = rng.startContainer;
        var anchor = dom.getParent(container, 'a');

        // isCursorAtStart handles both cases: cursor inside the anchor at its start,
        // and cursor positioned just before the anchor (Chrome's start-boundary placement).
        // Pass anchor (may be null) — when null it performs the outside-detection itself.
        var startAnchor = isCursorAtStart(rng, container, anchor);

        if (startAnchor) {
          anchor = startAnchor;
        } else if (!anchor) {
          return;
        }

        startAnchor = false;

        // Find the first/last text node and redirect the insertion point there.
        var textNode = null;
        var walker = new TreeWalker(anchor, anchor), current;

        var anchorOffset;

        if (startAnchor) {
          // Walk FORWARD to find the first text node inside the anchor.
          while ((current = walker.next())) {
            if (current.nodeType == 3) {
              textNode = current;
              break;
            }
          }

          if (!textNode) {
            return;
          }

          if (textNode.data.length === 0 || textNode.data[0] !== Zwsp.ZWSP) {
            textNode.data = Zwsp.ZWSP + textNode.data;
          }

          // Position AFTER the leading ZWSP so Chrome inserts text inside the link
          // (symmetric to the end case which positions BEFORE the trailing ZWSP).
          anchorOffset = 1;
        } else if (isCursorAtEnd(rng, container, anchor)) {
          while ((current = walker.next())) {
            if (current.nodeType == 3) {
              textNode = current;
            }
          }

          if (!textNode) {
            return;
          }

          // Chrome treats {textNode, data.length} as an ambiguous boundary and may insert
          // typed text outside the inline element even though the range says inside.
          // Insert a ZWSP anchor at the end of the text so the cursor sits one position
          // before it — no longer at the boundary — and Chrome inserts before the ZWSP
          // (= inside the element).
          if (textNode.data.length === 0 || textNode.data[textNode.data.length - 1] !== Zwsp.ZWSP) {
            textNode.data += Zwsp.ZWSP;
          }

          anchorOffset = textNode.data.length - 1; // position before the ZWSP
        }

        if (!textNode) {
          return;
        }

        var newRng = dom.createRng();
        newRng.setStart(textNode, anchorOffset);
        newRng.setEnd(textNode, anchorOffset);
        selection.setRng(newRng);
      });
    }

    // Safety net: clear the boundary attribute on arrow keyUp in case nodeChange
    // didn't fire (e.g. browser-native exit from the element without a synthetic
    // nodeChange being dispatched).
    editor.onKeyUp.add(function (_editor, e) {
      if (e.keyCode === VK.LEFT || e.keyCode === VK.RIGHT) {
        ensureZwspAtAnchorStart();

        var currentNode = selection.getStart(true);

        if (!dom.getParent(currentNode, 'a,span[data-mce-item="font"]')) {
          each(dom.select('[data-mce-selected="inline-boundary"]', dom.getRoot()), function (el) {
            dom.setAttrib(el, 'data-mce-selected', null);
          });
        }
      }
    });

    function stripZwspFromAnchor(anchor) {
      var walker = new TreeWalker(anchor, anchor), current;
      var firstText = null, lastText = null;

      while ((current = walker.next())) {
        if (current.nodeType == 3) {
          if (!firstText) {
            firstText = current;
          }
          lastText = current;
        }
      }

      if (firstText && firstText.data) {
        firstText.data = Zwsp.trim(firstText.data);
      }

      if (lastText && lastText.data) {
        lastText.data = Zwsp.trim(lastText.data);
      }

    }

    // Track cursor position: mark the inline boundary element the cursor is inside,
    // and clear the mark when the cursor leaves.
    editor.onNodeChange.add(function (editor, cm, node) {
      var inlineNode = dom.getParent(node, 'a,span[data-mce-item="font"]');

      if (ibis.isWebKit) {
        each(dom.select('a[data-mce-selected="inline-boundary"]', dom.getRoot()), function (el) {
          if (el !== inlineNode) {
            stripZwspFromAnchor(el);
          }
        });
      }

      each(dom.select('[data-mce-selected="inline-boundary"]', dom.getRoot()), function (el) {
        dom.setAttrib(el, 'data-mce-selected', null);
      });

      if (inlineNode) {
        dom.setAttrib(inlineNode, 'data-mce-selected', 'inline-boundary');
      }
    });
  }

  // All browsers
  normalizeSelection();

  removeBlockQuoteOnBackSpace();
  emptyEditorWhenDeleting();

  inlineBoundary();

  // WebKit
  if (ibis.isWebKit) {
    cleanupStylesWhenDeleting();
    inputMethodFocus();
    setDefaultBlockType();
    blockFormSubmitInsideEditor();
    disableBackspaceIntoATable();
    removeAppleInterchangeBrs();
    imageFloatLinkBug();
    selectControlElements();
    //touchClickEvent();

    cleanupRuntimeStyles();

    // iOS
    if (ibis.isIOS) {
      restoreFocusOnKeyDown();
      bodyHeight();
      tapLinksAndImages();
    } else {
      selectAll();
    }
  }

  if (ibis.isIE) {
    bodyHeight();
    selectAll();
    disableAutoUrlDetect();
    ieInternalDragAndDrop();
  }

  if (ibis.isIE >= 11) {
    disableBackspaceIntoATable();
  }

  // Gecko
  if (ibis.isGecko) {
    removeHrOnBackspace();
    removeStylesWhenDeletingAcrossBlockElements();
    setGeckoEditingOptions();
    addBrAfterLastLinks();
    showBrokenImageIcon();
    blockCmdArrowNavigation();
    disableBackspaceIntoATable();
    // added for gecko selection bug on images with a style of display:block
    selectControlElements();
  }
};