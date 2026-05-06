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
 * This class contains all core logic for the code plugin.
 *
 * @class ibis.textpattern
 * @private
 */

ibis.TextPattern = function (editor) {
    var self = this, isPatternsDirty = true;
    
    self.patterns = [];
    
    // Returns a sorted patterns list, ordered descending by start length
    function getPatterns() {
        if (isPatternsDirty) {
            sortPatterns(self.patterns);
            isPatternsDirty = false;
        }

        return self.patterns;
    }

    // Finds a matching pattern to the specified text
    function findPattern(text) {
        var patterns = getPatterns();

        for (var i = 0; i < patterns.length; i++) {
            if (text.indexOf(patterns[i].start) !== 0) {
                continue;
            }

            if (patterns[i].end && text.lastIndexOf(patterns[i].end) != text.length - patterns[i].end.length) {
                continue;
            }

            return patterns[i];
        }
    }

    function sortPatterns(patterns) {
        return patterns.sort(function (a, b) {
            if (a.start.length > b.start.length) {
                return -1;
            }

            if (a.start.length < b.start.length) {
                return 1;
            }

            return 0;
        });
    }

    function isMatchingPattern(pattern, text, offset, delta) {
        var textEnd = text.substr(offset - pattern.end.length - delta, pattern.end.length);
        return textEnd === pattern.end;
    }

    function hasContent(offset, delta, pattern) {
        return (offset - delta - pattern.end.length - pattern.start.length) > 0;
    }

    // Finds the best matching end pattern
    function findEndPattern(text, offset, delta) {
        var pattern, i;
        var patterns = getPatterns();
        var sortedPatterns = sortPatterns(patterns);

        // Find best matching end
        for (i = 0; i < sortedPatterns.length; i++) {
            pattern = sortedPatterns[i];
            if (pattern.end !== undefined && isMatchingPattern(pattern, text, offset, delta) && hasContent(offset, delta, pattern)) {
                return pattern;
            }
        }
    }

    function splitContainer(container, pattern, offset, startOffset, delta) {
        // remove leading space in pattern
        if (delta && /[\u00a0 ]/.test(pattern.start)) {
            startOffset += 1;
        }

        // Split text node and remove start/end from text node
        container = startOffset > 0 ? container.splitText(startOffset) : container;
        container.splitText(offset - startOffset - delta);

        if (pattern.remove !== false) {
            container.deleteData(0, pattern.start.length);
            container.deleteData(container.data.length - pattern.end.length, pattern.end.length);
        }

        return container;
    }

    // Handles inline formats like *abc* and **abc**
    function applyInlineFormat(space) {
        var selection, dom, rng, container, offset, startOffset, text, patternRng, pattern, delta, format;

        selection = editor.selection;
        dom = editor.dom;

        if (!selection.isCollapsed()) {
            return;
        }

        rng = selection.getRng(true);
        container = rng.startContainer;
        offset = rng.startOffset;
        text = container.data;
        delta = space === true ? 1 : 0;

        if (container.nodeType != 3) {
            return;
        }

        if (dom.getParent(container, 'PRE')) {
            return;
        }

        // Find best matching end
        pattern = findEndPattern(text, offset, delta);

        if (pattern === undefined) {
            return;
        }

        // Find start of matched pattern
        // TODO: Might need to improve this if there is nested formats
        startOffset = Math.max(0, offset - delta);

        startOffset = text.lastIndexOf(pattern.start, startOffset - pattern.end.length - 1);

        if (startOffset === -1) {
            return;
        }

        // Setup a range for the matching word
        patternRng = dom.createRng();
        patternRng.setStart(container, startOffset);
        patternRng.setEnd(container, offset - delta);
        pattern = findPattern(patternRng.toString());

        if (!pattern || !pattern.end) {
            return;
        }

        // If container match doesn't have anything between start/end then do nothing
        if (container.data.length <= pattern.start.length + pattern.end.length) {
            return;
        }

        if (!pattern.format) {
            return;
        }

        format = editor.formatter.get(pattern.format);

        if (format && format[0].inline) {
            container = splitContainer(container, pattern, offset, startOffset, delta);

            // add back removed space
            if (space) {
                container.appendData(' ');
            }

            editor.formatter.apply(pattern.format, {}, container);

            return container;
        }
    }

    // Handles block formats like ##abc or 1. abc
    function applyBlockFormat(e) {
        var selection, dom, container, firstTextNode, node, format, textBlockElm, pattern, walker, rng, offset;

        selection = editor.selection;
        dom = editor.dom;

        if (!selection.isCollapsed()) {
            return;
        }

        var startNode = selection.getStart();

        // skip in pre
        if (startNode.nodeName === 'PRE') {
            return;
        }

        textBlockElm = dom.getParent(startNode, 'p,div');

        if (textBlockElm) {
            walker = new ibis.dom.TreeWalker(textBlockElm, textBlockElm);
            
            while ((node = walker.next())) {
                if (node.nodeType == 3) {
                    firstTextNode = node;
                    break;
                }
            }

            if (firstTextNode) {
                pattern = findPattern(firstTextNode.data);

                if (!pattern) {
                    return;
                }
                
                // cancel newline on enter if the format removes the original pattern
                if (pattern.remove) {
                    e.preventDefault();
                }

                rng = selection.getRng(true);
                container = rng.startContainer;
                offset = rng.startOffset;

                if (firstTextNode == container) {
                    offset = Math.max(0, offset - pattern.start.length);
                }

                if (ibis.trim(firstTextNode.data).length == pattern.start.length) {
                    return;
                }

                if (pattern.format) {
                    format = editor.formatter.get(pattern.format);

                    if (format && format[0].block) {
                        firstTextNode.deleteData(0, pattern.start.length);
                        editor.formatter.apply(pattern.format, {}, firstTextNode);

                        rng.setStart(container, offset);
                        rng.collapse(true);
                        selection.setRng(rng);
                    }

                    return;
                }

                if (pattern.cmd) {
                    editor.undoManager.add();

                    var length = pattern.start.length,
                        data = firstTextNode.data;

                    // remove pattern entirely
                    if (pattern.remove) {
                        length = firstTextNode.data.length;
                    }

                    firstTextNode.deleteData(0, length);

                    var parent = firstTextNode.parentNode;

                    if (dom.isEmpty(parent) && dom.isBlock(parent)) {
                        parent.innerHTML = '<br data-mce-bogus="1">';

                        window.setTimeout(function () {
                            rng.setStart(parent, 0);
                            rng.collapse(true);
                            selection.setRng(rng);
                        }, 0);
                    }

                    // pass to command
                    editor.execCommand(pattern.cmd, false, data);

                    return;
                }
            }
        }
    }

    function handleEnter(e) {
        var rng, wrappedTextNode;

        wrappedTextNode = applyInlineFormat();

        if (wrappedTextNode) {
            rng = editor.dom.createRng();
            rng.setStart(wrappedTextNode, wrappedTextNode.data.length);
            rng.setEnd(wrappedTextNode, wrappedTextNode.data.length);
            editor.selection.setRng(rng);
        }

        applyBlockFormat(e);
    }

    function handleSpace() {
        var wrappedTextNode, lastChar, lastCharNode, rng, dom;

        wrappedTextNode = applyInlineFormat(true);

        if (wrappedTextNode) {
            dom = editor.dom;
            lastChar = wrappedTextNode.data.slice(-1);

            // Move space after the newly formatted node
            if (/[\u00a0 ]/.test(lastChar)) {
                wrappedTextNode.deleteData(wrappedTextNode.data.length - 1, 1);
                lastCharNode = dom.doc.createTextNode(lastChar);

                if (wrappedTextNode.nextSibling) {
                    dom.insertAfter(lastCharNode, wrappedTextNode.nextSibling);
                } else {
                    wrappedTextNode.parentNode.appendChild(lastCharNode);
                }

                rng = dom.createRng();
                rng.setStart(lastCharNode, 1);
                rng.setEnd(lastCharNode, 1);
                editor.selection.setRng(rng);
            }
        }
    }

    editor.onKeyDown.addToTop(function (ed, e) {
        if (e.keyCode == 13 && !ibis.VK.modifierPressed(e)) {
            handleEnter(e);
        }
    });

    editor.onKeyUp.add(function (ed, e) {        
        if (e.keyCode == 32 && !ibis.VK.modifierPressed(e)) {
            handleSpace();
        }
    });

    var addPattern = function (pattern) {
        self.patterns.push(pattern);
        isPatternsDirty = true;
    };

    return {
        getPatterns: getPatterns,
        addPattern: addPattern
    };
};