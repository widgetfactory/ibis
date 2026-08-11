/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var DOM = ibis.DOM,
    Event = ibis.dom.Event,
    each = ibis.each,
    Dispatcher = ibis.util.Dispatcher;

  ibis.create('ibis.ui.Radio:ibis.ui.Control', {
    Radio: function (id, s, ed) {
      this._super(id, s, ed);

      this.type = 'radio';

      if (typeof s.value === 'undefined') {
        s.value = '';
      }

      this.onChange = new Dispatcher(this);
      this.onPostRender = new Dispatcher(this);
      this.classPrefix = 'mceRadio';
    },

    value: function (val) {
      if (!arguments.length) {
        return this.checked() ? this.settings.value : undefined;
      }

      this.checked(val === this.settings.value);
    },

    checked: function (state) {
      var elm = DOM.get(this.id);

      if (!arguments.length) {
        return elm.checked;
      }

      if (this.isDisabled()) {
        return;
      }

      this.setState('checked', !!state);
      elm.checked = !!state;
    },

    renderHTML: function () {
      var html = '',
        prefix = this.classPrefix,
        s = this.settings;

      html += '<input type="radio" id="' + this.id + '" value="' + s.value + '" class="' + prefix + ' ' + (s['class'] || '') + '" title="' + DOM.encode(s.title || '') + '"';

      if (s.name) {
        html += ' name="' + s.name + '"';
      }

      if (s.attributes) {
        each(s.attributes, function (val, key) {
          html += ' ' + key + '="' + val + '"';
        });
      }

      html += ' />';

      return html;
    },

    postRender: function () {
      var self = this, s = this.settings;

      if (s.onchange && typeof s.onchange === 'function') {
        this.onChange.add(s.onchange);
      }

      Event.add(this.id, 'click', function () {
        self.checked(self.checked());
      });

      Event.add(this.id, 'change', function () {
        self.onChange.dispatch(this, DOM.get(self.id));
      });

      this.onPostRender.dispatch(this, DOM.get(this.id));
    },

    setDisabled: function (state) {
      this._super(state);
      DOM.get(this.id).disabled = state;
    },

    destroy: function () {
      this._super();
      Event.clear(this.id);
    }
  });
})(ibis);
