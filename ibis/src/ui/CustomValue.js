/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var each = ibis.each;

  /**
   * This class is used to create text / input boxes.
   *
   * @class ibis.ui.CustomValue
   * @extends ibis.ui.Control
   * @example
   */
  ibis.create('ibis.ui.CustomValue:ibis.ui.Form', {
    /**
     * Constructs a new textbox control instance.
     *
     * @constructor
     * @method TextBox
     * @param {String} id Control id for the list box.
     * @param {Object} s Optional name/value settings object.
     * @param {Editor} ed Optional the editor instance this button is for.
     */
    CustomValue: function (id, settings, ed) {
      settings = ibis.extend(settings, {
        class: 'mceFormRow'
      });

      this._super(id, settings, ed);

      var name = new ibis.ui.TextBox(this.id + '_name', {
        name: 'name',
        label: ed.getLang('label_name', 'Name'),
        attributes: {
          autocomplete: false
        }
      });

      var value = new ibis.ui.TextBox(this.id + '_value', {
        name: 'value',
        label: ed.getLang('label_value', 'Value'),
        attributes: {
          autocomplete: false
        }
      });

      if (settings.values && settings.values.length) {
        name = new ibis.ui.ListBox(this.id + '_name', {
          name: 'name',
          label: ed.getLang('label_name', 'Name'),
          combobox: true
        });

        each(settings.values, function (val) {
          name.add(val, val);
        });
      }

      this.add(name);
      this.add(value);
    },

    renderHTML: function () {
      var self = this;
      
      for (var i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i];
        ctrl.id = self.id + '_' + ctrl.name;
      }

      return this._super();
    },

    value: function (values) {
      if (arguments.length) {

        if (typeof values != "object") {
          return this;
        }

        for (var key in values) {
          this.controls[0].value(key);
          this.controls[1].value(values[key]);
        }

        return this;
      }

      var key = this.controls[0].value();

      if (key) {
        var data = {};

        data[key] = this.controls[1].value();

        return data;
      }

      return '';
    }
  });
})(ibis);