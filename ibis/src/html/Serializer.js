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
   * This class is used to serialize down the DOM tree into a string using a Writer instance.
   *
   *
   * @example
   * new ibis.html.Serializer().serialize(new ibis.html.DomParser().parse('<p>text</p>'));
   * @class ibis.html.Serializer
   * @version 3.4
   */

  /**
   * Constructs a new Serializer instance.
   *
   * @constructor
   * @method Serializer
   * @param {Object} settings Name/value settings object.
   * @param {ibis.html.Schema} schema Schema instance to use.
   */
  ibis.html.Serializer = function (settings, schema) {
    var self = this,
      writer = new ibis.html.Writer(settings, schema);

    settings = settings || {};
    settings.validate = "validate" in settings ? settings.validate : true;

    self.schema = schema = schema || new ibis.html.Schema();
    self.writer = writer;

    var boolAttrMap = schema.getBoolAttrs();
    /**
     * Serializes the specified node into a string.
     *
     * @example
     * new ibis.html.Serializer().serialize(new ibis.html.DomParser().parse('<p>text</p>'));
     * @method serialize
     * @param {ibis.html.Node} node Node instance to serialize.
     * @return {String} String with HTML based on DOM tree.
     */
    self.serialize = function (node) {
      var handlers, validate;

      validate = settings.validate;

      handlers = {
        // #text
        3: function (node) {
          writer.text(node.value || '', node.raw);
        },

        // #comment
        8: function (node) {
          writer.comment(node.value || '');
        },

        // Processing instruction
        7: function (node) {
          writer.pi(node.name, node.value);
        },

        // Doctype
        10: function (node) {
          writer.doctype(node.value || '');
        },

        // CDATA
        4: function (node) {
          writer.cdata(node.value || '');
        },

        // Document fragment
        11: function (node) {
          if ((node = node.firstChild)) {
            do {
              walk(node);
            } while ((node = node.next));
          }
        }
      };

      writer.reset();

      function walk(node) {
        var handler = handlers[node.type],
          name, isEmpty, attrs, attrName, attrValue, sortedAttrs, i, l, elementRule;

        if (!handler) {
          name = node.name;
          isEmpty = node.shortEnded;
          attrs = node.attributes;

          // Sort attributes
          if (validate && attrs && attrs.length > 1) {
            sortedAttrs = [];
            sortedAttrs.map = {};

            elementRule = schema.getElementRule(node.name);

            if (!elementRule) {
              return;
            }

            for (i = 0, l = elementRule.attributesOrder.length; i < l; i++) {
              attrName = elementRule.attributesOrder[i];

              if (attrName in attrs.map) {
                attrValue = attrs.map[attrName];
                sortedAttrs.map[attrName] = attrValue;

                sortedAttrs.push({
                  name: attrName,
                  value: attrValue
                });
              }
            }

            for (i = 0, l = attrs.length; i < l; i++) {
              attrName = attrs[i].name;

              if (!(attrName in sortedAttrs.map)) {
                attrValue = attrs.map[attrName];
                sortedAttrs.map[attrName] = attrValue;

                sortedAttrs.push({
                  name: attrName,
                  value: attrValue
                });
              }
            }

            attrs = sortedAttrs;
          }

          if (attrs) {
            for (i = 0, l = attrs.length; i < l; i++) {
              attrs[i]['boolean'] = attrs[i].name in boolAttrMap ? true : false;
            }
          }

          writer.start(node.name, attrs, isEmpty);

          if (!isEmpty) {
            var child = node.firstChild;

            if (child) {
              // Pre and textarea elements treat the first newline character as optional and will omit it. As such, if the content starts
              // with a newline we need to add in an additional newline to prevent the current newline in the value being treated as optional
              // See https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
              if ((name === 'pre' || name === 'textarea') && child.type === 3 && child.value && child.value.charAt(0) === '\n') {
                writer.text('\n', true);
              }

              do {
                walk(child);
              } while ((child = child.next));
            }

            writer.end(name);
          }
        } else {
          handler(node);
        }
      }

      // Serialize element and treat all non elements as fragments
      if (node.type === 1 && !settings.inner) {
        walk(node);
      } else if (node.type === 3) {
        handlers[3](node);
      } else {
        handlers[11](node);
      }

      return writer.getContent();
    };
  };
})(ibis);