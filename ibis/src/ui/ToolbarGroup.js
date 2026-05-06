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
  var dom = ibis.DOM,
    each = ibis.each,
    Event = ibis.dom.Event;
  /**
	 * This class is used to group a set of toolbars together and control the keyboard navigation and focus.
	 *
	 * @class ibis.ui.ToolbarGroup
	 * @extends ibis.ui.Container
	 */
  ibis.create('ibis.ui.ToolbarGroup:ibis.ui.Container', {
    /**
		 * Renders the toolbar group as a HTML string.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the toolbar control.
		 */
    renderHTML: function () {
      var html = [],
        controls = this.controls,
        each = ibis.each;

      each(controls, function (toolbar) {
        html.push(toolbar.renderHTML());
      });

      var group = dom.create('div', {
        id: this.id,
        role: 'group',
        class : this.settings["class"] ? (this.classPrefix + this.settings["class"]) : ''
      }, html.join(''));

      return dom.getOuterHTML(group);
    },

    focus: function () {
      dom.get(this.id).focus();
    },

    postRender: function () {
      var editor = this.editor,
        settings = this.settings,
        id = this.id,
        items = [];

      each(this.controls, function (toolbar) {
        each(toolbar.controls, function (control) {
          if (control.id) {
            items.push(control);
          }
        });
      });

      this.keyNav = new ibis.ui.KeyboardNavigation({
        root: id,
        items: items,
        onCancel: function () {
          //Move focus if webkit so that navigation back will read the item.
          if (ibis.isWebKit) {
            dom.get(editor.id + "_ifr").focus();
          }
          editor.focus();
        },
        excludeFromTabOrder: !settings.tab_focus_toolbar
      });
    },

    destroy: function () {
      this._super();
      this.keyNav.destroy();
      Event.clear(this.id);
    }
  });
})(ibis);