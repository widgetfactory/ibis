/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


ibis.onAddEditor.add(function (ibis, ed) {
  var filters, fontSizes, dom, settings = ed.settings;

  function replaceWithSpan(node, styles) {
    ibis.each(styles, function (value, name) {
      if (value) {
        dom.setStyle(node, name, value);
      }
    });

    dom.rename(node, 'span');
  }

  function convert(editor, params) {
    dom = editor.dom;

    if (settings.convert_fonts_to_spans) {
      ibis.each(dom.select('font,u,strike', params.node), function (node) {
        filters[node.nodeName.toLowerCase()](ed.dom, node);
      });
    }
  }

  if (settings.inline_styles) {
    fontSizes = ibis.explode(settings.font_size_legacy_values);

    filters = {
      font: function (dom, node) {
        replaceWithSpan(node, {
          backgroundColor: node.style.backgroundColor,
          color: node.color,
          fontFamily: node.face,
          fontSize: fontSizes[parseInt(node.size, 10) - 1]
        });
      },

      u: function (dom, node) {
        replaceWithSpan(node, {
          textDecoration: 'underline'
        });
      },

      strike: function (dom, node) {
        replaceWithSpan(node, {
          textDecoration: 'line-through'
        });
      }
    };

    ed.onPreProcess.add(convert);
    ed.onSetContent.add(convert);

    ed.onInit.add(function () {
      ed.selection.onSetContent.add(convert);
    });
  }
});