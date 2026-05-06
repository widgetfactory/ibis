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
    walk = ibis.walk;

  /**
	 * This class is base class for all menu types like DropMenus etc. This class should not
	 * be instantiated directly other menu controls should inherit from this one.
	 *
	 * @class ibis.ui.Menu
	 * @extends ibis.ui.MenuItem
	 */
  ibis.create('ibis.ui.Menu:ibis.ui.MenuItem', {
    /**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method Menu
		 * @param {String} id Button control id for the button.
		 * @param {Object} s Optional name/value settings object.
		 */
    Menu: function (id, settings) {
      this._super(id, settings);
      this.items = {};
      this.collapsed = false;
      this.menuCount = 0;
      this.onAddItem = new ibis.util.Dispatcher(this);
    },

    /**
		 * Expands the menu, this will show them menu and all menu items.
		 *
		 * @method expand
		 * @param {Boolean} d Optional deep state. If this is set to true all children will be expanded as well.
		 */
    expand: function (d) {
      var self = this;

      if (d) {
        walk(self, function (o) {
          if (o.expand) {
            o.expand();
          }
        }, 'items', self);
      }

      this.collapsed = false;
    },

    /**
		 * Collapses the menu, this will hide the menu and all menu items.
		 *
		 * @method collapse
		 * @param {Boolean} state Optional deep state. If this is set to true all children will be collapsed as well.
		 */
    collapse: function (state) {
      var self = this;

      if (state) {
        walk(self, function (menu) {
          if (menu.collapse) {
            menu.collapse();
          }
        }, 'items', self);
      }

      this.collapsed = true;
    },

    /**
		 * Returns true/false if the menu has been collapsed or not.
		 *
		 * @method isCollapsed
		 * @return {Boolean} True/false state if the menu has been collapsed or not.
		 */
    isCollapsed: function () {
      return this.collapsed;
    },

    /**
		 * Adds a new menu, menu item or sub classes of them to the drop menu.
		 *
		 * @method add
		 * @param {ibis.ui.Control} menu Menu or menu item to add to the drop menu.
		 * @return {ibis.ui.Control} Same as the input control, the menu or menu item.
		 */
    add: function (menu) {
      if (!menu.settings) {
        menu = new ibis.ui.MenuItem(menu.id || DOM.uniqueId(), menu);
      }

      this.onAddItem.dispatch(this, menu);

      return this.items[menu.id] = menu;
    },

    /**
		 * Adds a menu separator between the menu items.
		 *
		 * @method addSeparator
		 * @return {ibis.ui.MenuItem} Menu item instance for the separator.
		 */
    addSeparator: function () {
      return this.add({
        separator: true
      });
    },

    /**
		 * Adds a sub menu to the menu.
		 *
		 * @method addMenu
		 * @param {Object} menu Menu control or a object with settings to be created into an control.
		 * @return {ibis.ui.Menu} Menu control instance passed in or created.
		 */
    addMenu: function (menu) {
      if (!menu.collapse) {
        menu = this.createMenu(menu);
      }

      this.menuCount++;

      return this.add(menu);
    },

    /**
		 * Returns true/false if the menu has sub menus or not.
		 *
		 * @method hasMenus
		 * @return {Boolean} True/false state if the menu has sub menues or not.
		 */
    hasMenus: function () {
      return this.menuCount !== 0;
    },

    /**
		 * Removes a specific sub menu or menu item from the menu.
		 *
		 * @method remove
		 * @param {ibis.ui.Control} menu Menu item or menu to remove from menu.
		 * @return {ibis.ui.Control} Control instance or null if it wasn't found.
		 */
    remove: function (menu) {
      delete this.items[menu.id];
    },

    /**
		 * Removes all menu items and sub menu items from the menu.
		 *
		 * @method removeAll
		 */
    removeAll: function () {
      var self = this;

      walk(self, function (menu) {
        if (menu.removeAll) {
          menu.removeAll();
        } else {
          menu.remove();
        }

        menu.destroy();
      }, 'items', self);

      this.items = {};
    },

    /**
		 * Created a new sub menu for the menu control.
		 *
		 * @method createMenu
		 * @param {Object} settings Optional name/value settings object.
		 * @return {ibis.ui.Menu} New drop menu instance.
		 */
    createMenu: function (settings) {
      var menu = new ibis.ui.Menu(settings.id || DOM.uniqueId(), settings);

      menu.onAddItem.add(this.onAddItem.dispatch, this.onAddItem);

      return menu;
    }
  });
})(ibis);