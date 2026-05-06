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
 * Handles inserts of lists into the editor instance.
 *
 * @class ibis.InsertList
 * @private
 */
(function (ibis) {

  var CaretWalker = ibis.caret.CaretWalker,
    CaretPosition = ibis.caret.CaretPosition;

  var isListFragment = function (fragment) {
    var firstChild = fragment.firstChild;
    var lastChild = fragment.lastChild;

    // Skip meta since it's likely <meta><ul>..</ul>
    if (firstChild && firstChild.name === 'meta') {
      firstChild = firstChild.next;
    }

    // Skip mce_marker since it's likely <ul>..</ul><span id="mce_marker"></span>
    if (lastChild && lastChild.attr('id') === 'mce_marker') {
      lastChild = lastChild.prev;
    }

    if (!firstChild || firstChild !== lastChild) {
      return false;
    }

    return firstChild.name === 'ul' || firstChild.name === 'ol';
  };

  var cleanupDomFragment = function (domFragment) {
    var firstChild = domFragment.firstChild;
    var lastChild = domFragment.lastChild;

    // TODO: remove the meta tag from paste logic
    if (firstChild && firstChild.nodeName === 'META') {
      firstChild.parentNode.removeChild(firstChild);
    }

    if (lastChild && lastChild.id === 'mce_marker') {
      lastChild.parentNode.removeChild(lastChild);
    }

    return domFragment;
  };

  var toDomFragment = function (dom, serializer, fragment) {
    var html = serializer.serialize(fragment);
    var domFragment = dom.createFragment(html);

    return cleanupDomFragment(domFragment);
  };

  var listItems = function (elm) {
    return ibis.grep(elm.childNodes, function (child) {
      return child.nodeName === 'LI';
    });
  };

  var isEmpty = function (elm) {
    return !elm.firstChild;
  };

  var trimListItems = function (elms) {
    return elms.length > 0 && isEmpty(elms[elms.length - 1]) ? elms.slice(0, -1) : elms;
  };

  var getParentLi = function (dom, node) {
    var parentBlock = dom.getParent(node, dom.isBlock);
    return parentBlock && parentBlock.nodeName === 'LI' ? parentBlock : null;
  };

  var isParentBlockLi = function (dom, node) {
    return !!getParentLi(dom, node);
  };

  var getSplit = function (parentNode, rng) {
    var beforeRng = rng.cloneRange();
    var afterRng = rng.cloneRange();

    beforeRng.setStartBefore(parentNode);
    afterRng.setEndAfter(parentNode);

    return [
      beforeRng.cloneContents(),
      afterRng.cloneContents()
    ];
  };

  var findFirstIn = function (node, rootNode) {
    var caretPos = CaretPosition.before(node);
    var caretWalker = new CaretWalker(rootNode);
    var newCaretPos = caretWalker.next(caretPos);

    return newCaretPos ? newCaretPos.toRange() : null;
  };

  var findLastOf = function (node, rootNode) {
    var caretPos = CaretPosition.after(node);
    var caretWalker = new CaretWalker(rootNode);
    var newCaretPos = caretWalker.prev(caretPos);

    return newCaretPos ? newCaretPos.toRange() : null;
  };

  var insertMiddle = function (target, elms, rootNode, rng) {
    var parts = getSplit(target, rng);
    var parentElm = target.parentNode;

    parentElm.insertBefore(parts[0], target);
    ibis.each(elms, function (li) {
      parentElm.insertBefore(li, target);
    });
    parentElm.insertBefore(parts[1], target);
    parentElm.removeChild(target);

    return findLastOf(elms[elms.length - 1], rootNode);
  };

  var insertBefore = function (target, elms, rootNode) {
    var parentElm = target.parentNode;

    ibis.each(elms, function (elm) {
      parentElm.insertBefore(elm, target);
    });

    return findFirstIn(target, rootNode);
  };

  var insertAfter = function (target, elms, rootNode, dom) {
    dom.insertAfter(elms.reverse(), target);
    return findLastOf(elms[0], rootNode);
  };

  var insertAtCaret = function (serializer, dom, rng, fragment) {
    var domFragment = toDomFragment(dom, serializer, fragment);
    var liTarget = getParentLi(dom, rng.startContainer);
    var liElms = trimListItems(listItems(domFragment.firstChild));
    var BEGINNING = 1,
      END = 2;
    var rootNode = dom.getRoot();

    var isAt = function (location) {
      var caretPos = CaretPosition.fromRangeStart(rng);
      var caretWalker = new CaretWalker(dom.getRoot());
      var newPos = location === BEGINNING ? caretWalker.prev(caretPos) : caretWalker.next(caretPos);

      return newPos ? getParentLi(dom, newPos.getNode()) !== liTarget : true;
    };

    if (isAt(BEGINNING)) {
      return insertBefore(liTarget, liElms, rootNode);
    } else if (isAt(END)) {
      return insertAfter(liTarget, liElms, rootNode, dom);
    }

    return insertMiddle(liTarget, liElms, rootNode, rng);
  };

  ibis.InsertList = {
    isListFragment: isListFragment,
    insertAtCaret: insertAtCaret,
    isParentBlockLi: isParentBlockLi,
    trimListItems: trimListItems,
    listItems: listItems
  };

})(ibis);