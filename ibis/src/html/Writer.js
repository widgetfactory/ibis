/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

/**
 * This class is used to write HTML tags out it can be used with the Serializer or the SaxParser.
 *
 * @class ibis.html.Writer
 * @example
 * var writer = new ibis.html.Writer({indent : true});
 * var parser = new ibis.html.SaxParser(writer).parse('<p><br></p>');
 * console.log(writer.getContent());
 *
 * @class ibis.html.Writer
 * @version 3.4
 */

/**
 * Constructs a new Writer instance.
 *
 * @constructor
 * @method Writer
 * @param {Object} settings Name/value settings object.
 */
ibis.html.Writer = function (settings, schema) {
  var html = [],
    indent, indentBefore, indentAfter, encode, htmlOutput;

  var makeMap = ibis.makeMap,
    Entities = ibis.html.Entities;

  settings = settings || {};
  indent = settings.indent;
  indentBefore = makeMap(settings.indent_before || '');
  indentAfter = makeMap(settings.indent_after || '');
  encode = Entities.getEncodeFunc(settings.entity_encoding || 'raw', settings.entities);
  htmlOutput = settings.element_format == "html";

  return {
    /**
       * Writes the a start element such as <p id="a">.
       *
       * @method start
       * @param {String} name Name of the element.
       * @param {Array} attrs Optional attribute array or undefined if it hasn't any.
       * @param {Boolean} empty Optional empty state if the tag should end like <br />.
       */
    start: function (name, attrs, empty) {
      var i, l, attr, value;

      if (indent && indentBefore[name] && html.length > 0) {
        value = html[html.length - 1];

        if (value.length > 0 && value !== '\n') {
          html.push('\n');
        }
      }

      html.push('<', name);

      if (attrs) {
        for (i = 0, l = attrs.length; i < l; i++) {
          attr = attrs[i];

          // treat as boolean attribute
          if (attr.name == attr.value) {
            attr["boolean"] = true;
          }

          if (attr["boolean"]) {
            if (settings.schema == 'html5-strict') {
              // boolean attributes in HTML5 are written without a value
              html.push(' ', attr.name);
            } else {
              // boolean attributes in HTML4 are written with a value
              html.push(' ', attr.name, '="', encode('' + attr.name, true), '"');
            }
          } else {
            html.push(' ', attr.name, '="', encode('' + attr.value, true), '"');
          }
        }
      }

      if (!empty || htmlOutput) {
        html[html.length] = '>';
      } else {
        // use void tag
        if (settings.schema == 'html5-strict') {
          html[html.length] = '>';
          // use self-closing tag
        } else {
          html[html.length] = ' />';
        }
      }

      if (empty && indent && indentAfter[name] && html.length > 0) {
        value = html[html.length - 1];

        if (value.length > 0 && value !== '\n') {
          html.push('\n');
        }
      }
    },

    /**
     * Writes the a end element such as </p>.
     *
     * @method end
     * @param {String} name Name of the element.
     */
    end: function (name) {
      var value;

      /*if (indent && indentBefore[name] && html.length > 0) {
        value = html[html.length - 1];

        if (value.length > 0 && value !== '\n')
          html.push('\n');
      }*/

      html.push('</', name, '>');

      if (indent && indentAfter[name] && html.length > 0) {
        value = html[html.length - 1];

        if (value.length > 0 && value !== '\n') {
          html.push('\n');
        }
      }
    },

    /**
     * Writes a text node.
     *
     * @method text
     * @param {String} text String to write out.
     * @param {Boolean} raw Optional raw state if true the contents wont get encoded.
     */
    text: function (text, raw) {
      if (text.length > 0) {
        html[html.length] = raw ? text : encode(text);
      }
    },

    /**
     * Writes a cdata node such as <![CDATA[data]]>.
     *
     * @method cdata
     * @param {String} text String to write out inside the cdata.
     */
    cdata: function (text) {
      html.push('<![CDATA[', text, ']]>');
    },

    /**
     * Writes a comment node such as <!-- Comment -->.
     *
     * @method cdata
     * @param {String} text String to write out inside the comment.
     */
    comment: function (text) {
      html.push('<!--', text, '-->');
    },

    /**
     * Writes a PI node such as <?xml attr="value" ?>.
     *
     * @method pi
     * @param {String} name Name of the pi.
     * @param {String} text String to write out inside the pi.
     */
    pi: function (name, text) {
      if (text) {
        html.push('<?', name, ' ', encode(text), '?>');
      } else {
        html.push('<?', name, '?>');
      }

      if (indent) {
        html.push('\n');
      }
    },

    /**
     * Writes a doctype node such as <!DOCTYPE data>.
     *
     * @method doctype
     * @param {String} text String to write out inside the doctype.
     */
    doctype: function (text) {
      html.push('<!DOCTYPE', text, '>', indent ? '\n' : '');
    },

    /**
     * Resets the internal buffer if one wants to reuse the writer.
     *
     * @method reset
     */
    reset: function () {
      html.length = 0;
    },

    /**
     * Returns the contents that got serialized.
     *
     * @method getContent
     * @return {String} HTML contents that got written down.
     */
    getContent: function () {
      return html.join('').replace(/\n$/, '');
    }
  };
};