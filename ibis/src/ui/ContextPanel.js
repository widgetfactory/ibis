/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function () {
  var DOM = ibis.DOM,
    Event = ibis.dom.Event,
    Delay = ibis.util.Delay;

  ibis.create('ibis.ui.ContextPanel:ibis.ui.Panel', {
    /**
         * Constructs a new panel container instance.
         *
         * @constructor
         * @method Panel
         * @param {String} id Control id for the panel.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
    ContextPanel: function (id, s, ed) {
      this._super(id, s, ed);

      this.settings = s = ibis.extend({
        content: '',
        buttons: []
      }, this.settings);

      this.editor = ed;
    },

    renderPanel: function () {
      var self = this;

      this._super();

      DOM.addClass(DOM.select('.mcePanel', DOM.get(this.id)), 'mceContextPanel');

      var scrollFunc = Delay.debounce(function () {
        if (self.isPanelVisible) {
          self.positionPanel();
        }
      }, 60);

      self.scrollFunc = Event.add(this.editor.getWin(), 'scroll', scrollFunc);

      this.editor.onHide.add(function () {
        self.hidePanel();
      });
    },

    /**
         * Shows the panel.
         *
         * @method showPanel
         */
    showPanel: function (elm) {
      this._super(elm);

      this.target = elm;

      this.positionPanel();
    },

    positionPanel: function () {
      var self = this, x, y, pos, w;

      var panel = DOM.get(self.id);

      if (!panel) {
        return;
      }

      var elm = this.target;

      // get editor container position
      var offset = DOM.getRect(this.editor.getContentAreaContainer());

      DOM.removeClass(panel, 'mceArrowDown');

      // get position of the target element
      pos = DOM.getPos(elm);

      if (pos.y < 0) {
        self.hidePanel();
        return;
      }

      var win = this.editor.getWin();

      var sy = win.scrollY;
      var wh = sy + win.innerHeight;

      if (pos.y > wh - elm.clientHeight) {
        self.hidePanel();
        return;
      }

      DOM.show(panel);
      self.isPanelVisible = 1;

      x = pos.x + offset.x + elm.clientWidth / 2;
      y = pos.y + offset.y;

      w = panel.clientWidth;

      // position to center of target
      x = x - w / 2;

      // add height of target and arrow
      y = y + elm.clientHeight + 10;

      if (y > offset.y + offset.h) {
        y -= (elm.clientHeight + panel.clientHeight + 10);

        DOM.addClass(panel, 'mceArrowDown');
      }

      DOM.setStyles(self.id, {
        left: x,
        top: y,
        zIndex: 200000
      });
    },

    destroy: function () {
      Event.remove(this.editor.getWin(), 'scroll', self.scrollFunc);
      this._super();
    }
  });
})();