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
    var each = ibis.each,
        extend = ibis.extend;
    /**
     * Executes all node and attribute filters on matching nodes.
     * Filters are only applied to nodes that still match after tree manipulation.
     *
     * @param {Object} matches - Contains { nodes, attributes } records of matched filters.
     * @param {Object} args - Additional arguments passed to filter callbacks.
     */
    function runFilters(matches, args) {
        // clone args so it doesn't get modified by filters
        args = extend({}, args);

        function run(matchRecord, isAttributeFilter) {

            each(matchRecord, function (match) {

                var originalNodes = match.nodes;
                var filterName = match.filter.name;
                var callbacks = match.filter.callbacks;

                // Copy the node array
                var nodes = originalNodes.slice();

                for (var ci = 0; ci < callbacks.length; ci++) {
                    var callback = callbacks[ci];
                    var validNodes = [];

                    for (var i = 0; i < nodes.length; i++) {
                        var node = nodes[i];

                        var stillMatches = isAttributeFilter ? node.attr(filterName) !== undefined : node.name === filterName;

                        if (stillMatches && node.parent != null) {
                            validNodes.push(node);
                        }
                    }

                    if (validNodes.length > 0) {
                        callback(validNodes, filterName, args);
                    }
                }
            });
        }

        run(matches.nodes, false);
        run(matches.attributes, true);
    }

    function traverse(root, fn) {
        var node = root;

        while ((node = node.walk())) {
            fn(node);
        }
    }

    // Test a single node against the current filters, and add it to any match lists if necessary
    function matchNode(nodeFilters, attributeFilters, node, matches) {
        var name = node.name;

        for (var ni = 0, nl = nodeFilters.length; ni < nl; ni++) {
            var filter = nodeFilters[ni];

            if (filter.name === name) {
                var match = matches.nodes[name];

                if (match) {
                    match.nodes.push(node);
                } else {
                    matches.nodes[name] = { filter, nodes: [node] };
                }
            }
        }

        // Match attribute filters
        if (node.attributes) {
            for (var ai = 0, al = attributeFilters.length; ai < al; ai++) {
                var filter = attributeFilters[ai];
                var attrName = filter.name;

                if (attrName in node.attributes.map) {
                    var match = matches.attributes[attrName];

                    if (match) {
                        match.nodes.push(node);
                    } else {
                        matches.attributes[attrName] = { filter, nodes: [node] };
                    }
                }
            }
        }
    }

    function findMatchingNodes(nodeFilters, attributeFilters, node) {
        var matches = { nodes: {}, attributes: {} };

        if (node.firstChild) {
            traverse(node, function (childNode) {
                matchNode(nodeFilters, attributeFilters, childNode, matches);
            });
        }

        return matches;
    }

    function filter(nodeFilters, attributeFilters, node, args) {
        var matches = findMatchingNodes(nodeFilters, attributeFilters, node);
        runFilters(matches, args || {});
    }

    ibis.html.FilterNode = {
        runFilters: runFilters,
        matchNode: matchNode,
        findMatchingNodes: findMatchingNodes,
        filter: filter,
        traverse: traverse
    };

})(ibis);
