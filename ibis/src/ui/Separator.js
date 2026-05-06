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
 * This class is used to create vertical separator between other controls.
 *
 * @class ibis.ui.Separator
 * @extends ibis.ui.Control
 */
ibis.create('ibis.ui.Separator:ibis.ui.Control', {
  /**
     * Separator constructor.
     *
     * @constructor
     * @method Separator
     * @param {String} id Control id to use for the Separator.
     * @param {Object} s Optional name/value settings object.
     */
  Separator: function (id, s) {
    this._super(id, s);
    this.classPrefix = 'mceSeparator';
    this.setDisabled(true);
  },

  /**
     * Renders the separator as a HTML string. This method is much faster than using the DOM and when
     * creating a whole toolbar with buttons it does make a lot of difference.
     *
     * @method renderHTML
     * @return {String} HTML for the separator control element.
     */
  renderHTML: function () {
    return ibis.DOM.createHTML('span', {
      'class': this.classPrefix,
      role: 'separator',
      'aria-orientation': 'vertical',
      tabindex: '-1'
    }, '');
  }
});