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
	 * @class ibis
	 */

  // Shorten names
  var each = ibis.each,
    extend = ibis.extend,
    DOM = ibis.DOM,
    Event = ibis.dom.Event,
    explode = ibis.explode,
    Dispatcher = ibis.util.Dispatcher,
    undef, instanceCounter = 0;

  // Setup some URLs where the editor API is located and where the document is
  ibis.documentBaseURL = window.location.href.replace(/[\?#].*$/, '').replace(/[\/\\][^\/]+$/, '');
  if (!/[\/\\]$/.test(ibis.documentBaseURL)) {
    ibis.documentBaseURL += '/';
  }

  ibis.baseURL = new ibis.util.URI(ibis.documentBaseURL).toAbsolute(ibis.baseURL);

  /**
	 * Absolute baseURI for the installation path of TinyMCE.
	 *
	 * @property baseURI
	 * @type ibis.util.URI
	 */
  ibis.baseURI = new ibis.util.URI(ibis.baseURL);

  // Add before unload listener
  // This was required since IE was leaking memory if you added and removed beforeunload listeners
  // with attachEvent/detatchEvent so this only adds one listener and instances can the attach to the onBeforeUnload event
  ibis.onBeforeUnload = new Dispatcher(ibis);

  // Must be on window or IE will leak if the editor is placed in frame or iframe
  Event.add(window, 'beforeunload', function (e) {
    ibis.onBeforeUnload.dispatch(ibis, e);
  });

  function removeEditorFromList(targetEditor) {
    var EditorManager = ibis.EditorManager, editors = EditorManager.editors, oldEditors = editors;

    editors = ibis.grep(editors, function (editor) {
      return targetEditor !== editor;
    });

    // Select another editor since the active one was removed
    if (EditorManager.activeEditor === targetEditor) {
      EditorManager.activeEditor = editors.length > 0 ? editors[0] : null;
    }

    // Clear focusedEditor if necessary, so that we don't try to blur the destroyed editor
    if (EditorManager.focusedEditor === targetEditor) {
      EditorManager.focusedEditor = null;
    }

    return oldEditors.length !== editors.length;
  }

  function purgeDestroyedEditor(editor) {
    // User has manually destroyed the editor lets clean up the mess
    if (editor && editor.initialized && !(editor.getContainer() || editor.getBody()).parentNode) {
      removeEditorFromList(editor);
      editor.remove();
      editor = null;
    }

    return editor;
  }

  /**
	 * Fires when a new editor instance is added to the ibis collection.
	 *
	 * @event onAddEditor
	 * @param {ibis} sender TinyMCE root class/namespace.
	 * @param {ibis.Editor} editor Editor instance.
	 * @example
	 * ibis.execCommand("mceAddControl", false, "some_textarea");
	 * ibis.onAddEditor.add(function(mgr,ed) {
	 *     console.debug('A new editor is available' + ed.id);
	 * });
	 */
  ibis.onAddEditor = new Dispatcher(ibis);

  /**
	 * Fires when an editor instance is removed from the ibis collection.
	 *
	 * @event onRemoveEditor
	 * @param {ibis} sender TinyMCE root class/namespace.
	 * @param {ibis.Editor} editor Editor instance.
	 */
  ibis.onRemoveEditor = new Dispatcher(ibis);

  ibis.on = function (name, handler) {
    name = name.toLowerCase();

    var wrapped = function (ed, arg) {
      handler({ editor: ibis.activeEditor });
    };
    
    if (name == 'addeditor') {
      ibis.onAddEditor.add(wrapped);
    }

    if (name == 'removeeditor') {
      ibis.onRemoveEditor.add(wrapped);
    }
  };

  ibis.EditorManager = extend(ibis, {
    /**
		 * Collection of editor instances.
		 *
		 * @property editors
		 * @type Object
		 * @example
		 * for (edId in ibis.editors)
		 *     ibis.editors[edId].save();
		 */
    editors: [],

    /**
		 * Collection of language pack data.
		 *
		 * @property i18n
		 * @type Object
		 */
    i18n: {},

    /**
		 * Currently active editor instance.
		 *
		 * @property activeEditor
		 * @type ibis.Editor
		 * @example
		 * ibis.activeEditor.selection.getContent();
		 * ibis.EditorManager.activeEditor.selection.getContent();
		 */
    activeEditor: null,

    /**
		 * Initializes a set of editors. This method will create a bunch of editors based in the input.
		 *
		 * @method init
		 * @param {Object} s Settings object to be passed to each editor instance.
		 * @example
		 * // Initializes a editor using the longer method
		 * ibis.EditorManager.init({
		 *    some_settings : 'some value'
		 * });
		 *
		 * // Initializes a editor instance using the shorter version
		 * ibis.init({
		 *    some_settings : 'some value'
		 * });
		 */
    init: function (settings) {
      /*eslint no-unused-vars:0*/

      var self = this,
        result;

      function createId(elm) {
        var id = elm.id;

        // Use element id, or unique name or generate a unique id
        if (!id) {
          id = elm.name;

          if (id && !DOM.get(id)) {
            id = elm.name;
          } else {
            // Generate unique name
            id = DOM.uniqueId();
          }

          elm.setAttribute('id', id);
        }

        return id;
      }

      function execCallback(name) {
        var callback = settings[name];

        if (!callback) {
          return;
        }

        return callback.apply(self, Array.prototype.slice.call(arguments, 2));
      }

      function hasClass(elm, className) {
        return className.constructor === RegExp ? className.test(elm.className) : DOM.hasClass(elm, className);
      }

      function findTargets(settings) {
        var l, targets = [];

        if (settings.types) {
          each(settings.types, function (type) {
            targets = targets.concat(DOM.select(type.selector));
          });

          return targets;
        } else if (settings.selector) {
          return DOM.select(settings.selector);
        } else if (settings.target) {
          return [settings.target];
        }

        // Fallback to old setting
        switch (settings.mode) {
          case "exact":
            l = settings.elements || '';

            if (l.length > 0) {
              each(explode(l), function (id) {
                var elm;

                if ((elm = DOM.get(id))) {
                  targets.push(elm);
                } else {
                  each(document.forms, function (f) {
                    each(f.elements, function (e) {
                      if (e.name === id) {
                        id = 'mce_editor_' + instanceCounter++;
                        DOM.setAttrib(e, 'id', id);
                        targets.push(e);
                      }
                    });
                  });
                }
              });
            }
            break;

          case "textareas":
          case "specific_textareas":
            each(DOM.select('textarea'), function (elm) {
              if (settings.editor_deselector && hasClass(elm, settings.editor_deselector)) {
                return;
              }

              if (!settings.editor_selector || hasClass(elm, settings.editor_selector)) {
                targets.push(elm);
              }
            });
            break;
        }

        return targets;
      }

      var provideResults = function (editors) {
        result = editors;
      };

      function initEditors() {
        var initCount = 0,
          editors = [],
          targets;

        function createEditor(id, settings, targetElm) {
          var editor = new ibis.Editor(id, settings, self);

          editors.push(editor);

          editor.onInit.add(function () {
            if (++initCount === targets.length) {
              provideResults(editors);
            }
          });

          editor.targetElm = editor.targetElm || targetElm;
          editor.render();
        }

        DOM.unbind(window, 'ready', initEditors);
        execCallback('onpageload');

        targets = DOM.unique(findTargets(settings));

        each(targets, function (elm) {
          purgeDestroyedEditor(self.get(elm.id));
        });

        targets = ibis.grep(targets, function (elm) {
          return !self.get(elm.id);
        });

        if (targets.length === 0) {
          provideResults([]);
        } else {
          each(targets, function (elm) {
            createEditor(createId(elm), settings, elm);
          });
        }
      }

      self.settings = settings;
      DOM.bind(window, 'ready', initEditors);
    },

    /**
		 * Returns a editor instance by id.
		 *
		 * @method get
		 * @param {String/Number} id Editor instance id or index to return.
		 * @return {ibis.Editor} Editor instance to return.
		 * @example
		 * // Adds an onclick event to an editor by id (shorter version)
		 * ibis.get('mytextbox').onClick.add(function(ed, e) {
		 *    ed.windowManager.alert('Hello world!');
		 * });
		 *
		 * // Adds an onclick event to an editor by id (longer version)
		 * ibis.EditorManager.get('mytextbox').onClick.add(function(ed, e) {
		 *    ed.windowManager.alert('Hello world!');
		 * });
		 */
    get: function (id) {
      if (id === undef) {
        return this.editors;
      }

      // eslint-disable-next-line no-prototype-builtins
      if (!this.editors.hasOwnProperty(id)) {
        return undef;
      }

      return this.editors[id];
    },

    /**
		 * Returns a editor instance by id. This method was added for compatibility with the 2.x branch.
		 *
		 * @method getInstanceById
		 * @param {String} id Editor instance id to return.
		 * @return {ibis.Editor} Editor instance to return.
		 * @deprecated Use get method instead.
		 * @see #get
		 */
    getInstanceById: function (id) {
      return this.get(id);
    },

    /**
		 * Adds an editor instance to the editor collection. This will also set it as the active editor.
		 *
		 * @method add
		 * @param {ibis.Editor} editor Editor instance to add to the collection.
		 * @return {ibis.Editor} The same instance that got passed in.
		 */
    add: function (editor) {
      var self = this,
        editors = self.editors;

      // Add named and index editor instance
      editors[editor.id] = editor;
      editors.push(editor);

      self.setActive(editor);
      self.onAddEditor.dispatch(self, editor);

      return editor;
    },

    /**
		 * Removes a editor instance from the collection.
		 *
		 * @method remove
		 * @param {ibis.Editor} e Editor instance to remove.
		 * @return {ibis.Editor} The editor that got passed in will be return if it was found otherwise null.
		 */
    remove: function (editor) {
      var i, editors = this.editors;

      // no value given
      if (!editor) {
        return null;
      }

      // Not in the collection
      if (!editors[editor.id]) {
        return null;
      }

      delete editors[editor.id];

      for (i = 0; i < editors.length; i++) {
        if (editors[i] == editor) {
          editors.splice(i, 1);
          break;
        }
      }

      // Select another editor since the active one was removed
      if (this.activeEditor == editor) {
        this.setActive(editors[0]);
      }

      editor.destroy();
      this.onRemoveEditor.dispatch(this, editor);

      return editor;
    },

    /**
		 * Executes a specific command on the currently active editor.
		 *
		 * @method execCommand
		 * @param {String} c Command to perform for example Bold.
		 * @param {Boolean} u Optional boolean state if a UI should be presented for the command or not.
		 * @param {String} v Optional value parameter like for example an URL to a link.
		 * @return {Boolean} true/false if the command was executed or not.
		 */
    execCommand: function (c, u, v) {
      var ed = this.get(v),
        win;

      // Manager commands
      switch (c) {
        case "mceFocus":
          ed.focus();
          return true;

        case "mceAddEditor":
        case "mceAddControl":
          if (!this.get(v)) {
            new ibis.Editor(v, this.settings).render();
          }

          return true;

        case "mceAddFrameControl":
          win = v.window;

          // Add ibis global instance and ibis namespace to specified window
          win.ibis = ibis;
          win.ibis = ibis;

          ibis.DOM.doc = win.document;
          ibis.DOM.win = win;

          ed = new ibis.Editor(v.element_id, v);
          ed.render();

          v.page_window = null;

          return true;

        case "mceRemoveEditor":
        case "mceRemoveControl":
          if (ed) {
            ed.remove();
          }
          return true;

        case 'mceToggleEditor':
          if (!ed) {
            this.execCommand('mceAddControl', 0, v);
            return true;
          }

          if (ed.isHidden()) {
            ed.show();
          } else {
            ed.hide();
          }

          return true;
      }

      // Run command on active editor
      if (this.activeEditor) {
        return this.activeEditor.execCommand(c, u, v);
      }

      return false;
    },

    /**
		 * Executes a command on a specific editor by id. This method was added for compatibility with the 2.x branch.
		 *
		 * @deprecated Use the execCommand method of a editor instance instead.
		 * @method execInstanceCommand
		 * @param {String} id Editor id to perform the command on.
		 * @param {String} c Command to perform for example Bold.
		 * @param {Boolean} u Optional boolean state if a UI should be presented for the command or not.
		 * @param {String} v Optional value parameter like for example an URL to a link.
		 * @return {Boolean} true/false if the command was executed or not.
		 */
    execInstanceCommand: function (id, c, u, v) {
      var ed = this.get(id);

      if (ed) {
        return ed.execCommand(c, u, v);
      }

      return false;
    },

    /**
		 * Calls the save method on all editor instances in the collection. This can be useful when a form is to be submitted.
		 *
		 * @method triggerSave
		 * @example
		 * // Saves all contents
		 * ibis.triggerSave();
		 */
    triggerSave: function () {
      each(this.editors, function (e) {
        e.save();
      });
    },

    /**
		 * Adds a language pack, this gets called by the loaded language files like en.js.
		 *
		 * @method addI18n
		 * @param {String} p Prefix for the language items. For example en.myplugin
		 * @param {Object} o Name/Value collection with items to add to the language group.
		 */
    addI18n: function (p, o) {
      var i18n = this.i18n;

      if (!ibis.is(p, 'string')) {
        each(p, function (o, lc) {
          each(o, function (o, g) {
            each(o, function (o, k) {
              if (g === 'common') {
                i18n[lc + '.' + k] = o;
              } else {
                i18n[lc + '.' + g + '.' + k] = o;
              }
            });
          });
        });
      } else {
        each(o, function (o, k) {
          i18n[p + '.' + k] = o;
        });
      }
    },

    // Private methods

    setActive: function (editor) {
      this.selectedInstance = this.activeEditor = editor;
    }
  });

  ibis.FocusManager = new ibis.dom.FocusManager(ibis.EditorManager);

})(ibis);

/**
 * Alternative name for ibis added for 2.x compatibility.
 *
 * @member
 * @property ibis
 * @type ibis
 * @example
 * // To initialize editor instances
 * ibis.init({
 *    ...
 * });
 */

/**
 * Alternative name for ibis added for compatibility.
 *
 * @member ibis
 * @property EditorManager
 * @type ibis
 * @example
 * // To initialize editor instances
 * ibis.EditorManager.get('editor');
 */