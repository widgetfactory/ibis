/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


var internalMimeType = 'x-ibis/html';
var internalMark = '<!-- ' + internalMimeType + ' -->';

var mark = function (html) {
  return internalMark + html;
};

var unmark = function (html) {
  return html.replace(internalMark, '');
};

var isMarked = function (html) {
  return html.indexOf(internalMark) !== -1;
};

var internalHtmlMime = function () {
  return internalMimeType;
};

export {
  mark,
  unmark,
  isMarked,
  internalHtmlMime
};