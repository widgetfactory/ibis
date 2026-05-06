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
	/**
	 * This class is base class for all menu item types like DropMenus items etc. This class should not
	 * be instantiated directly other menu items should inherit from this one.
	 *
	 * @class ibis.ui.MenuItem
	 * @extends ibis.ui.Control
	 */
	ibis.create('ibis.ui.MenuItem:ibis.ui.Control', {
		/**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method MenuItem
		 * @param {String} id Button control id for the button.
		 * @param {Object} s Optional name/value settings object.
		 */
		MenuItem: function (id, settings) {
			this._super(id, settings);
		},

		/**
		 * Sets the selected state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be selected visually.
		 *
		 * @method setSelected
		 * @param {Boolean} state Boolean state if the control should be selected or not.
		 */
		setSelected: function (state) {
			this.setState('Selected', state);
			this.setAriaProperty('selected', !!state);
			this.selected = state;
		},

		/**
		 * Returns true/false if the control is selected or not.
		 *
		 * @method isSelected
		 * @return {Boolean} true/false if the control is selected or not.
		 */
		isSelected: function () {
			return this.selected;
		},

		/**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
		postRender: function () {
			this._super();

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

			// Set pending state
			if (ibis.is(this.selected)) {
				this.setSelected(this.selected);
			}
		}
	});
})(ibis);