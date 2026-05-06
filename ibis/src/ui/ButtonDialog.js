/**
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (ibis) {
  var Dispatcher = ibis.util.Dispatcher;

  ibis.create('ibis.ui.ButtonDialog:ibis.ui.PanelButton', {
    /**
         * Constructs a new split button control instance.
         *
         * @constructor
         * @method MenuButton
         * @param {String} id Control id for the split button.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
    ButtonDialog: function (id, s, ed) {
      if (s.content) {
        s.html = s.content;
      }

      if (s.buttons) {
        ibis.each(s.buttons, function (btn) {
          btn.onclick = btn.click || function () { };
        });
      }

      this.onShowDialog = new Dispatcher(this);
      this.onHideDialog = new Dispatcher(this);

      this._super(id, s, ed);
    },

    showDialog: function () {
      this.showPanel();
      this.onShowDialog.dispatch(this);
    },

    /**
         * Hides the menu. The optional event parameter is used to check where the event occured so it
         * doesn't close them menu if it was a event inside the menu.
         *
         * @method hideMenu
         * @param {Event} e Optional event object.
         */
    hideDialog: function (e) {
      this.hidePanel(e);
      this.onHideDialog.dispatch(this);
    }
  });
})(ibis);