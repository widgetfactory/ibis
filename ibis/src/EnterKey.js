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
  var TreeWalker = ibis.dom.TreeWalker,
    RangeUtils = ibis.dom.RangeUtils,
    NodeType = ibis.dom.NodeType,
    CaretContainer = ibis.caret.CaretContainer;

  /**
     * Contains logic for handling the enter key to split/generate block elements.
     */
  ibis.EnterKey = function (editor) {
    var dom = editor.dom,
      selection = editor.selection,
      settings = editor.settings,
      undoManager = editor.undoManager,
      schema = editor.schema;
    var nonEmptyElementsMap = schema.getNonEmptyElements(),
      moveCaretBeforeOnEnterElementsMap = schema.getMoveCaretBeforeOnEnterElements();

    editor.onNewBlock = new ibis.util.Dispatcher();

    function handleEnterKey(evt) {
      var rng = selection.getRng(true),
        tmpRng, editableRoot, container, offset, parentBlock, shiftKey,
        newBlock, fragment, containerBlock, parentBlockName, containerBlockName, newBlockName, isAfterLastNodeInContainer,
        caretAtCEFalse;

      // Returns true if the block can be split into two blocks or not
      function canSplitBlock(node) {
        return node &&
          dom.isBlock(node) &&
          !/^(TD|TH|CAPTION|FORM)$/.test(node.nodeName) &&
          !/^(fixed|absolute)/i.test(node.style.position) &&
          dom.getContentEditable(node) !== "true" &&
          // prevent splitting of internal
          !node.hasAttribute('data-mce-type');
      }

      function isTableCell(node) {
        return node && /^(TD|TH|CAPTION)$/.test(node.nodeName);
      }

      // Renders empty block on IE
      function renderBlockOnIE(block) {
        var oldRng;

        if (dom.isBlock(block)) {
          oldRng = selection.getRng();
          block.appendChild(dom.create('span', null, '\u00a0'));
          selection.select(block);
          block.lastChild.outerHTML = '';
          selection.setRng(oldRng);
        }
      }

      // Remove the first empty inline element of the block so this: <p><b><em></em></b>x</p> becomes this: <p>x</p>
      function trimInlineElementsOnLeftSideOfBlock(block) {
        var node = block,
          firstChilds = [],
          i;

        if (!node) {
          return;
        }

        // Find inner most first child ex: <p><i><b>*</b></i></p>
        while ((node = node.firstChild)) {
          if (dom.isBlock(node)) {
            return;
          }

          if (node.nodeType == 1 && !nonEmptyElementsMap[node.nodeName.toLowerCase()]) {
            firstChilds.push(node);
          }
        }

        i = firstChilds.length;
        while (i--) {
          node = firstChilds[i];
          if (!node.hasChildNodes() || (node.firstChild == node.lastChild && node.firstChild.nodeValue === '')) {
            dom.remove(node);
          } else {
            // Remove <a> </a> see #5381
            if (node.nodeName == "A" && (node.innerText || node.textContent) === ' ') {
              dom.remove(node);
            }
          }
        }
      }

      // Moves the caret to a suitable position within the root for example in the first non
      // pure whitespace text node or before an image
      function moveToCaretPosition(root) {
        var walker, node, rng, lastNode = root,
          tempElm;

        function firstNonWhiteSpaceNodeSibling(node) {
          while (node) {
            if (node.nodeType == 1 || (node.nodeType == 3 && node.data && /[\r\n\s]/.test(node.data))) {
              return node;
            }

            node = node.nextSibling;
          }
        }

        if (!root) {
          return;
        }

        if (/^(LI|DT|DD)$/.test(root.nodeName)) {
          var firstChild = firstNonWhiteSpaceNodeSibling(root.firstChild);

          if (firstChild && /^(UL|OL|DL)$/.test(firstChild.nodeName)) {
            root.insertBefore(dom.doc.createTextNode('\u00a0'), root.firstChild);
          }
        }

        rng = dom.createRng();

        // Normalize whitespace to remove empty text nodes. Fix for: #6904
        // Gecko will be able to place the caret in empty text nodes but it won't render propery
        // Older IE versions will sometimes crash so for now ignore all IE versions
        root.normalize();

        if (root.hasChildNodes()) {
          walker = new TreeWalker(root, root);

          while ((node = walker.current())) {
            if (node.nodeType == 3) {
              rng.setStart(node, 0);
              rng.setEnd(node, 0);
              break;
            }

            if (moveCaretBeforeOnEnterElementsMap[node.nodeName.toLowerCase()]) {
              rng.setStartBefore(node);
              rng.setEndBefore(node);
              break;
            }

            lastNode = node;
            node = walker.next();
          }

          if (!node) {
            rng.setStart(lastNode, 0);
            rng.setEnd(lastNode, 0);
          }
        } else {
          if (root.nodeName == 'BR') {
            if (root.nextSibling && dom.isBlock(root.nextSibling)) {
              rng.setStartBefore(root);
              rng.setEndBefore(root);
            } else {
              rng.setStartAfter(root);
              rng.setEndAfter(root);
            }
          } else {
            rng.setStart(root, 0);
            rng.setEnd(root, 0);
          }
        }

        selection.setRng(rng);

        // Remove tempElm created for old IE:s
        dom.remove(tempElm);
        selection.scrollIntoView(root);
      }

      function setForcedBlockAttrs(node) {
        var forcedRootBlockName = settings.forced_root_block;

        if (forcedRootBlockName && forcedRootBlockName.toLowerCase() === node.tagName.toLowerCase()) {
          dom.setAttribs(node, settings.forced_root_block_attrs);
        }
      }

      function emptyBlock(elm) {
        // BR is needed in empty blocks on non IE browsers
        elm.innerHTML = '<br data-mce-bogus="1">';
      }

      // Creates a new block element by cloning the current one or creating a new one if the name is specified
      // This function will also copy any text formatting from the parent block and add it to the new one
      function createNewBlock(name) {
        var node = container,
          block, clonedNode, caretNode, textInlineElements = schema.getTextInlineElements();

        if (name || parentBlockName == "TABLE") {
          block = dom.create(name || newBlockName);
          setForcedBlockAttrs(block);
        } else {
          block = settings.enterkey_keep_attributes ? parentBlock.cloneNode(false) : dom.create(parentBlock.nodeName);
        }

        caretNode = block;

        // Clone any parent styles
        if (settings.enterkey_keep_styles === true) {
          do {
            if (textInlineElements[node.nodeName]) {
              // Never clone a caret containers
              if (node.id == '_mce_caret') {
                continue;
              }

              clonedNode = node.cloneNode(false);
              dom.setAttrib(clonedNode, 'id', ''); // Remove ID since it needs to be document unique

              if (block.hasChildNodes()) {
                clonedNode.appendChild(block.firstChild);
                block.appendChild(clonedNode);
              } else {
                caretNode = clonedNode;
                block.appendChild(clonedNode);
              }
            }
          } while ((node = node.parentNode) && node != editableRoot);
        } else {
          dom.setAttrib(block, 'style', null); // wipe out any styles that came over with the block
          dom.setAttrib(block, 'class', null);
        }

        // BR is needed in empty blocks on non IE browsers
        caretNode.innerHTML = '<br data-mce-bogus="1">';

        return block;
      }

      // Returns true/false if the caret is at the start/end of the parent block element
      function isCaretAtStartOrEndOfBlock(start) {
        var walker, node, name;

        // Caret is in the middle of a text node like "a|b"
        if (container.nodeType == 3 && (start ? offset > 0 : offset < container.nodeValue.length)) {
          return false;
        }

        // If after the last element in block node edge case for #5091
        if (container.parentNode == parentBlock && isAfterLastNodeInContainer && !start) {
          return true;
        }

        // If the caret is before the first element in parentBlock
        if (start && container.nodeType == 1 && container == parentBlock.firstChild) {
          return true;
        }

        // Caret can be before/after a table
        if (container.nodeName === "TABLE" || (container.previousSibling && container.previousSibling.nodeName == "TABLE")) {
          return (isAfterLastNodeInContainer && !start) || (!isAfterLastNodeInContainer && start);
        }

        // Caret can be before/after a contenteditable|false
        if (NodeType.isContentEditableFalse(container) || (container.previousSibling && NodeType.isContentEditableFalse(container.previousSibling))) {
          caretAtCEFalse = true;
          return (isAfterLastNodeInContainer && !start) || (!isAfterLastNodeInContainer && start);
        }
        caretAtCEFalse = false;

        // Walk the DOM and look for text nodes or non empty elements
        walker = new TreeWalker(container, parentBlock);

        // If caret is in beginning or end of a text block then jump to the next/previous node
        if (container.nodeType == 3) {
          if (start && offset === 0) {
            walker.prev();
          } else if (!start && offset == container.nodeValue.length) {
            walker.next();
          }
        }

        while ((node = walker.current())) {
          if (node.nodeType === 1) {
            // Ignore bogus elements
            if (!node.getAttribute('data-mce-bogus')) {
              // Keep empty elements like <img /> <input /> but not trailing br:s like <p>text|<br></p>
              name = node.nodeName.toLowerCase();
              if (nonEmptyElementsMap[name] && name !== 'br') {
                return false;
              }
            }
          } else if (node.nodeType === 3 && !/^[ \t\r\n]*$/.test(node.nodeValue)) {
            return false;
          }

          if (start) {
            walker.prev();
          } else {
            walker.next();
          }
        }

        return true;
      }

      // Wraps any text nodes or inline elements in the specified forced root block name
      function wrapSelfAndSiblingsInDefaultBlock(container, offset) {
        var newBlock, parentBlock, startNode, node, next, rootBlockName, blockName = newBlockName || 'P';

        // Not in a block element or in a table cell or caption
        parentBlock = dom.getParent(container, dom.isBlock);

        if (!parentBlock || !canSplitBlock(parentBlock)) {
          parentBlock = parentBlock || editableRoot;

          // check if parentBlock is root, ie: <body> or fake root
          if (parentBlock == editableRoot || isTableCell(parentBlock)) {
            rootBlockName = parentBlock.nodeName.toLowerCase();
          } else {
            rootBlockName = parentBlock.parentNode.nodeName.toLowerCase();
          }

          if (!parentBlock.hasChildNodes()) {
            newBlock = dom.create(blockName);
            setForcedBlockAttrs(newBlock);
            parentBlock.appendChild(newBlock);
            rng.setStart(newBlock, 0);
            rng.setEnd(newBlock, 0);
            return newBlock;
          }

          // Find parent that is the first child of parentBlock
          node = container;

          while (node && node.parentNode != parentBlock) {
            node = node.parentNode;
          }

          // Loop left to find start node start wrapping at
          while (node && !dom.isBlock(node)) {
            startNode = node;
            node = node.previousSibling;
          }

          if (startNode && schema.isValidChild(rootBlockName, blockName.toLowerCase())) {
            newBlock = dom.create(blockName);
            setForcedBlockAttrs(newBlock);
            startNode.parentNode.insertBefore(newBlock, startNode);

            // Start wrapping until we hit a block
            node = startNode;
            while (node && !dom.isBlock(node)) {
              next = node.nextSibling;
              newBlock.appendChild(node);
              node = next;
            }

            // Restore range to it's past location
            rng.setStart(container, offset);
            rng.setEnd(container, offset);
          }
        }

        return container;
      }

      // Inserts a block or br before/after or in the middle of a split list of the LI is empty
      function handleEmptyListItem() {
        function isFirstOrLastLi(first) {
          var node = containerBlock[first ? 'firstChild' : 'lastChild'];

          // Find first/last element since there might be whitespace there
          while (node) {
            if (node.nodeType == 1) {
              break;
            }

            node = node[first ? 'nextSibling' : 'previousSibling'];
          }

          return node === parentBlock;
        }

        function getContainerBlock() {
          var containerBlockParent = containerBlock.parentNode;

          if (/^(LI|DT|DD)$/.test(containerBlockParent.nodeName)) {
            return containerBlockParent;
          }

          return containerBlock;
        }

        if (containerBlock == editor.getBody()) {
          return;
        }

        // Check if we are in an nested list
        var containerBlockParentName = containerBlock.parentNode.nodeName;
        if (/^(OL|UL|LI)$/.test(containerBlockParentName)) {
          newBlockName = 'LI';
        }

        newBlock = newBlockName ? createNewBlock(newBlockName) : dom.create('BR');

        if (isFirstOrLastLi(true) && isFirstOrLastLi()) {
          if (containerBlockParentName == 'LI') {
            // Nested list is inside a LI
            dom.insertAfter(newBlock, getContainerBlock());
          } else {
            // Is first and last list item then replace the OL/UL with a text block
            dom.replace(newBlock, containerBlock);
          }
        } else if (isFirstOrLastLi(true)) {
          if (containerBlockParentName == 'LI') {
            // List nested in an LI then move the list to a new sibling LI
            dom.insertAfter(newBlock, getContainerBlock());
            newBlock.appendChild(dom.doc.createTextNode(' ')); // Needed for IE so the caret can be placed
            newBlock.appendChild(containerBlock);
          } else {
            // First LI in list then remove LI and add text block before list
            containerBlock.parentNode.insertBefore(newBlock, containerBlock);
          }
        } else if (isFirstOrLastLi()) {
          // Last LI in list then remove LI and add text block after list
          dom.insertAfter(newBlock, getContainerBlock());
          renderBlockOnIE(newBlock);
        } else {
          // Middle LI in list the split the list and insert a text block in the middle
          // Extract after fragment and insert it after the current block
          containerBlock = getContainerBlock();
          tmpRng = rng.cloneRange();
          tmpRng.setStartAfter(parentBlock);
          tmpRng.setEndAfter(containerBlock);
          fragment = tmpRng.extractContents();

          if (newBlockName == 'LI' && fragment.firstChild.nodeName == 'LI') {
            newBlock = fragment.firstChild;
            dom.insertAfter(fragment, containerBlock);
          } else {
            dom.insertAfter(fragment, containerBlock);
            dom.insertAfter(newBlock, containerBlock);
          }
        }

        dom.remove(parentBlock);
        moveToCaretPosition(newBlock);
        undoManager.add();
      }

      // Inserts a BR element if the forced_root_block option is set to false or empty string
      function insertBr() {
        editor.execCommand("InsertLineBreak", false, evt);
      }

      // Trims any linebreaks at the beginning of node user for example when pressing enter in a PRE element
      function trimLeadingLineBreaks(node) {
        do {
          if (node.nodeType === 3) {
            node.nodeValue = node.nodeValue.replace(/^[\r\n]+/, '');
          }

          node = node.firstChild;
        } while (node);
      }

      function getEditableRoot(node) {
        var root = dom.getRoot(),
          parent = node,
          editableRoot = null,
          ce;

        while (parent && parent !== root) {
          ce = dom.getContentEditable(parent);

          if (ce === "false" || ce === false) {
            break;
          }

          if (ce === "true" || ce === true) {
            editableRoot = parent;
          }

          parent = parent.parentNode;
        }

        // If we hit a non-editable boundary, return last editable root if we found one
        if (parent && parent !== root) {
          return editableRoot || root;
        }

        // Otherwise we're in the main editor root / no explicit editable region
        return root;
      }

      // Adds a BR at the end of blocks that only contains an IMG or INPUT since
      // these might be floated and then they won't expand the block
      function addBrToBlockIfNeeded(block) {
        var lastChild;


        block.normalize(); // Remove empty text nodes that got left behind by the extract

        // Check if the block is empty or contains a floated last child
        lastChild = block.lastChild;
        if (!lastChild || (/^(left|right)$/gi.test(dom.getStyle(lastChild, 'float', true)))) {
          dom.add(block, 'br');
        }
      }

      function insertNewBlockAfter() {
        // If the caret is at the end of a header we produce a P tag after it similar to Word unless we are in a hgroup
        if (/^(H[1-6]|PRE|FIGURE)$/.test(parentBlockName) && containerBlockName != 'HGROUP') {
          newBlock = createNewBlock(newBlockName);
        } else {
          newBlock = createNewBlock();
        }

        // Split the current container block element if enter is pressed inside an empty inner block element
        if (settings.end_container_on_empty_block && canSplitBlock(containerBlock) && dom.isEmpty(parentBlock)) {
          // Split container block for example a BLOCKQUOTE at the current blockParent location for example a P
          newBlock = dom.split(containerBlock, parentBlock);
        } else {
          dom.insertAfter(newBlock, parentBlock);
        }

        moveToCaretPosition(newBlock);
      }

      rng = selection.getRng(true);

      // Event is blocked by some other handler for example the lists plugin
      if (evt.isDefaultPrevented()) {
        return;
      }

      // Delete any selected contents
      if (!rng.collapsed) {
        editor.execCommand('Delete');
        return;
      }

      // Setup range items and newBlockName
      new RangeUtils(dom).normalize(rng);
      container = rng.startContainer;
      offset = rng.startOffset;
      newBlockName = settings.forced_root_block || 'p';

      // reset if force_block_newlines is false (linebreak on enter)
      if (settings.force_block_newlines === false) {
        newBlockName = '';
      }

      newBlockName = newBlockName ? newBlockName.toUpperCase() : '';
      shiftKey = evt.shiftKey;

      // Resolve node index
      if (container.nodeType == 1 && container.hasChildNodes()) {
        isAfterLastNodeInContainer = offset > container.childNodes.length - 1;

        container = container.childNodes[Math.min(offset, container.childNodes.length - 1)] || container;

        if (isAfterLastNodeInContainer && container.nodeType == 3) {
          offset = container.nodeValue.length;
        } else {
          offset = 0;
        }
      }

      // Get editable root node, normally the body element but sometimes a div or span
      editableRoot = getEditableRoot(container);

      // If there is no editable root then enter is done inside a contentEditable false element
      if (!editableRoot) {
        return;
      }

      undoManager.beforeChange();

      // If editable root isn't block nor the root of the editor
      /*if (!dom.isBlock(editableRoot) && editableRoot != dom.getRoot()) {
                if (!newBlockName || shiftKey) {
                    insertBr();
                }

                return;
            }*/

      // Wrap the current node and it's sibling in a default block if it's needed.
      // for example this <td>text|<b>text2</b></td> will become this <td><p>text|<b>text2</p></b></td>
      // This won't happen if root blocks are disabled or the shiftKey is pressed
      if ((newBlockName && !shiftKey) || (!newBlockName && shiftKey)) {
        container = wrapSelfAndSiblingsInDefaultBlock(container, offset);
      }

      // Find parent block and setup empty block paddings
      parentBlock = dom.getParent(container, dom.isBlock);

      containerBlock = parentBlock ? dom.getParent(parentBlock.parentNode, dom.isBlock) : null;

      // Setup block names
      parentBlockName = parentBlock ? parentBlock.nodeName.toUpperCase() : ''; // IE < 9 & HTML5
      containerBlockName = containerBlock ? containerBlock.nodeName.toUpperCase() : ''; // IE < 9 & HTML5

      // Enter inside block contained within a LI then split or insert before/after LI
      if (containerBlockName == 'LI' && !evt.ctrlKey) {
        parentBlock = containerBlock;
        parentBlockName = containerBlockName;
      }

      // Handle enter in list item
      if (/^(LI|DT|DD)$/.test(parentBlockName)) {
        if (!newBlockName && shiftKey) {
          insertBr();
          return;
        }

        // Handle enter inside an empty list item
        if (dom.isEmpty(parentBlock)) {
          handleEmptyListItem();
          return;
        }
      }

      // Don't split PRE tags but insert a BR instead easier when writing code samples etc
      if (parentBlockName == 'PRE' && settings.br_in_pre !== false) {
        if (!shiftKey) {
          insertBr();
          return;
        }
      } else {
        // If no root block is configured then insert a BR by default or if the shiftKey is pressed
        if ((!newBlockName && !shiftKey && parentBlockName != 'LI') || (newBlockName && shiftKey)) {
          insertBr();
          return;
        }
      }

      // If parent block is root then never insert new blocks
      if (newBlockName && parentBlock === editor.getBody()) {
        return;
      }

      // Default block name if it's not configured
      newBlockName = newBlockName || 'P';

      // Insert new block before/after the parent block depending on caret location
      if (CaretContainer.isCaretContainerBlock(parentBlock)) {
        newBlock = CaretContainer.showCaretContainerBlock(parentBlock);
        if (dom.isEmpty(parentBlock)) {
          emptyBlock(parentBlock);
        }
        moveToCaretPosition(newBlock);
      } else if (isCaretAtStartOrEndOfBlock()) {
        insertNewBlockAfter();
      } else if (isCaretAtStartOrEndOfBlock(true)) {
        // Capture before DOM mutation: ce=false may be inside the block (caretAtCEFalse) or
        // a preceding sibling block that RangeUtils resolved past when normalizing to a text node.
        var adjacentCEFalse = caretAtCEFalse || (parentBlock.previousSibling && NodeType.isContentEditableFalse(parentBlock.previousSibling));
        // Insert new block before
        newBlock = parentBlock.parentNode.insertBefore(createNewBlock(), parentBlock);
        renderBlockOnIE(newBlock);
        moveToCaretPosition(adjacentCEFalse ? newBlock : parentBlock);
      } else {
        // Extract after fragment and insert it after the current block
        tmpRng = rng.cloneRange();
        tmpRng.setEndAfter(parentBlock);
        fragment = tmpRng.extractContents();
        trimLeadingLineBreaks(fragment);
        newBlock = fragment.firstChild;

        dom.insertAfter(fragment, parentBlock);
        trimInlineElementsOnLeftSideOfBlock(newBlock);
        addBrToBlockIfNeeded(parentBlock);

        if (dom.isEmpty(parentBlock)) {
          emptyBlock(parentBlock);
        }

        // New block might become empty if it's <p><b>a |</b></p>
        // need to check for newBlock as it can be undefined in some instances (enter in paragraph converted from text in figcaption...)
        if (!newBlock || dom.isEmpty(newBlock)) {
          dom.remove(newBlock);
          insertNewBlockAfter();
        } else {
          moveToCaretPosition(newBlock);
        }

        newBlock.normalize();
      }

      dom.setAttrib(newBlock, 'id', ''); // Remove ID since it needs to be document unique

      // Allow custom handling of new blocks
      editor.onNewBlock.dispatch(editor, newBlock);

      undoManager.typing = false;
      undoManager.add();
    }

    editor.onKeyDown.add(function (ed, evt) {
      if (evt.keyCode == 13) {
        if (handleEnterKey(evt) !== false) {
          evt.preventDefault();
        }
      }
    });

    return {
      handleEnterKey: handleEnterKey
    };
  };
})(ibis);