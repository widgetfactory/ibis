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
  var DOM = ibis.DOM;

  /**
	 * This class is the base class for all controls like buttons, toolbars, containers. This class should not
	 * be instantiated directly other controls should inherit from this one.
	 *
	 * @class ibis.ui.Control
	 */
  ibis.create('ibis.ui.Control', {
    /**
		 * Constructs a new control instance.
		 *
		 * @constructor
		 * @method Control
		 * @param {String} id Control id.
		 * @param {Object} settings Optional name/value settings object.
		 */
    Control: function (id, settings, editor) {
      this.id = id;
      this.settings = settings || {};
      this.rendered = false;
      this.onRender = new ibis.util.Dispatcher(this);
      this.classPrefix = 'mce';
      this.scope = this.settings.scope || this;
      this.disabled = 0;
      this.active = 0;
      this.editor = editor;

      this.type = 'control'; // default control type

      this.name = this.settings.name || id;
    },

    setAriaProperty: function (property, value) {
      var element = DOM.get(this.id + '_aria') || DOM.get(this.id);

      if (element) {
        element.setAttribute('aria-' + property, '' + !!value);
      }
    },

    focus: function () {
      DOM.get(this.id).focus();
    },

    /**
		 * Sets the disabled state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be disabled visually.
		 *
		 * @method setDisabled
		 * @param {Boolean} state Boolean state if the control should be disabled or not.
		 */
    setDisabled: function (state) {
      if (state != this.disabled) {
        this.setAriaProperty('disabled', state);

        this.setState('Disabled', state);
        this.setState('Enabled', !state);

        this.disabled = state;
      }
    },

    /**
		 * Returns true/false if the control is disabled or not. This is a method since you can then
		 * choose to check some class or some internal bool state in subclasses.
		 *
		 * @method isDisabled
		 * @return {Boolean} true/false if the control is disabled or not.
		 */
    isDisabled: function () {
      return this.disabled;
    },

    /**
		 * Sets the activated state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be activated visually.
		 *
		 * @method setActive
		 * @param {Boolean} s Boolean state if the control should be activated or not.
		 */
    setActive: function (s) {
      if (s != this.active) {
        this.setState('Active', s);
        this.active = s;
        this.setAriaProperty('current', s);
      }
    },

    /**
		 * Returns true/false if the control is disabled or not. This is a method since you can then
		 * choose to check some class or some internal bool state in subclasses.
		 *
		 * @method isActive
		 * @return {Boolean} true/false if the control is disabled or not.
		 */
    isActive: function () {
      return this.active;
    },

    /**
		 * Sets the specified class state for the control.
		 *
		 * @method setState
		 * @param {String} c Class name to add/remove depending on state.
		 * @param {Boolean} s True/false state if the class should be removed or added.
		 */
    setState: function (c, s) {
      var n = DOM.get(this.id);

      c = this.classPrefix + c;

      if (s) {
        DOM.addClass(n, c);
      } else {
        DOM.removeClass(n, c);
      }
    },

    /**
		 * Returns true/false if the control has been rendered or not.
		 *
		 * @method isRendered
		 * @return {Boolean} State if the control has been rendered or not.
		 */
    isRendered: function () {
      return this.rendered;
    },

    /**
		 * Renders the control as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the button control element.
		 */
    renderHTML: function () {},

    /**
		 * Renders the control to the specified container element.
		 *
		 * @method renderTo
		 * @param {Element} n HTML DOM element to add control to.
		 */
    renderTo: function (n) {
      var frag = DOM.createFragment(this.renderHTML());
      n.appendChild(frag);

      this.postRender();
    },

    /**
		 * Post render event. This will be executed after the control has been rendered and can be used to
		 * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this._super().
		 *
		 * @method postRender
		 */
    postRender: function () {
      var state;

      // Set pending states
      if (ibis.is(this.disabled)) {
        state = this.disabled;
        this.disabled = -1;
        this.setDisabled(state);
      }

      if (ibis.is(this.active)) {
        state = this.active;
        this.active = -1;
        this.setActive(state);
      }

      this.onRender.dispatch();
    },

    parent: function (ctrl) {
      if (!ctrl) {
        return this._parent || null;
      }
      
      this._parent = ctrl;
    },

    /**
		 * Removes the control. This means it will be removed from the DOM and any
		 * events tied to it will also be removed.
		 *
		 * @method remove
		 */
    remove: function () {
      this.destroy();

      DOM.remove(this.id);
    },

    /**
		 * Destroys the control will free any memory by removing event listeners etc.
		 *
		 * @method destroy
		 */
     destroy: function () {
      ibis.dom.Event.clear(this.id);
    }
  });
})(ibis);