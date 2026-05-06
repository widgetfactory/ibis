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

      each(['width', 'height'], function (name) {

        var attribs = extend({
          type: type,
          class: prefix + ' ' + s['class'],
          tabindex: 0
        }, s.attributes || {});

        attribs.id = this.id + '_' + name;
        attribs.name = name;

        html += DOM.createHTML('input', attribs);
      });

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