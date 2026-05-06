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
    var ZWSP = '\uFEFF';

    function getTemporaryNodeSelector(tempAttrs) {
        return "" + (tempAttrs.length === 0 ? '' : tempAttrs.map(function (attr) {
            return "[" + attr + "]";
        }).join(',') + ",") + "[data-mce-bogus=\"all\"]";
    }

    function getTemporaryNodes(body, tempAttrs) {
        return body.querySelectorAll(getTemporaryNodeSelector(tempAttrs));
    }

    function createCommentWalker(body) {
        return document.createTreeWalker(body, NodeFilter.SHOW_COMMENT, null, false);
    }

    function hasComments(body) {
        return createCommentWalker(body).nextNode() !== null;
    }

    function hasTemporaryNodes(body, tempAttrs) {
        return body.querySelector(getTemporaryNodeSelector(tempAttrs)) !== null;
    }

    function trimTemporaryNodes(body, tempAttrs) {
        ibis.each(getTemporaryNodes(body, tempAttrs), function (elm) {
            if (elm.getAttribute('data-mce-bogus') === 'all') {
                if (elm && elm.parentNode) {
                    elm.parentNode.removeChild(elm);
                }
            } else {
                ibis.each(tempAttrs, function (attr) {
                    if (elm.hasAttribute(attr)) {
                        elm.removeAttribute(attr);
                    }
                });
            }
        });
    }

    function removeCommentsContainingZwsp(body) {
        var walker = createCommentWalker(body);
        var nextNode = walker.nextNode();
        while (nextNode !== null) {
            var comment = walker.currentNode;
            nextNode = walker.nextNode();
            if (typeof comment.nodeValue === 'string' && comment.nodeValue.indexOf(ZWSP) !== -1) {
                if (comment && comment.parentNode) {
                    comment.parentNode.removeChild(comment);
                }
            }
        }
    }

    function deepClone(body) {
        return body.cloneNode(true);
    }

    function trim(body, tempAttrs) {
        var trimmed = body;

        if (hasComments(body)) {
            trimmed = deepClone(body);
            removeCommentsContainingZwsp(trimmed);
            if (hasTemporaryNodes(trimmed, tempAttrs)) {
                trimTemporaryNodes(trimmed, tempAttrs);
            }
        } else if (hasTemporaryNodes(body, tempAttrs)) {
            trimmed = deepClone(body);
            trimTemporaryNodes(trimmed, tempAttrs);
        }

        return trimmed;
    }


    /**
     * Constucts a new DOM serializer class.
     *
     * @constructor
     * @method Serializer
     * @param {Object} settings Serializer settings object.
     * @param {ibis.dom.DOMUtils} dom DOMUtils instance reference.
     * @param {ibis.html.Schema} schema Optional schema reference.
     */
    ibis.dom.TrimBody = {
        trim: trim,
        hasComments: hasComments,
        hasTemporaryNodes: hasTemporaryNodes,
        trimTemporaryNodes: trimTemporaryNodes,
        removeCommentsContainingZwsp: removeCommentsContainingZwsp
    };
})(ibis);