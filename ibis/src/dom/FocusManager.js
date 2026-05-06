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
 * This class manages the focus/blur state of the editor. This class is needed since some
 * browsers fire false focus/blur states when the selection is moved to a UI dialog or similar.
 *
 * This class will fire two events focus and blur on the editor instances that got affected.
 * It will also handle the restore of selection when the focus is lost and returned.
 *
 * @class ibis.FocusManager
 */
(function (ibis) {
  var DOM = ibis.DOM;

  var selectionChangeHandler, documentFocusInHandler, documentMouseUpHandler;

  var isUIElement = function (editor, elm) {
    var customSelector = editor ? editor.settings.custom_ui_selector : '';
    var parent = DOM.getParent(elm, function (elm) {
      return (
        FocusManager.isEditorUIElement(elm) ||
                (customSelector ? editor.dom.is(elm, customSelector) : false)
      );
    });
    return parent !== null;
  };

  var isElementOutsideEditor = function (editor, target) {
    return editor.dom.isChildOf(target, editor.getBody()) === false;
  };

  /**
     * Constructs a new focus manager instance.
     *
     * @constructor FocusManager
     * @param {ibis.EditorManager} editorManager Editor manager instance to handle focus for.
     */
  function FocusManager(editorManager) {
    function getActiveElement() {
      try {
        return document.activeElement;
      } catch (ex) {
        // IE sometimes fails to get the activeElement when resizing table
        // TODO: Investigate this
        return document.body;
      }
    }

    // We can't store a real range on IE 11 since it gets mutated so we need to use a bookmark object
    // TODO: Move this to a separate range utils class since it's it's logic is present in Selection as well.
    function createBookmark(dom, rng) {
      if (rng && rng.startContainer) {
        // Verify that the range is within the root of the editor
        if (!dom.isChildOf(rng.startContainer, dom.getRoot()) || !dom.isChildOf(rng.endContainer, dom.getRoot())) {
          return;
        }

        return {
          startContainer: rng.startContainer,
          startOffset: rng.startOffset,
          endContainer: rng.endContainer,
          endOffset: rng.endOffset
        };
      }

      return rng;
    }

    function bookmarkToRng(editor, bookmark) {
      var rng;

      if (bookmark.startContainer) {
        rng = editor.getDoc().createRange();
        rng.setStart(bookmark.startContainer, bookmark.startOffset);
        rng.setEnd(bookmark.endContainer, bookmark.endOffset);
      } else {
        rng = bookmark;
      }

      return rng;
    }

    function registerEvents(editor) {
      editor.onSetContent.add(function () {
        editor.lastRng = null;
      });

      // Remove last selection bookmark on mousedown see #6305
      editor.onMouseDown.add(function () {
        editor.selection.lastFocusBookmark = null;
      });

      editor.onFocusIn.add(function () {
        var focusedEditor = editorManager.focusedEditor,
          lastRng;

        if (editor.selection.lastFocusBookmark) {
          lastRng = bookmarkToRng(editor, editor.selection.lastFocusBookmark);
          editor.selection.lastFocusBookmark = null;
          editor.selection.setRng(lastRng);
        }

        if (focusedEditor != editor) {
          if (focusedEditor) {
            focusedEditor.onBlur.dispatch(focusedEditor, {
              focusedEditor: editor
            });

            focusedEditor.onDeactivate.dispatch(focusedEditor, editor);
          }

          editorManager.setActive(editor);
          editorManager.focusedEditor = editor;

          editor.onFocus.dispatch(editor, {
            blurredEditor: focusedEditor
          });

          editor.onActivate.dispatch(editor, focusedEditor);

          editor.focus(true);
        }

        editor.lastRng = null;
      });

      editor.onFocusOut.add(function () {
        setTimeout(function () {
          var focusedEditor = editorManager.focusedEditor;

          // Still the same editor the blur was outside any editor UI
          if (!isUIElement(editor, getActiveElement()) && focusedEditor == editor) {

            editor.onBlur.dispatch(editor, {
              focusedEditor: null
            });

            editorManager.focusedEditor = null;

            // Make sure selection is valid could be invalid if the editor is blured and removed before the timeout occurs
            if (editor.selection) {
              editor.selection.lastFocusBookmark = null;
            }
          }
        }, 10);
      });

      // Check if focus is moved to an element outside the active editor by checking if the target node
      // isn't within the body of the activeEditor nor a UI element such as a dialog child control
      if (!documentFocusInHandler) {
        documentFocusInHandler = function (e) {
          var activeEditor = editorManager.activeEditor,
            target;

          target = e.target;

          if (activeEditor && target.ownerDocument === document) {
            // Check to make sure we have a valid selection don't update the bookmark if it's
            // a focusin to the body of the editor see #7025
            if (activeEditor.selection && target !== activeEditor.getBody() && isElementOutsideEditor(editor, target)) {
              activeEditor.selection.lastFocusBookmark = createBookmark(activeEditor.dom, activeEditor.lastRng);
            }

            // Fire a blur event if the element isn't a UI element
            if (target !== document.body && !isUIElement(activeEditor, target) && editorManager.focusedEditor === activeEditor) {

              activeEditor.onBlur.dispatch(editor, {
                focusedEditor: null
              });

              editorManager.focusedEditor = null;
            }
          }
        };

        DOM.bind(document, 'focusin', documentFocusInHandler);
      }
    }

    function unregisterDocumentEvents(editor) {
      if (editorManager.focusedEditor == editor) {
        editorManager.focusedEditor = null;
      }

      if (!editorManager.activeEditor) {
        DOM.unbind(document, 'selectionchange', selectionChangeHandler);
        DOM.unbind(document, 'focusin', documentFocusInHandler);
        DOM.unbind(document, 'mouseup', documentMouseUpHandler);
        selectionChangeHandler = documentFocusInHandler = documentMouseUpHandler = null;
      }
    }

    editorManager.onAddEditor.add(function (mgr, editor) {
      registerEvents(editor);
    });

    editorManager.onRemoveEditor.add(function (mgr, editor) {
      unregisterDocumentEvents(editor);
    });
  }

  /**
     * Returns true if the specified element is part of the UI for example an button or text input.
     *
     * @method isEditorUIElement
     * @param  {Element} elm Element to check if it's part of the UI or not.
     * @return {Boolean} True/false state if the element is part of the UI or not.
     */
  FocusManager.isEditorUIElement = function (elm) {
    // Needs to be converted to string since svg can have focus: #6776
    return elm.className.toString().indexOf('mce') !== -1;
  };

  ibis.dom.FocusManager = FocusManager;

})(ibis);