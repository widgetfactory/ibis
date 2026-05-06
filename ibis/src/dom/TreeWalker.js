/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

ibis.dom.TreeWalker = function (startNode, rootNode) {
	var node = startNode;

	function findSibling(node, startName, siblingName, shallow) {
		var sibling, parent;

		if (node) {
			// Walk into nodes if it has a start
			if (!shallow && node[startName]) {
				return node[startName];
			}

			// Return the sibling if it has one
			if (node != rootNode) {
				sibling = node[siblingName];
				if (sibling) {
					return sibling;
				}

				// Walk up the parents to look for siblings
				for (parent = node.parentNode; parent && parent != rootNode; parent = parent.parentNode) {
					sibling = parent[siblingName];
					if (sibling) {
						return sibling;
					}
				}
			}
		}
	}

	function findPreviousNode(node, startName, siblingName, shallow) {
		var sibling, parent, child;

		if (node) {
			sibling = node[siblingName];
			if (rootNode && sibling === rootNode) {
				return;
			}

			if (sibling) {
				if (!shallow) {
					// Walk up the parents to look for siblings
					for (child = sibling[startName]; child; child = child[startName]) {
						if (!child[startName]) {
							return child;
						}
					}
				}

				return sibling;
			}

			parent = node.parentNode;
			if (parent && parent !== rootNode) {
				return parent;
			}
		}
	}

	/**
	 * Returns the current node.
	 *
	 * @return {Node} Current node where the walker is.
	 */
	this.current = function () {
		return node;
	};

	/**
	 * Walks to the next node in tree.
	 *
	 * @return {Node} Current node where the walker is after moving to the next node.
	 */
	this.next = function (shallow) {
		return (node = findSibling(node, 'firstChild', 'nextSibling', shallow));
	};

	/**
	 * Walks to the previous node in tree.
	 *
	 * @return {Node} Current node where the walker is after moving to the previous node.
	 */
	this.prev = function (shallow) {
		return (node = findSibling(node, 'lastChild', 'previousSibling', shallow));
	};

	this.prev2 = function (shallow) {
		node = findPreviousNode(node, 'lastChild', 'previousSibling', shallow);
		return node;
	};
};