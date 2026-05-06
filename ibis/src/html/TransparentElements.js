/**
 * Includes adapted and modified code from TinyMCE 7.x, licensed under the GNU General Public License v2.0 or later.
 *
 * @code https://github.com/ibis/ibis/tree/main/modules/ibis/src/core/main/ts/content/TransparentElements.ts
 *
 * Copyright (c) 1999–2025 Ephox Corporation. All rights reserved.
 * Licensed under the GNU Lesser General Public License v2.1 or later.
 * See LICENSE.TXT in the original TinyMCE project.
 *
 * This version:
 * Copyright (c) 2025 Ryan Demmer
 * Relicensed under the GNU General Public License v2.0 or later,
 * as permitted by Section 3 of the LGPL v2.1.
 *
 * See LICENSE for GPL terms.
 */

(function (ibis) {
    var each = ibis.each,
        Arr = ibis.util.Arr;

    function tagName(el) {
        return el && el.nodeName ? el.nodeName.toLowerCase() : '';
    }

    function trimEdge(el, leftSide) {
        var childPropertyName = leftSide ? 'lastChild' : 'firstChild';
        var child = el[childPropertyName];

        while (child) {
            if (isEmptyElement(child)) {
                if (child.parentNode) {
                    child.parentNode.removeChild(child);
                }
                return;
            }

            child = child[childPropertyName];
        }
    }

    function isEmptyElement(el) {
        if (!el || el.nodeType !== 1) {
            return false;
        }

        // Ignore empty text nodes or whitespace
        var node = el.firstChild;
        while (node) {
            if (node.nodeType === 1) {
                return false;
            }

            if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
                return false;
            }

            node = node.nextSibling;
        }
        return true;
    }

    var split = function (parentElm, splitElm) {
        const range = document.createRange();
        const parentNode = parentElm.parentNode;

        if (parentNode) {
            range.setStartBefore(parentElm);
            range.setEndBefore(splitElm);
            const beforeFragment = range.extractContents();
            trimEdge(beforeFragment, true);

            range.setStartAfter(splitElm);
            range.setEndAfter(parentElm);
            const afterFragment = range.extractContents();
            trimEdge(afterFragment, false);

            if (!isEmptyElement(beforeFragment)) {
                parentNode.insertBefore(beforeFragment, parentElm);
            }

            if (!isEmptyElement(splitElm)) {
                parentNode.insertBefore(splitElm, parentElm);
            }

            if (!isEmptyElement(afterFragment)) {
                parentNode.insertBefore(afterFragment, parentElm);
            }

            parentNode.removeChild(parentElm);
        }
    };

    function updateTransparent(blocksSelector, transparent) {
        if (transparent.querySelector(blocksSelector) !== null) {
            transparent.setAttribute('data-mce-block', 'true');

            if (transparent.getAttribute('data-mce-selected') === 'inline-boundary') {
                transparent.removeAttribute('data-mce-selected');
            }

            return true;
        } else {
            transparent.removeAttribute('data-mce-block');
            return false;
        }
    }

    function elementNames(map) {
        return Arr.filter(Object.keys(map || {}), function (key) {
            // keep only lowercase tag names from the schema maps
            return !/[A-Z]/.test(key);
        });
    }

    function makeSelectorFromSchemaMap(map) {
        var names = elementNames(map);
        return names.length ? names.join(',') : '';
    }

    function updateBlockStateOnChildren(schema, elm) {
        var transparentSelector = makeSelectorFromSchemaMap(schema.getTransparentElements());
        var blocksSelector = makeSelectorFromSchemaMap(schema.getBlockElements());

        if (!transparentSelector) {
            return [];
        }

        var nodes = elm.querySelectorAll(transparentSelector);

        // Keep elements for which updateTransparent(...) returns truthy
        return Arr.filter(nodes, function (transparent) {
            return updateTransparent(blocksSelector, transparent);
        });
    }

    function unwrapElement(elm) {
        var parent = elm && elm.parentNode;
        if (!parent) {
            return;
        }

        while (elm.firstChild) {
            parent.insertBefore(elm.firstChild, elm);
        }
        parent.removeChild(elm);
    }

    function splitInvalidChildren(schema, scope, transparentBlocks) {
        var blockMap = schema.getBlockElements();

        function isBlock(el) {
            return !!(el && el.nodeType === 1 && blockMap[tagName(el)]);
        }

        function closestBlock(el) {
            var n = el;

            while (n && n !== scope) {
                if (isBlock(n)) {
                    return n;
                }
                n = n.parentElement;
            }

            return null;
        }

        for (var t = 0; t < transparentBlocks.length; t++) {
            var transparentBlock = transparentBlocks[t];
            var parentBlock = closestBlock(transparentBlock);
            if (!parentBlock) {
                continue;
            }

            // direct element children only
            var kids = transparentBlock.children;
            var invalidChildren = [];

            for (var i = 0; i < kids.length; i++) {
                var child = kids[i];
                if (isBlock(child) && !schema.isValidChild(tagName(parentBlock), tagName(child))) {
                    invalidChildren.push(child);
                }
            }

            if (invalidChildren.length) {
                var stateScope = parentBlock.parentElement;

                for (var j = 0; j < invalidChildren.length; j++) {
                    var childBlock = invalidChildren[j];
                    var ancestorBlock = closestBlock(childBlock);

                    if (ancestorBlock) {
                        // split(ancestorBlock, childBlock) keeps childBlock and
                        // extracts before/after fragments around it.
                        split(ancestorBlock, childBlock);
                    }
                }

                if (stateScope) {
                    updateBlockStateOnChildren(schema, stateScope);
                }
            }
        }
    }

    function isTransparentElement(schema, node) {
        var tag = tagName(node);
        return node.nodeType === 1 && tag in schema.getTransparentElements();
    }

    function isTransparentBlock(schema, node) {
        return isTransparentElement(schema, node) && !!node.hasAttribute('data-mce-block');
    }

    function isTransparentInline(schema, node) {
        return isTransparentElement(schema, node) && !node.hasAttribute('data-mce-block');
    }

    function unwrapInvalidChildren(schema, scope, transparentBlocks) {
        // Build the list: transparentBlocks + maybe scope itself
        var blocks = [].concat(
            transparentBlocks,
            isTransparentBlock(schema, scope) ? [scope] : []
        );

        each(blocks, function (block) {
            var descendants = block.querySelectorAll(block.nodeName.toLowerCase());

            each(descendants, function (elm) {
                if (isTransparentInline(schema, elm)) {
                    unwrapElement(elm);
                }
            });
        });
    }

    function updateChildren(schema, scope) {
        var transparentBlocks = updateBlockStateOnChildren(schema, scope);
        splitInvalidChildren(schema, scope, transparentBlocks);
        unwrapInvalidChildren(schema, scope, transparentBlocks);
    }

    ibis.html.TransparentElements = {
        updateChildren: updateChildren,
        isTransparentBlock: isTransparentBlock,
        isTransparentInline: isTransparentInline
    };

})(ibis);