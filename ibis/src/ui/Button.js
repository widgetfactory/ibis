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
    Dispatcher = ibis.util.Dispatcher;

  /**
	 * This class is used to create a UI button. A button is basically a link
	 * that is styled to look like a button or icon.
	 *
	 * @class ibis.ui.Button
	 * @extends ibis.ui.Control
	 */
  ibis.create('ibis.ui.Button:ibis.ui.Control', {
    /**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method Button
		 * @param {String} id Control id for the button.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
    Button: function (id, s, ed) {
      this._super(id, s, ed);
      this.classPrefix = 'mceButton';

      /**
			 * Fires after the element has been rendered to DOM.
			 *
			 * @event onPostRender
			 */
      this.onPostRender = new Dispatcher(this);
    },

    /**
		 * Renders the button as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the button control element.
		 */
    renderHTML: function () {
      var cp = this.classPrefix,
        s = this.settings,
        h, l;

      l = DOM.encode(s.label || '');
      h = '<button type="button" id="' + this.id + '" class="' + cp + ' ' + s['class'] + (l ? ' ' + cp + 'Labeled' : '') + '" title="' + DOM.encode(s.title) + '" aria-label="' + DOM.encode(s.title) + '">';

      if (s['class']) {
        s['class'] = ' ' + ibis.trim(s['class']);
      }

      s.icon = s.icon || '';

      if (s.image) {
        h += '<span role="presentation" class="mceIcon mceIconImage' + s['class'] + '"><img class="mceIcon" src="' + s.image + '" alt="' + DOM.encode(s.title) + '" /></span>' + (l ? '<span class="' + cp + 'Label">' + l + '</span>' : '');
      } else {
        if (s.icon) {
          s.icon = ' mce_' + s.icon;
        }

        h += '<span role="presentation" class="mceIcon' + s['class'] + '' + s.icon + '"></span>' + (l ? '<span class="' + cp + 'Label">' + l + '</span>' : '');
      }

      h += '</button>';

      return h;
    },

    /**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
    postRender: function () {
      var self = this,
        s = self.settings,
        imgBookmark;

      // In IE a large image that occupies the entire editor area will be deselected when a button is clicked, so
      // need to keep the selection in case the selection is lost
      if (ibis.isIE && self.editor) {
        Event.add(self.id, 'mousedown', function () {
          var nodeName = self.editor.selection.getNode().nodeName;
          imgBookmark = nodeName === 'IMG' ? self.editor.selection.getBookmark() : null;
        });
      }

      Event.add(self.id, 'click', function (e) {
        Event.cancel(e);

        if (!self.isDisabled()) {
          // restore the selection in case the selection is lost in IE
          if (ibis.isIE && self.editor && imgBookmark !== null) {
            self.editor.selection.moveToBookmark(imgBookmark);
          }

          return s.onclick.call(s.scope, e);
        }
      });

      Event.add(self.id, 'keydown', function (e) {
        if (!self.isDisabled() && e.keyCode == ibis.VK.SPACEBAR) {
          Event.cancel(e);
          return s.onclick.call(s.scope, e);
        }
      });

      this.rendered = true;

      this.onPostRender.dispatch(this, DOM.get(this.id));
    }
  });
})(ibis);