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
   * @class ibis.ui.Form
   * @extends ibis.ui.Container
   */
  ibis.create('ibis.ui.Form:ibis.ui.Container', {

    /**
       * Renders the form as a HTML string.
       *
       * @method renderHTML
       * @return {String} HTML for the form control.
       */
    renderHTML: function () {
      var html = '',
        settings = this.settings,
        i;

      if (settings.label) {
        html += '<legend>' + dom.encode(settings.label) + '</legend>';
      }

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i], s = ctrl.settings;

        if (s.subtype && s.subtype == 'hidden') {
          html += ctrl.renderHTML();
          continue;
        }

        html += '<div class="mceFormRow">';

        if (s.label && ctrl.type !== 'checkbox') {
          html += '<label for="' + ctrl.id + '" id="' + ctrl.id + '_label">' + dom.encode(s.label) + '</label>';
        }

        if (s.label && ctrl.type === 'checkbox' && s.label_position === 'before') {
          html += '<label for="' + ctrl.id + '" id="' + ctrl.id + '_label">' + dom.encode(s.label) + '</label>';
        }

        html += '	<div class="mceFormControl">';
        html += ctrl.renderHTML();
        html += '	</div>';

        if (s.label && ctrl.type === 'checkbox' && s.label_position !== 'before') {
          html += '<label for="' + ctrl.id + '" id="' + ctrl.id + '_label">' + dom.encode(s.label) + '</label>';
        }

        html += '</div>';
      }

      return dom.createHTML('fieldset', {
        id: this.id,
        'class': 'mceForm' + (settings['class'] ? ' ' + settings['class'] : ''),
        role: 'group'
      }, html);
    },

    submit: function () {
      var i, data = {};

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i];

        if (typeof ctrl.value === 'function') {
          data[ctrl.name] = ctrl.value();
        }
      }

      return data;
    },

    update: function (data) {
      var i;

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i];

        if (data[ctrl.name]) {
          if (typeof ctrl.value === 'function') {
            ctrl.value(data[ctrl.name]);
          }
        }
      }
    },

    empty: function () {
      var i;

      for (i = 0; i < this.controls.length; i++) {
        this.controls[i].remove();
      }

      this.controls = [];
      this.lookup = {};
    },

    add: function (ctrl) {
      if (!this.get(ctrl.id)) {
        return this._super(ctrl);
      }

      return false;
    },

    show: function (ctrl) {
      var elm = dom.get(ctrl.id), row = dom.getParent(elm, '.mceFormRow');

      if (row) {
        row.style.display = '';
      }
    },

    hide: function (ctrl) {
      var elm = dom.get(ctrl.id), row = dom.getParent(elm, '.mceFormRow');

      if (row) {
        row.style.display = 'none';
      }
    },

    postRender: function () {
      var i;

      this._super();

      for (i = 0; i < this.controls.length; i++) {
        this.controls[i].postRender();

        this.controls[i].elm = dom.get(this.controls[i].id);
      }
    }
  });
})(ibis);