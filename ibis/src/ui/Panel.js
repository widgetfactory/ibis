/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var DOM = ibis.DOM,
    Event = ibis.dom.Event,
    each = ibis.each,
    Dispatcher = ibis.util.Dispatcher;

  ibis.create('ibis.ui.Panel:ibis.ui.Container', {
    /**
         * Constructs a new panel container instance.
         *
         * @constructor
         * @method Panel
         * @param {String} id Control id for the panel.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
    Panel: function (id, s, ed) {
      this._super(id, s, ed);

      this.settings = s = ibis.extend({
        content: '',
        buttons: []
      }, this.settings);

      this.editor = ed;

      this.classPrefix = 'mcePanel';

      /**
             * Fires when the menu is rendered.
             *
             * @event onRenderMenu
             */
      this.onRenderPanel = new Dispatcher(this);
    },
    /**
         * Shows the menu.
         *
         * @method showMenu
         */
    showPanel: function (elm) {
      var self = this,
        s = this.settings,
        pos, x, y, mx, my, w, h, vp, panel, px = 0;

      this.storeSelection();

      if (!self.isPanelRendered) {
        self.renderPanel();
      }

      if (self.isPanelVisible) {
        return self.hidePanel();
      }

      vp = DOM.getViewPort();

      panel = DOM.get(self.id);

      if (!panel) {
        return;
      }

      DOM.show(panel);

      if (s.url) {
        var iframe = DOM.get(self.id + '_iframe');
        iframe.src = s.url;
      }

      // get position of the target element
      pos = DOM.getPos(elm);

      // Move inside viewport if not submenu
      w = panel.clientWidth;
      h = panel.clientHeight;
      mx = vp.x + vp.w;
      my = vp.y + vp.h;

      if ((x + w) > mx) {
        x = px ? px - w : Math.max(0, mx - w);
      }

      if ((y + h) > my) {
        y = Math.max(0, my - h);
      }

      x = pos.x;
      y = pos.y;

      DOM.setStyles(self.id, {
        left: x,
        top: y + elm.clientHeight + 5,
        zIndex: 200000
      });

      self.isPanelVisible = 1;

      Event.add(DOM.doc, 'mousedown', function (e) {
        if (DOM.getParents(e.target, '.mcePanel').length) {
          return;
        }

        self.hidePanel();
      });
    },

    storeSelection: function () {
      // Store bookmark
      if (ibis.isIE) {
        this.editor.focus();
        this.bookmark = this.editor.selection.getBookmark(1);
      }
    },

    restoreSelection: function () {
      if (this.bookmark) {
        this.editor.selection.moveToBookmark(this.bookmark);
        this.editor.focus();
      }

      this.bookmark = 0;
    },

    /**
         * Renders the menu to the DOM.
         *
         * @method renderMenu
         */
    renderPanel: function () {
      var self = this, s = this.settings, prefix = this.classPrefix;

      var panel = DOM.add(DOM.doc.body, 'div', {
        role: 'presentation',
        id: self.id,
        class: s["class"] || 'defaultSkin',
        style: 'position:absolute;left:0;top:-1000px;'
      });

      panel = DOM.add(panel, 'div', { 'class': prefix });

      var content = DOM.add(panel, 'div', {
        'class': prefix + 'Content'
      });

      if (s.width) {
        DOM.setStyle(panel, 'width', s.width);
      }

      var html = [];

      if (s.html) {
        // html string, eg: '<div></div>';
        if (typeof s.html === 'string') {
          html.push(s.html);
          // html node
        } else {
          html.push(DOM.createHTML(s.html));
        }
      }

      if (s.controls) {
        each(s.controls, function (ctrl) {
          html.push(ctrl.renderHTML());

          ctrl.postRender();

          setTimeout(function () {
            if (ctrl.controls) {
              each(ctrl.controls, function (c) {
                c.postRender();
              });
            }
          }, 0);
        });
      }

      DOM.setHTML(content, html.join(''));

      if (s.url) {
        DOM.add(content, 'iframe', {
          'id': self.id + '_iframe',
          'src': s.url,
          style: {
            'border': 0,
            'width': '100%',
            'height': '100%'
          },
          onload: function () {
            self.isPanelRendered = true;
            self.onRenderPanel.dispatch(self);
          }
        });
      }

      if (s.buttons.length) {
        var footer = DOM.add(panel, 'div', {
          'class': prefix + 'Footer'
        });

        each(s.buttons, function (o) {
          var btn = DOM.add(footer, 'button', {
            'type': 'button',
            'class': 'mceButton',
            'id': self.id + '_button_' + o.id
          }, o.title || '');

          if (o.classes) {
            DOM.addClass(btn, o.classes);
          }

          if (o.onclick) {
            Event.add(btn, 'click', function (e) {
              e.preventDefault();

              self.restoreSelection();

              var s = o.onclick.call(o.scope || self, e);

              if (s) {
                self.hidePanel();
              }
            });
          }
        });
      }

      var navItems = ibis.grep(DOM.select('input, select, button, textarea', panel), function (elm) {
        return elm.getAttribute('tabindex') >= 0 && elm.className.indexOf('Disabled') === -1;
      });

      if (navItems.length) {
        Event.add(panel, 'keydown', function (e) {
          if (e.keyCode === 9) {
            if (e.target === navItems[navItems.length - 1]) {
              e.preventDefault();
              navItems[0].focus();
            }
          }
        });
      }

      Event.add(panel, 'keyup', function (e) {
        if (e.keyCode === 13) {
          if (self.settings.onsubmit) {
            e.preventDefault();
            self.settings.onsubmit();
          }
        }
      });

      if (!s.url) {
        self.isPanelRendered = true;
        self.onRenderPanel.dispatch(self);
      }

      return panel;
    },

    /**
         * Hides the menu. The optional event parameter is used to check where the event occured so it
         * doesn't close them menu if it was a event inside the menu.
         *
         * @method hideMenu
         * @param {Event} e Optional event object.
         */
    hidePanel: function () {
      var self = this;

      DOM.hide(self.id);
      self.isPanelVisible = 0;
    },

    setButtonDisabled: function (button, state) {
      var id = this.id + '_button_' + button;

      if (state) {
        DOM.addClass(id, 'disabled');
      } else {
        DOM.removeClass(id, 'disabled');
      }
    },

    setButtonLabel: function (button, label) {
      DOM.setHTML(this.id + '_button_' + button, label);
    },

    destroy: function () {
      this._super();

      Event.clear(this.id);
      DOM.remove(this.id);
    }
  });
})(ibis);