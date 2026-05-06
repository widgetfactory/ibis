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
 * This class handles the nodechange event dispatching both manual and through selection change events.
 *
 * @class ibis.NodeChange
 * @private
 */

(function (ibis) {
    var lastPath = [];

    var timer;

    function nodeChanged(ed, e) {
        if (timer) {
            clearTimeout(timer);
        }

        // Normalize selection for example <b>a</b><i>|a</i> becomes <b>a|</b><i>a</i> except for Ctrl+A since it selects everything
        if (e.keyCode != 65 || !ibis.VK.metaKeyPressed(e)) {
            ed.selection.normalize();
        }

        ed.nodeChanged();
    }

    /**
     * Returns true/false if the current element path has been changed or not.
     *
     * @private
     * @return {Boolean} True if the element path is the same false if it's not.
     */
    function isSameElementPath(ed, startElm) {
        var i, currentPath;

        currentPath = ed.dom.getParents(startElm, '*', ed.getBody());
        currentPath.reverse();

        if (currentPath.length === lastPath.length) {
            for (i = currentPath.length; i >= 0; i--) {
                if (currentPath[i] !== lastPath[i]) {
                    break;
                }
            }

            if (i === -1) {
                lastPath = currentPath;
                return true;
            }
        }

        lastPath = currentPath;

        return false;
    }

    ibis.NodeChange = function (editor) {

        // Selection change is delayed ~200ms on IE when you click inside the current range
        editor.onSelectionChange.add(function (ed, e) {
            var startElm = ed.selection.getStart(true);

            lastPath = [startElm];

            if (!isSameElementPath(ed, startElm) && ed.dom.isChildOf(startElm, ed.getBody())) {
                nodeChanged(ed, e);
            }
        });

        /*var keyCodeMap = ibis.makeMap([8, 13, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46]);
    
        self.onKeyUp.add(function (ed, e) {
            var keyCode = e.keyCode;
    
            if (keyCodeMap[keyCode] || (ibis.isMac && (keyCode == 91 || keyCode == 93)) || e.ctrlKey) {
                nodeChanged(ed, e);
            }
        });*/

        // Fire an extra nodeChange on mouseup for compatibility reasons
        editor.onMouseUp.add(function (ed, e) {
            if (!e.isDefaultPrevented()) {
                // Delay nodeChanged call for WebKit edge case issue where the range
                // isn't updated until after you click outside a selected image
                if (ed.selection.getNode().nodeName == 'IMG') {
                    timer = setTimeout(function () {
                        nodeChanged(ed, e);
                    }, 0);
                } else {
                    nodeChanged(ed, e);
                }
            }
        });

        /**
         * Dispatches out a onNodeChange event to all observers. This method should be called when you
         * need to update the UI states or element path etc.
         *
         * @method nodeChanged
         * @param {Object} args Optional args to pass to NodeChange event handlers.
         */
        this.nodeChanged = function (args) {
            var selection = editor.selection,
                node, root, parents;

            // Fix for bug #1896577 it seems that this can not be fired while the editor is loading
            if (editor.initialized && selection && !editor.settings.disable_nodechange && !editor.readonly) {
                // Get start node
                root = editor.getBody();
                node = selection.getStart(true) || root;

                // Make sure the node is within the editor root or is the editor root
                if (node.ownerDocument != editor.getDoc() || !editor.dom.isChildOf(node, root)) {
                    node = root;
                }

                /*if (node.nodeType !== 1 || node.getAttribute('data-mce-bogus')) {
                    node = node.parentNode;
                }*/

                // Get parents and add them to object
                parents = [];

                editor.dom.getParent(node, function (node) {
                    if (node === root) {
                        return true;
                    }

                    parents.push(node);
                });

                args = args || {};
                args.element = node;
                args.parents = parents;
                args.contenteditable = !node.hasAttribute('contenteditable') || ibis.dom.NodeType.isContentEditableTrue(node);

                editor.onNodeChange.dispatch(
                    editor,
                    args ? args.controlManager || editor.controlManager : editor.controlManager,
                    node,
                    selection.isCollapsed(),
                    args
                );
            }
        };
    };
})(ibis);