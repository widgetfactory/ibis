/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


import * as InternalHtml from './InternalHtml.js';
import * as FakeClipboard from './FakeClipboard.js';

var noop = function () { };

var hasWorkingClipboardApi = function (clipboardData) {
    // iOS supports the clipboardData API but it doesn't do anything for cut operations
    return ibis.isIOS === false && clipboardData !== undefined && typeof clipboardData.setData === 'function';
};

var setHtml5Clipboard = function (clipboardData, html, text) {
    // set FakeClipboard data for all instances
    FakeClipboard.clearData();
    FakeClipboard.setData('text/html', html);
    FakeClipboard.setData('text/plain', text);
    FakeClipboard.setData(InternalHtml.internalHtmlMime(), html);
    
    if (hasWorkingClipboardApi(clipboardData)) {
        try {
            clipboardData.clearData();
            clipboardData.setData('text/html', html);
            clipboardData.setData('text/plain', text);
            clipboardData.setData(InternalHtml.internalHtmlMime(), html);

            return true;
        } catch (e) {
            return false;
        }
    } else {
        return false;
    }
};

var setClipboardData = function (evt, data, fallback, done) {
    if (setHtml5Clipboard(evt.clipboardData, data.html, data.text)) {
        evt.preventDefault();
        done();
    } else {
        fallback(data.html, done);
    }
};

var fallback = function (editor) {
    return function (html, done) {
        var markedHtml = InternalHtml.mark(html);
        var outer = editor.dom.create('div', {
            contenteditable: "false",
            "data-mce-bogus": "all"
        });

        var inner = editor.dom.create('div', {
            contenteditable: "true",
            "data-mce-bogus": "all"
        }, markedHtml);

        editor.dom.setStyles(outer, {
            position: 'fixed',
            left: '-3000px',
            width: '1000px',
            overflow: 'hidden'
        });

        outer.appendChild(inner);
        editor.dom.add(editor.getBody(), outer);

        var range = editor.selection.getRng();
        inner.focus();

        var offscreenRange = editor.dom.createRng();
        offscreenRange.selectNodeContents(inner);
        editor.selection.setRng(offscreenRange);

        setTimeout(function () {
            outer.parentNode.removeChild(outer);
            editor.selection.setRng(range);
            done();
        }, 0);
    };
};

var getData = function (editor) {
    return {
        html: editor.selection.getContent({
            contextual: true
        }),
        text: editor.selection.getContent({
            format: 'text'
        })
    };
};

var isTableSelection = function (editor) {
    return !!editor.dom.getParent(editor.selection.getStart(), 'td.mceSelected,th.mceSelected', editor.getBody());
};

var hasSelectedContent = function (editor) {
    return !editor.selection.isCollapsed() || isTableSelection(editor);
};

var cut = function (editor, evt) {
    if (!evt.isDefaultPrevented() && hasSelectedContent(editor)) {
        setClipboardData(evt, getData(editor), fallback(editor), function () {
            var rng = editor.selection.getRng();
            // Chrome fails to execCommand from another execCommand with this message:
            // "We don't execute document.execCommand() this time, because it is called recursively.""
            setTimeout(function () { // detach
                editor.selection.setRng(rng);
                editor.execCommand('Delete');
            }, 0);
        });
    }
};

var copy = function (editor, evt) {
    if (!evt.isDefaultPrevented() && hasSelectedContent(editor)) {
        setClipboardData(evt, getData(editor), fallback(editor), noop);
    }
};

var register = function (editor) {
    editor.onCut.add(cut);
    editor.onCopy.add(copy);
};

export {
    register
};