/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var DOM = ibis.DOM,
    each = ibis.each,
    extend = ibis.extend,
    Event = ibis.dom.Event,
    Dispatcher = ibis.util.Dispatcher;

  /**
   * This class is used to create a size (dimension) control.
   *
   * @class ibis.ui.SizeBox
   * @extends ibis.ui.Control
   * @example
   */
  ibis.create('ibis.ui.SizeBox:ibis.ui.Control', {
    /**
     * Constructs a new textbox control instance.
     *
     * @constructor
     * @method TextBox
     * @param {String} id Control id for the list box.
     * @param {Object} s Optional name/value settings object.
     * @param {Editor} ed Optional the editor instance this button is for.
     */
    SizeBox: function (id, s, ed) {

      s = ibis.extend({
        class: ''
      }, s);

      this._super(id, s, ed);

      this.type = 'sizebox';

      /**
       * Fires when the selection has been changed.
       *
       * @event onChange
       */
      this.onChange = new Dispatcher(this);

      /**
       * Fires after the element has been rendered to DOM.
       *
       * @event onPostRender
       */
      this.onPostRender = new Dispatcher(this);

      this.classPrefix = 'mceSizeBox';
    },

    /**
     * Sets / gets the input value.
     *
     * @method select
     * @param {String/function} val Value to set for the textbox.
     */
    value: function (val) {
      var self = this;
      
      if (!arguments.length) {
        var values = {
          'width' : DOM.get(this.id + '_width').value,
          'height': DOM.get(this.id + '_height').value
        };

        return values;
      }

      if (typeof val === 'object') {
        each(['width', 'height'], function (name) {
          var value = val[name] || '';
          DOM.setValue(self.id + '_' + name, value);
        });

        return this;
      }
    },

    /**
     * Renders the text box as a HTML string. This method is much faster than using the DOM and when
     * creating a whole toolbar with buttons it does make a lot of difference.
     *
     * @method renderHTML
     * @return {String} HTML for the text control element.
     */
    renderHTML: function () {
      var self = this, html = '',
        prefix = this.classPrefix, s = this.settings;

      var type = s.subtype ? s.subtype : 'text';

      html += '<div class="' + prefix + '">';

      var controls = [];

      each(['width', 'height'], function (name) {

        var attribs = extend({
          type: type,
          class: 'mceTextBox ' + s['class'],
          tabindex: 0
        }, s.attributes || {});

        attribs.id = self.id + '_' + name;
        attribs.name = name;

        controls.push(DOM.createHTML('input', attribs));
      });

      html += controls.join('<span class="mceSeparator">x</span>');

      // add a checkbox to trigger proportional sizing
      html += '<input type="checkbox" id="' + self.id + '_proportional" class="mceCheckBox" />';

      html += '</div>';

      return html;
    },

    updateSize: function (name, fromInput) {
      var other, tmp, temp;

      // get the value of the current input element
      var value = DOM.get(this.id + '_' + name).value;

      var values = this.value(),
        constrain = DOM.get(this.id + '_proportional').checked;

      for (var key in values) {
        if (key === name) {
          tmp = values[key];

          values[key] = value;
        } else {
          other = DOM.get(this.id + '_' + key).value;
          values[key] = other;
        }
      }

      // update values
      this.value(values);

      // passed in value, not altered
      if (!fromInput) {
        return;
      }

      if (tmp && value && other) {

        if (value.indexOf('%') !== -1 || other.indexOf('%') !== -1) {
          return;
        }

        if (constrain) {
          temp = ((value / tmp) * other).toFixed(0);
        }
      }

      for (var key in values) {
        if (key === name) {
          values[key] = value;
        } else {
          values[key] = temp || other;

          // set the other field
          if (temp) {
            DOM.setValue(this.id + '_' + key, temp);
          }
        }
      }

      // update values
      this.value(values);
    },

    /**
     * Post render event. This will be executed after the control has been rendered and can be used to
     * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this._super().
     *
     * @method postRender
     */
    postRender: function () {
      var self = this, s = this.settings;

      if (typeof s.value !== 'undefined') {
        this.value(s.value);
      }

      each(['width', 'height'], function (name) {
        Event.add(self.id + '_' + name, 'change', function (e) {
          var fromInput = !!e.target.nodeType;

          self.updateSize(name, fromInput);

          self.onChange.dispatch(self, this);
        });
      });

      if (s.onchange && typeof s.onchange === 'function') {
        this.onChange.add(s.onchange);
      }

      this.onPostRender.dispatch(this, DOM.get(this.id));
    },

    /**
     * Sets the disabled state for the control. This will add CSS classes to the
     * element that contains the control. So that it can be disabled visually.
     *
     * @method setDisabled
     * @param {Boolean} state Boolean state if the control should be disabled or not.
     */
    setDisabled: function (state) {
      this._super(state);

      var elm = DOM.get(this.id);

      if (elm) {
        elm.disabled = state;
      }
    },

    /**
     * Destroys the TextBox i.e. clear memory and events.
     *
     * @method destroy
     */
    destroy: function () {
      this._super();

      Event.clear(this.id);
    }
  });
})(ibis);