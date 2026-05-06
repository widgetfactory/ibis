/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


import * as CutCopy from './CutCopy';
import * as Quirks from './Quirks';
import * as Process from './Process.js';
import * as DragDrop from './DragDrop';
import { PasteBin } from './PasteBin';
import * as Paste from './Paste.js';

var Dispatcher = ibis.util.Dispatcher;

ibis.Clipboard = function (editor) {
    var pasteBin = new PasteBin(editor);

    editor.onGetClipboardContent = new Dispatcher(this);
    editor.onPastePreProcess = new Dispatcher(this);
    editor.onPastePostProcess = new Dispatcher(this);
    editor.onPasteBeforeInsert = new Dispatcher(this);

    Quirks.setup(editor);

    Process.setup(editor);
  
    // IMPORTANT: The following event hooks need to be setup later so that other things
    // can hook in and prevent the event so core paste doesn't handle them.
    editor.onPreInit.add(function () {
      CutCopy.register(editor);
      DragDrop.setup(editor);
      Paste.setup(editor, pasteBin);
    });
};
