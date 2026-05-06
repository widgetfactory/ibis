/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var DOM = ibis.DOM,
    Event = ibis.dom.Event,
    Dispatcher = ibis.util.Dispatcher;

  ibis.create('ibis.ui.PanelButton:ibis.ui.Button', {
    /**
         * Constructs a new split button control instance.
         *
         * @constructor
         * @method MenuButton
         * @param {String} id Control id for the split button.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
    PanelButton: function (id, s, ed) {
      this._super(id, s, ed);

      this.settings = s = ibis.extend({
      }, this.settings);

      this.editor = ed;
      this.classPrefix = 'mcePanelButton';

      this.onShowPanel = new Dispatcher(this);
      this.onHidePanel = new Dispatcher(this);
      this.onRenderPanel = new Dispatcher(this);
    },

    showPanel: function () {
      var self = this;

      if (self.isDisabled()) {
        return;
      }

      // get the target
      var elm = DOM.get(this.id);
      // show at target
      self.panel.showPanel(elm);

      self.onShowPanel.dispatch(self);

      self.setState('Selected', 1);
      self.setAriaProperty('expanded', true);
    },

    /**
         * Hides the menu. The optional event parameter is used to check where the event occured so it
         * doesn't close them menu if it was a event inside the menu.
         *
         * @method hideMenu
         * @param {Event} e Optional event object.
         */
    hidePanel: function (e) {
      var self = this;

      if (!self.panel) {
        return;
      }

      // Prevent double toogles by canceling the mouse click event to the button
      if (e && e.type == "mousedown" && DOM.getParent(e.target, function (e) {
        return e.id === self.id || e.id === self.id + '_open';
      })) {
        return;
      }

      if (!e || !DOM.getParent(e.target, '.mcePanel')) {
        self.setState('Selected', 0);
        Event.remove(DOM.doc, 'mousedown', self.hidePanel, self);

        self.panel.hidePanel();
        self.onHidePanel.dispatch(self);

        self.setAriaProperty('expanded', false);
      }
    },

    /**
         * Post render handler. This function will be called after the UI has been
         * rendered so that events can be added.
         *
         * @method postRender
         */
    postRender: function () {
      var self = this,
        s = self.settings;

      DOM.addClass(self.id, 'mceButton');

      Event.add(self.id, 'click', function (evt) {
        if (!self.isDisabled()) {

          if (s.onclick) {
            s.onclick(self.value);
          }

          self.showPanel();
        }

        Event.cancel(evt);
      });

      Event.add(self.id, 'focus', function () {
        self._focused = 1;
      });

      Event.add(self.id, 'blur', function () {
        self._focused = 0;
      });

      if (!self.panel) {
        self.panel = self.editor.controlManager.createPanel(self.id + '_panel', self.settings);
        self.editor.onMouseDown.add(self.hidePanel, self);
      }

      self.panel.onRenderPanel.add(function () {
        self.onRenderPanel.dispatch(self);
      });

      self.setAriaProperty('expanded', false);
    },

    restoreSelection: function () {
      if (self.panel) {
        self.panel.restoreSelection();
      }
    },

    destroy: function () {
      this._super();

      Event.clear(this.id + '_panel');
      DOM.remove(this.id + '_panel');
    }
  });
})(ibis);