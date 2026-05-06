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
  // Shorten names
  var Event = ibis.dom.Event,
    each = ibis.each,
    extend = ibis.extend,
    PreviewCss = ibis.util.PreviewCss;

  ibis.ControlManager = function (ed, s) {
    var self = this;

    s = s || {};
    self.editor = ed;
    self.controls = {};
    self.onAdd = new ibis.util.Dispatcher(self);
    self.onPostRender = new ibis.util.Dispatcher(self);
    self.prefix = s.prefix || ed.id + '_';
    self._cls = {};

    self.classPrefix = 'mce';

    self.onPostRender.add(function () {
      each(self.controls, function (c) {
        c.postRender();
      });
    });
  };

  /**
   * This class is responsible for managing UI control instances. It's both a factory and a collection for the controls.
   * @class ibis.ControlManager
   */
  ibis.ControlManager.prototype = {
    /**
     * Returns a control by id or undefined it it wasn't found.
     *
     * @method get
     * @param {String} id Control instance name.
     * @return {ibis.ui.Control} Control instance or undefined.
     */
    get: function (id) {
      return this.controls[this.prefix + id] || this.controls[id];
    },

    /**
     * Sets the active state of a control by id.
     *
     * @method setActive
     * @param {String} id Control id to set state on.
     * @param {Boolean} s Active state true/false.
     * @return {ibis.ui.Control} Control instance that got activated or null if it wasn't found.
     */
    setActive: function (id, s) {
      var c = this.get(id);

      if (c) {
        c.setActive(s);
      }

      return c;
    },

    /**
     * Sets the dsiabled state of a control by id.
     *
     * @method setDisabled
     * @param {String} id Control id to set state on.
     * @param {Boolean} s Active state true/false.
     * @return {ibis.ui.Control} Control instance that got disabled or null if it wasn't found.
     */
    setDisabled: function (id, s) {
      var c = this.get(id);

      if (c) {
        c.setDisabled(s);
      }

      return c;
    },

    /**
     * Adds a control to the control collection inside the manager.
     *
     * @method add
     * @param {ibis.ui.Control} Control instance to add to collection.
     * @return {ibis.ui.Control} Control instance that got passed in.
     */
    add: function (c) {
      var self = this;

      if (c) {
        self.controls[c.id] = c;
        self.onAdd.dispatch(c, self);
      }

      return c;
    },

    /**
     * Creates a control by name, when a control is created it will automatically add it to the control collection.
     * It first ask all plugins for the specified control if the plugins didn't return a control then the default behavior
     * will be used.
     *
     * @method createControl
     * @param {String} name Control name to create for example "separator".
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createControl: function (name) {
      var ctrl, i, l, self = this,
        editor = self.editor,
        factories;

      // Build control factory cache
      if (!self.controlFactories) {
        self.controlFactories = [];
        each(editor.plugins, function (plugin) {
          if (plugin.createControl) {
            self.controlFactories.push(plugin);
          }
        });
      }

      // Create controls by asking cached factories
      factories = self.controlFactories;
      for (i = 0, l = factories.length; i < l; i++) {
        ctrl = factories[i].createControl(name, self);

        if (ctrl) {
          return self.add(ctrl);
        }
      }

      // Create sepearator
      if (name === "|" || name === "separator") {
        return self.createSeparator();
      }

      // Create control from button collection
      if (editor.buttons && (ctrl = editor.buttons[name])) {
        return self.createButton(name, ctrl);
      }

      return self.add(ctrl);
    },

    /**
     * Creates a drop menu control instance by id.
     *
     * @method createDropMenu
     * @param {String} id Unique id for the new dropdown instance. For example "some menu".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createDropMenu: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, bm, cls;

      s = extend({
        'class': 'mceDropDown',
        constrain: ed.settings.constrain_menus
      }, s);

      s["class"] += ' ' + (ed.settings.skin_class || 'mceDefaultSkin');

      if (id.indexOf(self.prefix) == -1) {
        id = self.prefix + id;
      }

      cls = cc || self._cls.dropmenu || ibis.ui.DropMenu;
      c = self.controls[id] = new cls(id, s);

      c.onAddItem.add(function (c, o) {
        var s = o.settings;

        if (s.title) {
          s.title = ed.getLang(s.title, s.title);
        }

        if (!s.onclick && s.cmd) {
          s.onclick = function () {
            ed.execCommand(s.cmd, s.ui || false, s.value);
          };
        }
      });

      // Fix for bug #1897785, #1898007
      if (ibis.isIE) {
        c.onShowMenu.add(function () {
          // IE 8 needs focus in order to store away a range with the current collapsed caret location
          ed.focus();
          bm = ed.selection.getBookmark(1);
        });

        c.onHideMenu.add(function () {
          if (bm) {
            ed.selection.moveToBookmark(bm);
            bm = 0;
          }
        });
      }

      ed.onRemove.add(function () {
        c.destroy();
      });

      return self.add(c);
    },

    /**
     * Creates a list box control instance by id. A list box is either a native select element or a DOM/JS based list box control. This
     * depends on the use_native_selects settings state.
     *
     * @method createListBox
     * @param {String} id Unique id for the new listbox instance. For example "styles".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createListBox: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, cls;

      c = self.get(id);

      if (c) {
        return c;
      }

      s.title = ed.translate(s.title);
      s.scope = s.scope || ed;

      if (!s.onselect) {
        s.onselect = function (v) {
          if (!s.cmd) {
            return false;
          }

          ed.execCommand(s.cmd, s.ui || false, v || s.value);
        };
      }

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      id = self.prefix + id;

      cls = cc || self._cls.listbox || ibis.ui.ListBox;
      c = new cls(id, s, ed);

      self.controls[id] = c;

      // Fix focus problem in Safari
      if (ibis.isWebKit) {
        c.onPostRender.add(function (c, n) {
          // Store bookmark on mousedown
          Event.add(n, 'mousedown', function () {
            ed.bookmark = ed.selection.getBookmark(1);
          });

          // Restore on focus, since it might be lost
          Event.add(n, 'focus', function () {
            ed.selection.moveToBookmark(ed.bookmark);
            ed.bookmark = null;
          });
        });
      }

      if (Array.isArray(s.items)) {
        c.onRenderMenu.add(function (c, m) {
          each(s.items, function (item) {
            m.add(item);
          });
        });
      }

      if (c.hideMenu) {
        ed.onMouseDown.add(c.hideMenu, c);
      }

      return self.add(c);
    },

    /**
     * Creates a list box control instance by id. A list box is either a native select element or a DOM/JS based list box control. This
     * depends on the use_native_selects settings state.
     *
     * @method createListBox
     * @param {String} id Unique id for the new listbox instance. For example "styles".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createStylesBox: function (id, s, cc) {
      var self = this,
        ed = self.editor;

      s = ibis.extend({
        max_height: 384,
        combobox: true,
        multiple: true,
        seperator: ' ',
        menu_class: 'mceStylesBoxMenu',
        allow_element_selector: false
      }, s || {});

      /**
       * Compile a filter regex or string into a function
       * From - https://github.com/ibis/ibis/blob/4.5.x/js/ibis/plugins/importcss/plugin.js
       * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
       * @param {*} filter 
       * @returns
       */
      function compileFilter(filter) {
        if (Array.isArray(filter)) {
          var filters = filter.map(compileFilter);

          return function (value) {
            return filters.every(function (filterFunc) {
              return filterFunc(value);
            });
          };
        }

        if (typeof filter == "string" && filter) {
          return function (value) {
            return value.indexOf(filter) !== -1;
          };
        } else if (typeof filter == "function") {
          return function (value) {
            return filter(value);
          };
        } else if (filter instanceof RegExp) {
          return function (value) {
            return filter.test(value);
          };
        }

        return filter;
      }

      function loadClasses(ctrl) {
        if (s.styles && typeof s.styles === "string") {
          // split by comma or space
          s.styles = s.styles.split(/[\s,]+/);
        }

        if (Array.isArray(s.styles) && s.styles.length) {
          each(s.styles, function (item) {
            var title, value;

            if (typeof item === "string") {
              title = value = item;
            } else if (typeof item === "object" && item !== null) {
              if (item.title && item.value) {
                title = item.title;
                value = item.value;
              } else {
                for (var key in item) {
                  // eslint-disable-next-line no-prototype-builtins
                  if (item.hasOwnProperty(key)) {
                    title = key;
                    value = item[key];
                    break;
                  }
                }
              }
            }

            if (title && value) {
              ctrl.add(title, value, {
                style: function () {
                  return PreviewCss.getCssText(ed, { classes: value });
                }
              });
            }
          });

          ctrl.hasClasses = true;

          return;
        }

        if (!Array.isArray(ed.settings.importcss_classes)) {
          return;
        }

        if (ctrl.hasClasses) {
          return;
        }

        each(ed.settings.importcss_classes, function (item) {
          var selectorText = item.selectorText || item.selector || item;

          if (!selectorText) {
            return true;
          }

          // process filters
          if (s.selector_filter) {
            var selectorFilter = compileFilter(s.selector_filter);

            if (selectorFilter(selectorText)) {
              return true;
            }
          }

          // Parse simple element.class1, .class1
          var selector = /^(?:([a-z0-9\-_]+))?(\.[a-z0-9_\-\.]+)$/i.exec(selectorText);

          // no match
          if (!selector) {
            return true;
          }

          var element = selector[1] || null;
          var className = selector[2].substr(1);

          // skip element assignments
          if (element && !s.allow_element_selector) {
            return true;
          }

          var classes = className.split('.');

          each(classes, function (cls) {
            ctrl.add(cls, cls, {
              style: function () {
                return item.style || PreviewCss.getCssText(ed, { classes: cls });
              }
            });
          });

          PreviewCss.reset();

        });

        if (Array.isArray(ed.settings.importcss_classes)) {
          ctrl.hasClasses = true;
        }
      }

      var c = this.createListBox(id, s, cc);

      c.onPostRender.add(function (c, n) {
        loadClasses(c, n);
      });

      return c;
    },

    /**
     * Creates a button control instance by id.
     *
     * @method createButton
     * @param {String} id Unique id for the new button instance. For example "bold".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createButton: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, cls;

      if (self.get(id)) {
        return self.get(id);
      }
      s.title = ed.translate(s.title);
      s.label = ed.translate(s.label);
      s.scope = s.scope || ed;

      if (!s.onclick && !s.menu_button) {
        s.onclick = function () {
          ed.execCommand(s.cmd, s.ui || false, s.value);
        };
      }

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      id = self.prefix + id;

      if (s.menu_button) {
        cls = cc || self._cls.menubutton || ibis.ui.MenuButton;
        c = new cls(id, s, ed);
        ed.onMouseDown.add(c.hideMenu, c);
      } else {
        cls = self._cls.button || ibis.ui.Button;
        c = new cls(id, s, ed);
      }

      return self.add(c);
    },

    /**
     * Creates a menu button control instance by id.
     *
     * @method createMenuButton
     * @param {String} id Unique id for the new menu button instance. For example "menu1".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createMenuButton: function (id, s, cc) {
      s = s || {};
      s.menu_button = 1;

      return this.createButton(id, s, cc);
    },

    /**
     * Creates a split button control instance by id.
     *
     * @method createSplitButton
     * @param {String} id Unique id for the new split button instance. For example "spellchecker".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createSplitButton: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, cls;

      if (self.get(id)) {
        return self.get(id);
      }

      s.title = ed.translate(s.title);
      s.scope = s.scope || ed;

      if (!s.onclick && s.cmd) {
        s.onclick = function (v) {
          ed.execCommand(s.cmd, s.ui || false, v || s.value);
        };
      }

      if (!s.onselect && s.cmd) {
        s.onselect = function (v) {
          ed.execCommand(s.cmd, s.ui || false, v || s.value);
        };
      }

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      id = self.prefix + id;
      cls = cc || self._cls.splitbutton || ibis.ui.SplitButton;
      c = self.add(new cls(id, s, ed));
      ed.onMouseDown.add(c.hideMenu, c);

      c.onRenderMenu.add(function (e, m) {
        if (Array.isArray(s.items)) {
          each(s.items, function (item) {
            m.add(item);
          });
        }

        m.onHideMenu.add(function () {
          ed.nodeChanged();
          ed.focus();
        });
      });

      return self.add(c);
    },

    /**
     * Creates a color split button control instance by id.
     *
     * @method createColorSplitButton
     * @param {String} id Unique id for the new color split button instance. For example "forecolor".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createColorSplitButton: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, cls, bm;

      if (self.get(id)) {
        return self.get(id);
      }

      s.title = ed.translate(s.title);
      s.scope = s.scope || ed;

      if (!s.onclick) {
        s.onclick = function (v) {
          if (ibis.isIE) {
            bm = ed.selection.getBookmark(1);
          }

          ed.execCommand(s.cmd, s.ui || false, v || s.value);
        };
      }

      if (!s.onselect) {
        s.onselect = function (v) {
          ed.execCommand(s.cmd, s.ui || false, v || s.value);
        };
      }

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        'menu_class': ed.settings.skin_class || 'mceDefaultSkin',
        scope: s.scope,
        more_colors_title: ed.getLang('more_colors')
      }, s);

      id = self.prefix + id;
      cls = cc || self._cls.colorsplitbutton || ibis.ui.ColorSplitButton;
      c = new cls(id, s, ed);
      ed.onMouseDown.add(c.hideMenu, c);

      // Remove the menu element when the editor is removed
      ed.onRemove.add(function () {
        c.destroy();
      });

      c.onShowMenu.add(function () {
        bm = ed.selection.getBookmark(1);
      });

      c.onHideMenu.add(function () {
        if (bm) {
          ed.selection.moveToBookmark(bm);
          bm = 0;
        }
      });

      return self.add(c);
    },

    createTextBox: function (id, s, cc) {
      var self = this,
        ed = self.editor,
        c, cls;

      id = self.prefix + id;

      c = self.get(id);

      if (c) {
        return c;
      }

      s.title = ed.translate(s.title);
      s.label = ed.translate(s.label);
      s.scope = s.scope || ed;

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      cls = cc || ibis.ui.TextBox;
      c = new cls(id, s, ed);

      return self.add(c);
    },

    createUrlBox: function (id, s) {
      var ed = this.editor;

      s.upload_label = ed.getLang(s.upload_label, 'Upload');
      s.picker_label = ed.getLang(s.picker_label, 'Browse');

      return this.createTextBox(id, s, ibis.ui.UrlBox);
    },

    createCheckBox: function (id, s) {
      var self = this,
        ed = self.editor,
        c, cls;

      c = self.get(id);

      if (c) {
        return c;
      }

      s.title = ed.translate(s.title);
      s.label = ed.translate(s.label);
      s.scope = s.scope || ed;

      s = extend({
        title: s.title,
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      id = self.prefix + id;

      cls = ibis.ui.CheckBox;
      c = new cls(id, s, ed);

      return self.add(c);
    },

    createCustomValue: function (id, s) {
      var self = this,
        ed = self.editor,
        c;

      id = self.prefix + id;

      c = new ibis.ui.CustomValue(id, s, ed);

      return self.add(c);
    },

    createRepeatable: function (id, s) {
      var self = this,
        ed = self.editor,
        c, cls;

      id = self.prefix + id;

      c = self.get(id);

      if (c) {
        return c;
      }

      s.scope = s.scope || ed;

      s = extend({
        'class': 'mce_' + id,
        scope: s.scope,
        control_manager: self
      }, s);

      cls = ibis.ui.Repeatable;
      c = new cls(id, s, ed);

      return self.add(c);
    },

    /**
     * Creates a panel container control instance by id.
     *
     * @method createPanel
     * @param {String} id Unique id for the new panel container control instance. For example "panel1".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createPanel: function (id, s, cc) {
      var c, self = this, ed = self.editor,
        cls;

      s["class"] += ' ' + (ed.settings.skin_class || 'mceDefaultSkin');

      //id = self.prefix + id;
      delete self.controls[id];

      cls = cc || self._cls.panel || ibis.ui.Panel;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    createContextPanel: function (id, s) {
      var cc = ibis.ui.ContextPanel;
      return this.createPanel(id, s, cc);
    },

    /**
     * Creates a tab panel container control instance by id.
     *
     * @method createTabs
     * @param {String} id Unique id for the new tab panel control instance. For example "tabs1".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createTabs: function (id, s, cc) {
      var c, self = this,
        cls;

      delete self.controls[id];

      cls = cc || self._cls.tabPanel || ibis.ui.TabPanel;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    /**
     * Creates a toolbar container control instance by id.
     *
     * @method createToolbar
     * @param {String} id Unique id for the new toolbar container control instance. For example "toolbar1".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createToolbar: function (id, s, cc) {
      var c, self = this,
        cls;

      id = self.prefix + id;
      delete self.controls[id];

      cls = cc || self._cls.toolbar || ibis.ui.Toolbar;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    createToolbarGroup: function (id, s, cc) {
      var c, self = this,
        cls;
      id = self.prefix + id;
      delete self.controls[id];

      cls = cc || this._cls.toolbarGroup || ibis.ui.ToolbarGroup;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    /**
     * Creates a layout container control instance by id.
     *
     * @method createLayout
     * @param {String} id Unique id for the new toolbar container control instance. For example "toolbar1".
     * @param {Object} s Optional settings object for the control.
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createLayout: function (id, s, cc) {
      var c, self = this,
        cls;

      id = self.prefix + id;
      delete self.controls[id];

      cls = cc || self._cls.layout || ibis.ui.Layout;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    /**
     * Creates a form container control instance by id.
     *
     * @method createForm
     * @param {String} id Unique id for the new toolbar container control instance. For example "toolbar1".
     * @param {Object} s Optional settings object for the control.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createForm: function (id, s) {
      var c, self = this,
        cls;

      id = self.prefix + id;

      delete self.controls[id];

      cls = ibis.ui.Form;
      c = new cls(id, s, self.editor);

      return self.add(c);
    },

    /**
     * Creates a separator control instance.
     *
     * @method createSeparator
     * @param {Object} cc Optional control class to use instead of the default one.
     * @return {ibis.ui.Control} Control instance that got created and added.
     */
    createSeparator: function (cc) {
      var cls = cc || this._cls.separator || ibis.ui.Separator;

      return new cls();
    },

    /**
     * Overrides a specific control type with a custom class.
     *
     * @method setControlType
     * @param {string} n Name of the control to override for example button or dropmenu.
     * @param {function} c Class reference to use instead of the default one.
     * @return {function} Same as the class reference.
     */
    setControlType: function (n, c) {
      return this._cls[n.toLowerCase()] = c;
    },

    /**
     * Destroy.
     *
     * @method destroy
     */
    destroy: function () {
      each(this.controls, function (c) {
        c.destroy();
      });

      this.controls = null;
    }
  };
})(ibis);