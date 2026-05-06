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
    each = ibis.each,
    undef;

  /**
	 * This class is used to create list boxes/select list. This one will generate
	 * a native control the way that the browser produces them by default.
	 *
	 * @class ibis.ui.NativeListBox
	 * @extends ibis.ui.ListBox
	 */
  ibis.create('ibis.ui.NativeListBox:ibis.ui.ListBox', {
    /**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method NativeListBox
		 * @param {String} id Button control id for the button.
		 * @param {Object} settings Optional name/value settings object.
		 */
    NativeListBox: function (id, settings) {
      this._super(id, settings);
    },

    /**
		 * Sets the disabled state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be disabled visually.
		 *
		 * @method setDisabled
		 * @param {Boolean} s Boolean state if the control should be disabled or not.
		 */
    setDisabled: function (settings) {
      DOM.get(this.id).disabled = settings;
      this.setAriaProperty('disabled', settings);
    },

    /**
		 * Returns true/false if the control is disabled or not. This is a method since you can then
		 * choose to check some class or some internal bool state in subclasses.
		 *
		 * @method isDisabled
		 * @return {Boolean} true/false if the control is disabled or not.
		 */
    isDisabled: function () {
      return DOM.get(this.id).disabled;
    },

    /**
		 * Selects a item/option by value. This will both add a visual selection to the
		 * item and change the title of the control to the title of the option.
		 *
		 * @method select
		 * @param {String/function} value Value to look for inside the list box or a function selector.
		 */
    select: function (value) {
      var self = this,
        fv, fn;

      if (value == undef) {
        return this.selectByIndex(-1);
      }

      // Is string or number make function selector
      if (value && typeof (value) == "function") {
        fn = value;
      } else {
        fn = function (val) {
          return val == value;
        };
      }

      // Do we need to do something?
      if (value != this.selectedValue) {
        // Find item
        each(this.items, function (o, i) {
          if (fn(o.value)) {
            fv = 1;
            self.selectByIndex(i);
            return false;
          }
        });

        if (!fv) {
          this.selectByIndex(-1);
        }
      }
    },

    /**
		 * Selects a item/option by index. This will both add a visual selection to the
		 * item and change the title of the control to the title of the option.
		 *
		 * @method selectByIndex
		 * @param {String} idx Index to select, pass -1 to select menu/title of select box.
		 */
    selectByIndex: function (idx) {
      DOM.get(this.id).selectedIndex = idx + 1;
      this.selectedValue = this.items[idx] ? this.items[idx].value : null;
    },

    /**
		 * Adds a option item to the list box.
		 *
		 * @method add
		 * @param {String} name Title for the new option.
		 * @param {String} value Value for the new option.
		 * @param {Object} attribs Optional object with settings like for example class.
		 */
    add: function (name, value, attribs) {
      var obj;

      attribs = attribs || {};
      attribs.value = value;

      if (this.isRendered()) {
        DOM.add(DOM.get(this.id), 'option', attribs, name);
      }

      obj = {
        title: name,
        value: value,
        attribs: attribs
      };

      this.items.push(obj);
      this.onAdd.dispatch(this, obj);
    },

    /**
		 * Executes the specified callback function for the menu item. In this case when the user clicks the menu item.
		 *
		 * @method getLength
		 */
    getLength: function () {
      return this.items.length;
    },

    /**
		 * Renders the list box as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the list box control element.
		 */
    renderHTML: function () {
      var html;

      html = DOM.createHTML('option', {
        value: ''
      }, '-- ' + this.settings.title + ' --');

      each(this.items, function (item) {
        html += DOM.createHTML('option', {
          value: item.value
        }, item.title);
      });

      html = DOM.createHTML('select', {
        id: this.id,
        'class': 'mceNativeListBox',
        'aria-labelledby': this.id + '_aria'
      }, html);

      html += DOM.createHTML('span', {
        id: this.id + '_aria',
        'style': 'display: none'
      }, this.settings.title);

      return html;
    },

    /**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
    postRender: function () {
      var self = this,
        ch, changeListenerAdded = true;

      this.rendered = true;

      function onChange(e) {
        var value = self.items[e.target.selectedIndex - 1];

        if (value && (value = value.value)) {
          self.onChange.dispatch(self, value);

          if (self.settings.onselect) {
            self.settings.onselect(value);
          }
        }
      }

      Event.add(this.id, 'change', onChange);

      // Accessibility keyhandler
      Event.add(this.id, 'keydown', function (e) {
        var blur, DOM_VK_UP = 38,
          DOM_VK_DOWN = 40,
          DOM_VK_RETURN = 13,
          DOM_VK_SPACE = 32;

        Event.remove(self.id, 'change', ch);
        changeListenerAdded = false;

        blur = Event.add(this.id, 'blur', function () {
          if (changeListenerAdded) {
            return;
          }

          changeListenerAdded = true;
          Event.add(self.id, 'change', onChange);
          Event.remove(self.id, 'blur', blur);
        });

        if (e.keyCode == DOM_VK_RETURN || e.keyCode == DOM_VK_SPACE) {
          onChange(e);
          return Event.cancel(e);
        } else if (e.keyCode == DOM_VK_DOWN || e.keyCode == DOM_VK_UP) {
          // allow native implementation (navigate select element options)
          e.stopImmediatePropagation();
        }
      });

      this.onPostRender.dispatch(this, DOM.get(this.id));
    }
  });
})(ibis);