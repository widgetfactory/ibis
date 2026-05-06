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
  var DOM = ibis.DOM,
    Event = ibis.dom.Event,
    Dispatcher = ibis.util.Dispatcher;

  /**
   * This class is used to create text / input boxes.
   *
   * @class ibis.ui.TextBox
   * @extends ibis.ui.Control
   * @example
   */
  ibis.create('ibis.ui.TextBox:ibis.ui.Control', {
    /**
     * Constructs a new textbox control instance.
     *
     * @constructor
     * @method TextBox
     * @param {String} id Control id for the list box.
     * @param {Object} s Optional name/value settings object.
     * @param {Editor} ed Optional the editor instance this button is for.
     */
    TextBox: function (id, s, ed) {
      s = ibis.extend({
        class: '',
        title: ''
      }, s);

      this._super(id, s, ed);

      this.type = 'textbox';

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

      this.classPrefix = 'mceTextBox';
    },

    /**
     * Sets / gets the input value.
     *
     * @method select
     * @param {String/function} val Value to set for the textbox.
     */
    value: function (val) {
      if (!arguments.length) {
        return DOM.getValue(this.id);
      }

      DOM.setValue(this.id, val);

      if (this.settings.subtype == 'color') {
        DOM.setValue(this.id + '_color', val);
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
      var html = '',
        prefix = this.classPrefix, s = this.settings;

      var type = s.subtype ? s.subtype : 'text';

      var attribs = {
        type: type,
        id: this.id,
        class: prefix + ' ' + s['class'],
        title: DOM.encode(s.title),
        tabindex: 0
      };

      if (s.description) {
        attribs['aria-describedby'] = this.id + '_description';
      }

      attribs = ibis.extend(attribs, s.attributes || {});

      if (s.multiline) {
        html += DOM.createHTML('textarea', attribs, '');
      } else {
        if (type == 'color') {
          attribs.type = 'text';

          html += DOM.createHTML('input', {
            type: 'color',
            id: this.id + '_color'
          });

        }

        html += DOM.createHTML('input', attribs);
      }

      if (s.description) {
        html += DOM.createHTML('span', {
          class: prefix + 'Description',
          id: this.id + '_description'
        }, DOM.encode(s.description));
      }

      if (s.button) {
        html += DOM.createHTML('button', {
          id: this.id + '_button',
          class: 'mceButton',
          title: DOM.encode(s.button.label || '')
        }, '<span role="presentation" class="mceIcon mce_' + s.button.icon + '"></span>');
      }

      return html;
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

      if (s.onchange && typeof s.onchange === 'function') {
        this.onChange.add(s.onchange);
      }

      Event.add(this.id, 'change', function () {
        self.onChange.dispatch(this, DOM.get(self.id));
      });

      if (s.button) {
        Event.add(this.id + '_button', 'click', function (e) {
          e.preventDefault();

          s.button.click.apply(self);
        });
      }

      if (s.subtype == 'color') {
        Event.add(this.id, 'change', function (e) {
          DOM.setValue(this.id + '_color', DOM.get(self.id).value);
        });

        if (s.colorpicker) {
          Event.add(this.id + '_color', 'click', function (e) {
            e.preventDefault();
            s.colorpicker.apply(self);
          });
        } else {
          Event.add(this.id + '_color', 'change', function (e) {
            DOM.setValue(self.id, DOM.get(self.id + '_color').value);
          });
        }
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

        if (this.settings.subtype && this.settings.subtype == 'color') {
          var color = DOM.get(this.id + '_color');

          if (color) {
            color.disabled = state;
          }

        }
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