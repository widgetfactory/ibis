/**
 * Includes adapted and modified code from TinyMCE 7.x, licensed under the GNU General Public License v2.0 or later.
 *
 * @code https://github.com/ibis/ibis/tree/main/modules/ibis/src/core/main/ts/html/FilterNode.ts
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
    var makeMap = ibis.makeMap;
    var Node = ibis.html.Node;

    var hasOnlyChild = function (node, name) {
        var child = node.firstChild;

        if (!child) {
            return false;
        }

        return child === node.lastChild && child.name === name;
    };

    var hasClosest = function (node, parentName) {
        var tempNode = node;

        while (tempNode) {

            if (tempNode.name === parentName) {
                return true;
            }

            tempNode = tempNode.parent;
        }

        return false;
    };

    function isInvalid(schema, node, parent) {
        parent = parent || node.parent;

        if (!parent) {
            return false;
        }

        // Check if the node is a valid child of the parent node. If the child is
        // unknown we don't collect it since it's probably a custom element
        if (schema.children[node.name] && !schema.isValidChild(parent.name, node.name)) {
            return true;
        }

        // Anchors are a special case and cannot be nested
        if (node.name === 'a' && hasClosest(parent, 'a')) {
            return true;
        }

        // heading element is valid if it is the only one child of summary
        if (parent.name == 'summary' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.name)) {
            return !(parent.firstChild === node && parent.lastChild === node);
        }

        return false;
    }

    /**
     * Attempts to fix or remove invalid children in the DOM tree.
     * It either unwraps, repositions, or removes invalid nodes depending on schema rules.
     *
     * @param {Array} nodes - List of invalid child nodes to process.
     */
    function cleanInvalidNodes(nodes, schema, rootNode, onCreate) {
        var ni, node, parent, parents, newParent, currentNode, tempNode, childNode, i;
        var nonEmptyElements, nonSplitableElements, textBlockElements, specialElements, whitespaceElements, sibling, nextNode;

        nonSplitableElements = makeMap('tr,td,th,tbody,thead,tfoot,table');
        nonEmptyElements = schema.getNonEmptyElements();
        textBlockElements = schema.getTextBlockElements();
        specialElements = schema.getSpecialElements();
        whitespaceElements = schema.getWhiteSpaceElements();

        onCreate = onCreate || function () { };

        var removeOrUnwrapInvalidNode = function (node, originalNodeParent) {
            if (specialElements[node.name]) {
                node.empty().remove();
            } else {
                // are the children of `node` valid children of the top level parent?
                // if not, remove or unwrap them too
                var children = node.children();

                for (var childNode of children) {
                    if (!schema.isValidChild(originalNodeParent.name, childNode.name)) {
                        removeOrUnwrapInvalidNode(childNode, originalNodeParent);
                    }
                }

                node.unwrap();
            }
        };

        for (ni = 0; ni < nodes.length; ni++) {
            node = nodes[ni];

            // Already removed or fixed
            if (!node.parent || node.fixed) {
                continue;
            }

            // If the invalid element is a text block and the text block is within a parent LI element
            // Then unwrap the first text block and convert other sibling text blocks to LI elements similar to Word/Open Office
            if (textBlockElements[node.name] && node.parent.name == 'li') {
                // Move sibling text blocks after LI element
                sibling = node.next;

                while (sibling) {
                    if (textBlockElements[sibling.name]) {
                        sibling.name = 'li';
                        sibling.fixed = true;
                        node.parent.insert(sibling, node.parent);
                    } else {
                        break;
                    }

                    sibling = sibling.next;
                }

                // Unwrap current text block
                node.unwrap(node);
                continue;
            }

            // Get list of all parent nodes until we find a valid parent to stick the child into
            parents = [node];

            for (parent = node.parent; parent && !schema.isValidChild(parent.name, node.name) &&
                !nonSplitableElements[parent.name]; parent = parent.parent) {
                parents.push(parent);
            }

            // Found a suitable parent
            if (parent && parents.length > 1) {
                // If the node is a valid child of the parent, then try to move it. Otherwise unwrap it
                if (schema.isValidChild(parent.name, node.name)) {
                    // Reverse the array since it makes looping easier
                    parents.reverse();

                    // Clone the related parent and insert that after the moved node
                    newParent = currentNode = parents[0].clone();
                    onCreate(newParent);

                    // Start cloning and moving children on the left side of the target node
                    for (i = 0; i < parents.length - 1; i++) {
                        if (schema.isValidChild(currentNode.name, parents[i].name)) {
                            tempNode = parents[i].clone();
                            onCreate(tempNode);
                            currentNode.append(tempNode);
                        } else {
                            tempNode = currentNode;
                        }

                        for (childNode = parents[i].firstChild; childNode && childNode != parents[i + 1];) {
                            nextNode = childNode.next;
                            tempNode.append(childNode);
                            childNode = nextNode;
                        }

                        currentNode = tempNode;
                    }

                    if (!newParent.isEmpty(nonEmptyElements, whitespaceElements)) {
                        parent.insert(newParent, parents[0], true);
                        parent.insert(node, newParent);
                    } else {
                        parent.insert(node, parents[0], true);
                    }

                    // Check if the element is empty by looking through it's contents and special treatment for <p><br /></p>
                    parent = parents[0];

                    if (parent.isEmpty(nonEmptyElements, whitespaceElements) || hasOnlyChild(parent, 'br')) {
                        parent.empty().remove();
                    }
                } else {
                    removeOrUnwrapInvalidNode(node, node.parent);
                }
            } else if (node.parent) {
                // If it's an LI try to find a UL/OL for it or wrap it
                if (node.name === 'li') {
                    sibling = node.prev;

                    if (sibling && (sibling.name === 'ul' || sibling.name === 'ol')) {
                        sibling.append(node);
                        continue;
                    }

                    sibling = node.next;

                    if (sibling && (sibling.name === 'ul' || sibling.name === 'ol')) {
                        sibling.insert(node, sibling.firstChild, true);
                        continue;
                    }

                    var wrapper = new Node('ul', 1);

                    onCreate(wrapper);
                    node.wrap(wrapper);
                    continue;
                }

                // Try wrapping the element in a DIV
                if (schema.isValidChild(node.parent.name, 'div') && schema.isValidChild('div', node.name)) {
                    var wrapper = new Node('div', 1);
                    onCreate(wrapper);
                    node.wrap(wrapper);
                } else {
                    // We failed wrapping it, remove or unwrap it
                    removeOrUnwrapInvalidNode(node, node.parent);
                }
            }
        }
    }

    ibis.html.InvalidNodes = {
        cleanInvalidNodes: cleanInvalidNodes,
        isInvalid: isInvalid
    };

})(ibis);
