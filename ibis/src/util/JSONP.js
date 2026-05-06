/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

ibis.util.JSOP = {
  callbacks: {},
  count: 0,
  send: function (o) {
    var self = this,
      dom = ibis.DOM,
      count = o.count !== undefined ? o.count : this.count,
      id = 'ibis_jsonp_' + count;

    this.callbacks[count] = function (json) {
      dom.remove(id);
      delete self.callbacks[count];
      o.callback(json);
    };

    dom.add(dom.doc.body, 'script', {
      id: id,
      src: o.url,
      type: 'text/javascript'
    });

    this.count++;
  }
};