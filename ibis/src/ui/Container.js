/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

/**
 * This class is the base class for all container controls like toolbars. This class should not
 * be instantiated directly other container controls should inherit from this one.
 *
 * @class ibis.ui.Container
 * @extends ibis.ui.Control
 */

ibis.create('ibis.ui.Container:ibis.ui.Control', {
	/**
	 * Base contrustor a new container control instance.
	 *
	 * @constructor
	 * @method Container
	 * @param {String} id Control id to use for the container.
	 * @param {Object} settings Optional name/value settings object.
	 */
	Container: function (id, settings, editor) {
		var self = this;

		settings = settings || {};

		this._super(id, settings, editor);

		/**
		 * Array of controls added to the container.
		 *
		 * @property controls
		 * @type Array
		 */
		this.controls = [];

		this.lookup = {};

		if (settings.controls) {
			ibis.each(settings.controls, function (ctrl) {
				self.add(ctrl);
			});
		}
	},

	/**
	 * Adds a control to the collection of controls for the container.
	 *
	 * @method add
	 * @param {ibis.ui.Control} c Control instance to add to the container.
	 * @return {ibis.ui.Control} Same control instance that got passed in.
	 */
	add: function (ctrl) {
		this.lookup[ctrl.id] = ctrl;
		this.controls.push(ctrl);

		ctrl.parent(this);

		return ctrl;
	},

	destroy: function () {
		var i;

		this._super();

		for (i = 0; i < this.controls.length; i++) {
			this.controls[i].destroy();
		}

		delete this.lookup[this.id];
	},

	/**
	 * Returns a control by id from the containers collection.
	 *
	 * @method get
	 * @param {String} id Id for the control to retrive.
	 * @return {ibis.ui.Control} Control instance by the specified name or undefined if it wasn't found.
	 */
	get: function (id) {
		return this.lookup[id];
	},

	/**
	 * Returns a control by name from the containers collection.
	 * @param {String} name Name for the control to retrieve.
	 * @return {ibis.ui.Control} Control instance by the specified name or undefined if it wasn't found.
	 */
	find: function (name) {
		var i;

		// Check if it's a id selector
		if (name.charAt(0) === '#') {
			return this.get(name.substring(1));
		}

		for (i = 0; i < this.controls.length; i++) {
			if (this.controls[i].name === name) {
				return this.controls[i];
			}
		}
	}
});