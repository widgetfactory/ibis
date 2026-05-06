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
 * This module measures nodes and returns client rects. The client rects has an
 * extra node property.
 *
 * @private
 * @class ibis.dom.Dimensions
 */
(function (ibis) {
  var NodeType = ibis.dom.NodeType,
    Arr = ibis.util.Arr,
    ClientRect = ibis.geom.ClientRect;

  function getClientRects(node) {
    function toArrayWithNode(clientRects) {
      return Arr.map(clientRects, function (clientRect) {
        clientRect = ClientRect.clone(clientRect);
        clientRect.node = node;

        return clientRect;
      });
    }

    if (Arr.isArray(node)) {
      return Arr.reduce(node, function (result, node) {
        return result.concat(getClientRects(node));
      }, []);
    }

    if (NodeType.isElement(node)) {
      return toArrayWithNode(node.getClientRects());
    }

    if (NodeType.isText(node)) {
      var rng = node.ownerDocument.createRange();

      rng.setStart(node, 0);
      rng.setEnd(node, node.data.length);

      return toArrayWithNode(rng.getClientRects());
    }
  }

  ibis.dom.Dimensions = {
    /**
     * Returns the client rects for a specific node.
     *
     * @method getClientRects
     * @param {Array/DOMNode} node Node or array of nodes to get client rects on.
     * @param {Array} Array of client rects with a extra node property.
     */
    getClientRects: getClientRects
  };

})(ibis);