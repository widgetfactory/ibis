/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  // Shorten class names
  var dom = ibis.DOM, each = ibis.each, count = 0;
  /**
   * This class is used to create layouts. A layout is a container for other controls like buttons etc.
   *
   * @class ibis.ui.Repeatable
   * @extends ibis.ui.Container
   */
  ibis.create('ibis.ui.Repeatable:ibis.ui.Container', {
    /**
       * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
       * creating a whole toolbar with buttons it does make a lot of difference.
       *
       * @method renderHTML
       * @return {String} HTML for the toolbar control.
       */
    renderHTML: function () {
      var settings = this.settings, i, html = '', controls = this.controls;

      for (i = 0; i < controls.length; i++) {
        html += controls[i].renderHTML();
      }

      return dom.createHTML('div', {
        id: this.id,
        'class': 'mceForm mceRepeatable' + (settings['class'] ? ' ' + settings['class'] : ''),
        role: 'group'
      }, html);
    },

    value: function (values) {
      var self = this, i, controls = this.controls;

      if (arguments.length) {
        // update all items with values
        for (i = 0; i < controls.length; i++) {
          controls[i].value(values.shift());
        }

        // for each set of remaining values, create a repeatable item
        each(values, function (val) {
          self.addItem(val);
        });

        return this;
      }

      var values = [];

      for (i = 0; i < this.controls.length; i++) {
        var value = this.controls[i].value();

        if (value) {
          values = values.concat(value);
        }
      }

      return values;
    },

    getItemControl: function () {
      var settings = this.settings;

      var item = settings.item || { type : 'TextBox', settings : {} }, cls = ibis.ui[item.type || 'TextBox'];

      return new cls(this.id + '_item_' + item.id, item.settings || {}, this.editor);
    },

    addItem: function (value) {
      var self = this;

      var item = this.getItemControl();

      var ctrl = new ibis.ui.RepeatableItem(self.id + '_item_' + (count++), {
        controls: [item]
      });

      self.add(ctrl);
      ctrl.renderTo(dom.get(self.id));

      if (value) {
        ctrl.value(value);
      }

      return ctrl;
    },

    postRender: function () {
      var self = this, elm = dom.get(this.id);

      dom.bind(elm, 'click', function (e) {
        e.preventDefault();

        var btn = dom.getParent(e.target, 'button');

        if (!btn) {
          return;
        }

        var ctrlElm = btn.parentNode, index = dom.nodeIndex(ctrlElm);

        if (index == 0) {
          self.addItem();
        } else {
          self.get(ctrlElm.id).remove();
        }
      });

      this.addItem();
    },

    destroy: function () {
      this._super();
      this.controls = [];
    }
  });
})(ibis);