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
   * This class parses HTML code using pure JavaScript and executes various events for each item it finds. It will
   * always execute the events in the right order for tag soup code like <b><p></b></p>. It will also remove elements
   * and attributes that doesn't fit the schema if the validate setting is enabled.
   *
   * @example
   * var parser = new ibis.html.SaxParser({
   *     validate: true,
   *
   *     comment: function(text) {
   *         console.log('Comment:', text);
   *     },
   *
   *     cdata: function(text) {
   *         console.log('CDATA:', text);
   *     },
   *
   *     text: function(text, raw) {
   *         console.log('Text:', text, 'Raw:', raw);
   *     },
   *
   *     start: function(name, attrs, empty) {
   *         console.log('Start:', name, attrs, empty);
   *     },
   *
   *     end: function(name) {
   *         console.log('End:', name);
   *     },
   *
   *     pi: function(name, text) {
   *         console.log('PI:', name, text);
   *     },
   *
   *     doctype: function(text) {
   *         console.log('DocType:', text);
   *     }
   * }, schema);
   * @class ibis.html.SaxParser
   * @version 3.4
   */

  var each = ibis.each,
    Entities = ibis.html.Entities;

  // A list of form control or other elements whereby a name/id would override a form or document property
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements#value
  // https://portswigger.net/research/dom-clobbering-strikes-back
  var filteredClobberElements = ibis.makeMap('button,fieldset,form,iframe,img,image,input,object,output,select,textarea');

  // Create a temp document and return a cached version of it in subsequent calls
  var getTempDocument = (function () {
    var cachedDocument = null;

    return function () {

      if (!cachedDocument) {
        cachedDocument = document.implementation.createHTMLDocument('parser');
      }

      return cachedDocument;
    };
  })();
  
  /**
   * Constructs a new SaxParser instance.
   *
   * @constructor
   * @method SaxParser
   * @param {Object} settings Name/value collection of settings. comment, cdata, text, start and end are callbacks.
   * @param {ibis.html.Schema} schema HTML Schema class to use when parsing.
   */
  ibis.html.SaxParser = function (settings, schema) {
    var self = this;

    var doc = getTempDocument(), form = doc.createElement('form');

    function noop() { }

    settings = settings || {};
    self.schema = schema = schema || new ibis.html.Schema();

    if (settings.fix_self_closing !== false) {
      settings.fix_self_closing = true;
    }

    if (settings.allow_event_attributes !== true) {
      settings.allow_event_attributes = false;
    }

    if (settings.preserve_cdata !== false) {
      settings.preserve_cdata = true;
    }

    // Add handler functions from settings and setup default handlers
    each('comment cdata text start end pi doctype'.split(' '), function (name) {
      if (name) {
        self[name] = settings[name] || noop;
      }
    });

    /**
     * Returns the index of the end tag for a specific start tag. This can be
     * used to skip all children of a parent element from being processed.
     *
     * @private
     * @method findEndTag
     * @param {ibis.html.Schema} schema Schema instance to use to match short ended elements.
     * @param {String} html HTML string to find the end tag in.
     * @param {Number} startIndex Indext to start searching at should be after the start tag.
     * @return {Number} Index of the end tag.
     */
    self.findEndTag = function (schema, html, startIndex) {
      var count = 1,
        index, matches, tokenRegExp, shortEndedElements;

      shortEndedElements = schema.getShortEndedElements();
      tokenRegExp = /<([!?\/])?([A-Za-z0-9\-_\:\.]+)((?:\s+[^"\'>]+(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>]*))*|\/|\s+)>/g;
      tokenRegExp.lastIndex = index = startIndex;

      while ((matches = tokenRegExp.exec(html))) {
        index = tokenRegExp.lastIndex;

        if (matches[1] === '/') { // End element
          count--;
        } else if (!matches[1]) { // Start element
          if (matches[2] in shortEndedElements) {
            continue;
          }

          count++;
        }

        if (count === 0) {
          break;
        }
      }

      return index;
    };

    /**
     * Parses the specified HTML string and executes the callbacks for each item it finds.
     *
     * @example
     * new SaxParser({...}).parse('<b>text</b>');
     * @method parse
     * @param {String} html Html string to sax parse.
     */
    self.parse = function (html, format) {
      var self = this,
        matches, index = 0,
        value, endRegExp, stack = [],
        attrList, i, text, name;
      var isInternalElement, removeInternalElements, shortEndedElements, fillAttrsMap, isShortEnded;
      var validate, elementRule, isValidElement, attr, attribsValue, validAttributesMap, validAttributePatterns;
      var attributesRequired, attributesDefault, attributesForced;
      var anyAttributesRequired, selfClosing, tokenRegExp, attrRegExp, specialElements, attrValue, idCount = 0;
      var decode = Entities.decode,
        fixSelfClosing, filteredUrlAttrs = ibis.makeMap('src,href,data,background,formaction,poster,xlink:href');
      //var scriptUriRegExp = /((java|vb)script|mhtml):/i;
      var processHtml;

      // parser format - html, xml
      format = format || 'html';

      function processEndTag(name) {
        var pos, i;

        // Find position of parent of the same type
        pos = stack.length;
        while (pos--) {
          if (stack[pos].name === name) {
            break;
          }
        }

        // Found parent
        if (pos >= 0) {
          // Close all the open elements
          for (i = stack.length - 1; i >= pos; i--) {
            name = stack[i];

            if (name.valid) {
              self.end(name.name);
            }
          }

          // Remove the open elements from the stack
          stack.length = pos;
        }
      }

      /*function isInvalidUri(settings, uri) {
        if (settings.allow_html_data_urls) {
          return false;
        } else if (/^data:image\//i.test(uri)) {
          return settings.allow_svg_data_urls === false && /^data:image\/svg\+xml/i.test(uri);
        } else {
          return /^data:/i.test(uri);
        }
      }*/

      // a data attribute is any attribute with a hyphen, eg: data- or ng- or v-
      function isDataAttribute(name) {
        return name.indexOf('-') > 0;
      }

      // an aria attribute is any attribute that starts with aria-
      function isAriaAttribute(name) {
        return name.indexOf('aria-') === 0;
      }

      function isEventAttribute(name) {
        return name.indexOf('on') == 0;
      }

      function isFilterdUrlAttribute(name) {
        return name in filteredUrlAttrs;
      }

      function processComment(value) {
        // Ignore empty comments
        if (value === '') {
          return value;
        }

        // Padd comment value to avoid browsers from parsing invalid comments as HTML
        if (value.charAt(0) === '>') {
          value = ' ' + value;
        }

        if (!settings.allow_conditional_comments && value.substr(0, 3).toLowerCase() === '[if') {
          value = ' ' + value;
        }

        return value;
      }

      function processMalformedComment(value, startIndex) {
        var startTag = value || '';
        var isBogus = startTag.indexOf('--') !== 0;

        // Find the end of the malformed/bogus comment
        var endIndex = findCommentEndIndex(value, isBogus, startIndex);
        value = value.substr(startIndex, endIndex - startIndex);

        value = processComment(isBogus ? startTag + value : value);

        return endIndex + 1;
      }

      function isConditionalComment(html, startIndex) {
        return /^\s*\[if [\w\W]+\]>.*<!\[endif\](--!?)?>/.test(html.substr(startIndex));
      }

      function findCommentEndIndex(html, isBogus, startIndex) {
        var lcHtml = html.toLowerCase();
        if (lcHtml.indexOf('[if ', startIndex) !== -1 && isConditionalComment(lcHtml, startIndex)) {
          var endIfIndex = lcHtml.indexOf('[endif]', startIndex);
          return lcHtml.indexOf('>', endIfIndex);
        } else {
          if (isBogus) {
            var endIndex = lcHtml.indexOf('>', startIndex);
            return endIndex !== -1 ? endIndex : lcHtml.length;
          } else {
            var endCommentRegexp = /--!?>/;
            endCommentRegexp.lastIndex = startIndex;
            var match = endCommentRegexp.exec(html);
            return match ? match.index + match[0].length : lcHtml.length;
          }
        }
      }

      function trimComments(text) {
        var sanitizedText = text;

        while (/<!--|--!?>/g.test(sanitizedText)) {
          sanitizedText = sanitizedText.replace(/<!--|--!?>/g, '');
        }

        return sanitizedText;
      }

      function checkBogusAttribute(regExp, attrString) {
        var matches = regExp.exec(attrString);

        if (matches) {
          var name = matches[1];
          var value = matches[2];

          return typeof name === 'string' && name.toLowerCase() === 'data-mce-bogus' ? value : null;
        } else {
          return null;
        }
      }

      function parseAttribute(tagName, name, value, val2, val3) {
        var attrRule, i;// trimRegExp = /[\s\u0000-\u001F]+/g;

        name = name.toLowerCase();
        value = name in fillAttrsMap ? name : decode(value || val2 || val3 || ''); // Handle boolean attribute than value attribute

        // Validate name and value pass through all data- attributes
        if (validate && !isInternalElement && !isDataAttribute(name) && !isAriaAttribute(name)) {

          // block event attributes, eg: onload
          if (!settings.allow_event_attributes && isEventAttribute(name)) {
            return;
          }

          attrRule = validAttributesMap[name];

          // Find rule by pattern matching
          if (!attrRule && validAttributePatterns) {
            i = validAttributePatterns.length;
            while (i--) {
              attrRule = validAttributePatterns[i];
              if (attrRule.pattern.test(name)) {
                break;
              }
            }

            // No rule matched
            if (i === -1) {
              attrRule = null;
            }
          }

          // No attribute rule found
          if (!attrRule) {
            return;
          }

          // Validate value
          if (attrRule.validValues && !(value in attrRule.validValues)) {
            return;
          }
        }

        // Attempt to block any dom clobbering on document or forms
        // See https://www.slideshare.net/x00mario/in-the-dom-no-one-will-hear-you-scream
        var isNameOrId = name === 'name' || name === 'id';

        if (isNameOrId && tagName in filteredClobberElements && (value in doc || value in form)) {
          return;
        }

        // Block any javascript: urls or non image data uris
        if (isFilterdUrlAttribute(name) && !ibis.util.URI.isDomSafe(value, tagName, settings)) {
          return;
        }

        // Block any javascript: urls or non image data uris
        /*if (filteredUrlAttrs[name] && !settings.allow_script_urls) {
          var uri = value.replace(trimRegExp, '');

          try {
            // Might throw malformed URI sequence
            uri = decodeURIComponent(uri);
          } catch (ex) {
            // Fallback to non UTF-8 decoder
            uri = unescape(uri);
          }

          if (scriptUriRegExp.test(uri)) {
            return;
          }

          if (isInvalidUri(settings, uri)) {
            return;
          }
        }*/

        // Block data or event attributes on elements marked as internal
        if (isInternalElement) {
          if (isFilterdUrlAttribute(name)) {
            return;
          }
          // only allow event attributes if enabled
          if (isEventAttribute(name) && !settings.allow_event_attributes) {
            return;
          }
        }

        // Add attribute to list and map
        attrList.map[name] = value;
        attrList.push({
          name: name,
          value: value
        });
      }

      // Precompile RegExps and map objects
      tokenRegExp = new RegExp('<(?:' +
        '(?:!--([\\w\\W]*?)--!?>)|' + // Comment
        '(?:!\\[CDATA\\[([\\w\\W]*?)\\]\\]>)|' + // CDATA
        '(?:![Dd][Oo][Cc][Tt][Yy][Pp][Ee]([\\w\\W]*?)>)|' + // DOCTYPE (case insensitive)
        '(?:\\?([^\\s\\/<>]+) ?([\\w\\W]*?)[?/]>)|' + // PI
        '(?:\\/([A-Za-z][A-Za-z0-9\\-_\\:\\.]*)>)|' + // End element
        '(?:([A-Za-z][A-Za-z0-9\\-_\\:\\.]*)((?:\\s+[^"\'>]+(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>]*))*|\\/|\\s+)>)' + // Start element
        ')', 'g');

      attrRegExp = /([\w:\-]+)(?:\s*=\s*(?:(?:\"((?:[^\"])*)\")|(?:\'((?:[^\'])*)\')|([^>\s]+)))?/g;

      // Setup lookup tables for empty elements and boolean attributes
      shortEndedElements = schema.getShortEndedElements();
      selfClosing = settings.self_closing_elements || schema.getSelfClosingElements();
      fillAttrsMap = schema.getBoolAttrs();
      validate = settings.validate;
      removeInternalElements = settings.remove_internals;
      fixSelfClosing = settings.fix_self_closing;
      specialElements = schema.getSpecialElements();
      processHtml = html + '>';

      while ((matches = tokenRegExp.exec(processHtml))) {
        // Text
        if (index < matches.index) {
          self.text(decode(html.substr(index, matches.index - index)));
        }

        if ((value = matches[6])) { // End element
          value = value.toLowerCase();

          // IE will add a ":" in front of elements it doesn't understand like custom elements or HTML5 elements
          if (value.charAt(0) === ':') {
            value = value.substr(1);
          }

          processEndTag(value);
        } else if ((value = matches[7])) { // Start element
          // Did we consume the extra character then treat it as text
          // This handles the case with html like this: "text a<b text"
          if (matches.index + matches[0].length > html.length) {
            self.text(decode(html.substr(matches.index)));
            index = matches.index + matches[0].length;
            continue;
          }

          value = value.toLowerCase();

          // IE will add a ":" in front of elements it doesn't understand like custom elements or HTML5 elements
          if (value.charAt(0) === ':') {
            value = value.substr(1);
          }

          isShortEnded = value in shortEndedElements;

          // Is self closing tag for example an <li> after an open <li>
          if (fixSelfClosing && selfClosing[value] && stack.length > 0 && stack[stack.length - 1].name === value) {
            processEndTag(value);
          }

          // Always invalidate element if it's marked as bogus
          var bogusValue = checkBogusAttribute(attrRegExp, matches[8]);
          if (bogusValue !== null) {
            if (bogusValue === 'all') {
              index = self.findEndTag(schema, html, tokenRegExp.lastIndex);
              tokenRegExp.lastIndex = index;
              continue;
            }

            isValidElement = false;
          }

          // Validate element
          if (!validate || (elementRule = schema.getElementRule(value))) {
            isValidElement = true;

            // Grab attributes map and patters when validation is enabled
            if (validate) {
              validAttributesMap = elementRule.attributes;
              validAttributePatterns = elementRule.attributePatterns;
            }

            // Parse attributes
            if ((attribsValue = matches[8])) {
              isInternalElement = attribsValue.indexOf('data-mce-type') !== -1; // Check if the element is an internal element

              // If the element has internal attributes then remove it if we are told to do so
              if (isInternalElement && removeInternalElements) {
                isValidElement = false;
              }

              attrList = [];
              attrList.map = {};

              //attribsValue.replace(attrRegExp, parseAttribute);
              // eslint-disable-next-line no-loop-func
              attribsValue.replace(attrRegExp, (match, name, val, val2, val3) => {
                parseAttribute(value, name, val, val2, val3);
                return '';
              });
            } else {
              attrList = [];
              attrList.map = {};
            }

            // Process attributes if validation is enabled
            if (validate && !isInternalElement) {
              attributesRequired = elementRule.attributesRequired;
              attributesDefault = elementRule.attributesDefault;
              attributesForced = elementRule.attributesForced;
              anyAttributesRequired = elementRule.removeEmptyAttrs;

              // Check if any attribute exists
              if (anyAttributesRequired && !attrList.length) {
                isValidElement = false;
              }

              // Handle forced attributes
              if (attributesForced) {
                i = attributesForced.length;
                while (i--) {
                  attr = attributesForced[i];
                  name = attr.name;
                  attrValue = attr.value;

                  if (attrValue === '{$uid}') {
                    attrValue = 'mce_' + idCount++;
                  }

                  attrList.map[name] = attrValue;
                  attrList.push({
                    name: name,
                    value: attrValue
                  });
                }
              }

              // Handle default attributes
              if (attributesDefault) {
                i = attributesDefault.length;
                while (i--) {
                  attr = attributesDefault[i];
                  name = attr.name;

                  if (!(name in attrList.map)) {
                    attrValue = attr.value;

                    if (attrValue === '{$uid}') {
                      attrValue = 'mce_' + idCount++;
                    }

                    attrList.map[name] = attrValue;
                    attrList.push({
                      name: name,
                      value: attrValue
                    });
                  }
                }
              }

              // Handle required attributes
              if (attributesRequired) {
                i = attributesRequired.length;
                while (i--) {
                  if (attributesRequired[i] in attrList.map) {
                    break;
                  }
                }

                // None of the required attributes where found
                if (i === -1) {
                  isValidElement = false;
                }
              }

              // Invalidate element if it's marked as bogus
              if ((attr = attrList.map['data-mce-bogus'])) {
                if (attr === 'all') {
                  index = self.findEndTag(schema, html, tokenRegExp.lastIndex);
                  tokenRegExp.lastIndex = index;
                  continue;
                }

                isValidElement = false;
              }
            }

            if (isValidElement) {
              self.start(value, attrList, isShortEnded);
            }
          } else {
            isValidElement = false;
          }

          // Treat script, noscript and style a bit different since they may include code that looks like elements
          if ((endRegExp = specialElements[value]) && value != 'title' && value != 'textarea') {
            endRegExp.lastIndex = index = matches.index + matches[0].length;

            if ((matches = endRegExp.exec(html))) {
              if (isValidElement) {
                text = html.substr(index, matches.index - index);
              }

              index = matches.index + matches[0].length;
            } else {
              text = html.substr(index);
              index = html.length;
            }

            if (isValidElement) {
              if (text.length > 0) {
                self.text(text, true);
              }

              self.end(value);
            }

            tokenRegExp.lastIndex = index;
            continue;
          }

          // Push value on to stack
          if (!isShortEnded) {
            if (!attribsValue || attribsValue.indexOf('/') != attribsValue.length - 1) {
              stack.push({
                name: value,
                valid: isValidElement
              });
            } else if (isValidElement) {
              self.end(value);
            }
          }
        } else if ((value = matches[1])) { // Comment
          self.comment(trimComments(processComment(value)));
        } else if ((value = matches[2])) { // CDATA

          // Ensure we are in a valid CDATA context (eg child of svg or mathml). If we aren't in a valid context then the cdata should
          // be treated as a bogus comment. See https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
          var isValidCdataSection = format === 'xml' || settings.preserve_cdata || stack.length > 0 && schema.isValidChild(stack[stack.length - 1].name, '#cdata');

          if (isValidCdataSection) {
            self.cdata(trimComments(value));
          } else {
            index = processMalformedComment('', matches.index + 2);
            tokenRegExp.lastIndex = index;
            continue;
          }
        } else if ((value = matches[3])) { // DOCTYPE
          self.doctype(value);
        } else if ((value = matches[4])) { // PI
          self.pi(value, matches[5]);

          /*if (format === 'xml') {
            self.pi(value, matches[5]);
          } else {
            // Processing Instructions aren't valid in HTML so it should be treated as a bogus comment.
            // See https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
            index = processMalformedComment('?', matches.index + 2); // <? === 2 chars

            tokenRegExp.lastIndex = index;
            continue;
          }*/
        }

        index = matches.index + matches[0].length;
      }

      // Text
      if (index < html.length) {
        self.text(decode(html.substr(index)));
      }

      // Close any open elements
      for (i = stack.length - 1; i >= 0; i--) {
        value = stack[i];

        if (value.valid) {
          self.end(value.name);
        }
      }
    };
  };
})(ibis);