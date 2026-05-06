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
  // Shorten class names
  var dom = ibis.DOM;
  /**
   * This class is used to create layouts. A layout is a container for other controls like buttons etc.
   *
   * @class ibis.ui.Layout
   * @extends ibis.ui.Container
   */
  ibis.create('ibis.ui.Layout:ibis.ui.Container', {
    /**
     * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
     * creating a whole toolbar with buttons it does make a lot of difference.
     *
     * @method renderHTML
     * @return {String} HTML for the toolbar control.
     */
    renderHTML: function () {
      var html = '',
        settings = this.settings,
        i;

      var controls = settings.controls || this.controls;

      for (i = 0; i < controls.length; i++) {
        html += controls[i].renderHTML();
      }

      this.controls = controls;

      return dom.createHTML('div', {
        id: this.id,
        'class': 'mceFlexLayout ' + (settings['class'] ? ' ' + settings['class'] : ''),
        role: 'group'
      }, html);
    },

    postRender: function () {
      var i;

      this._super();

      for (i = 0; i < this.controls.length; i++) {
        this.controls[i].postRender();
      }
    },

    destroy: function () {
      this._super();

      for (var i = 0; i < this.controls.length; i++) {
        this.controls[i].destroy();
      }

      delete this.lookup[this.id];
    }
  });
})(ibis);