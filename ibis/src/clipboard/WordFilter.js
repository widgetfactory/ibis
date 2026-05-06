/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

import * as Utils from './Utils';
import * as Styles from './Styles';

var each = ibis.each,
    Schema = ibis.html.Schema,
    DomParser = ibis.html.DomParser,
    Serializer = ibis.html.Serializer,
    Node = ibis.html.Node;

function cleanCssContent(content) {
    var classes = [],
        rules = Utils.parseCssToRules(content);

    each(rules, function (r) {
        if (r.selectorText) {
            each(r.selectorText.split(','), function (v) {
                v = v.replace(/^\s*|\s*$|^\s\./g, "");

                // Is internal or it doesn't contain a class
                if (/\.mso/i.test(v) || !/\.[\w\-]+$/.test(v)) {
                    return;
                }

                var text = r.cssText || "";

                if (!text) {
                    return;
                }

                if (ibis.inArray(classes, text) === -1) {
                    classes.push(text);
                }
            });
        }
    });

    return classes.join("");
}

function isWordContent(editor, content) {
    // Force word cleanup
    if (editor.settings.paste_force_cleanup) {
        return true;
    }

    var groups = [
        {
            name: "pages",
            tests: [
                /<meta\s+content="Cocoa HTML Writer"/i,
                /<meta\s+name="CocoaVersion"/i
            ]
        },
        {
            name: "openoffice",
            tests: [
                /<meta\s+content="OpenOffice\.org[^"]*"/i,
                /Version:\d+(?:\.\d+)*[\s\S]*?StartHTML:\d+[\s\S]*?EndFragment:\d+/,
                /@page\s*\{/i,
                // LibreOffice generator meta tag
                /<meta\s+name="generator"\s+content="LibreOffice\s+\d+(?:\.\d+)+(?:\s*\([^"]+\))?"/i
            ]
        },
        {
            name: "word",
            tests: [
                /<font\s+face="Times New Roman"|class="?Mso|style="[^"]*\bmso-|style='[^']*\bmso-|w:WordDocument|Excel\.Sheet|Microsoft Excel\s\d+/i,
                // Microsoft Word / Excel namespaces
                /xmlns:o=["']urn:schemas-microsoft-com:office:office["']/i,
                /xmlns:x=["']urn:schemas-microsoft-com:office:(?:word|excel)["']/i
            ]
        },
        {
            name: "googledocs",
            tests: [
                /class="OutlineElement/i,
                /id="?docs-internal-guid-/i
            ]
        },
        {
            name: "protondocs",
            tests: [
                /class=(?:"[^"]*\bLexical__\w+\b[^"]*"|'[^']*\bLexical__\w+\b[^']*')/i
            ]
        }
    ];

    var i, j;

    for (i = 0; i < groups.length; i++) {
        for (j = 0; j < groups[i].tests.length; j++) {
            if (groups[i].tests[j].test(content)) {
                return groups[i].name;
            }
        }
    }

    return false;
}

/**
 * Checks if the specified text starts with "1. " or "a. " etc.
 */
function isNumericList(text) {
    var found = "",
        patterns;

    patterns = {
        'uppper-roman': /^[IVXLMCD]{1,2}\.[ \u00a0]/,
        'lower-roman': /^[ivxlmcd]{1,2}\.[ \u00a0]/,
        'upper-alpha': /^[A-Z]{1,2}[\.\)][ \u00a0]/,
        'lower-alpha': /^[a-z]{1,2}[\.\)][ \u00a0]/,
        'numeric': /^[0-9]+\.[ \u00a0]/,
        'japanese': /^[\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d]+\.[ \u00a0]/,
        'chinese': /^[\u58f1\u5f10\u53c2\u56db\u4f0d\u516d\u4e03\u516b\u4e5d\u62fe]+\.[ \u00a0]/
    };

    /*patterns = [
        /^[IVXLMCD]{1,2}\.[ \u00a0]/, // Roman upper case
        /^[ivxlmcd]{1,2}\.[ \u00a0]/, // Roman lower case
        /^[a-z]{1,2}[\.\)][ \u00a0]/, // Alphabetical a-z
        /^[A-Z]{1,2}[\.\)][ \u00a0]/, // Alphabetical A-Z
        /^[0-9]+\.[ \u00a0]/, // Numeric lists
        /^[\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d]+\.[ \u00a0]/, // Japanese
        /^[\u58f1\u5f10\u53c2\u56db\u4f0d\u516d\u4e03\u516b\u4e5d\u62fe]+\.[ \u00a0]/ // Chinese
    ];*/

    text = text.replace(/^[\u00a0 ]+/, '');

    each(patterns, function (pattern, type) {
        if (pattern.test(text)) {
            found = type;
            return false;
        }
    });

    return found;
}

function isBulletList(text) {
    return /^[\s\u00a0]*[\u2022\u00b7\u00a7\u25CF]\s*/.test(text);
}

function postProcess(editor, node) {
    var dom = editor.dom;

    // fix table borders
    var borderColors = ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];
    var positions = ['top', 'right', 'bottom', 'left'];

    each(dom.select('table[style], td[style], th[style]', node), function (n) {
        var styles = {};

        each(Styles.borderStyles, function (name) {
            // process each side, eg: border-left-width
            if (/-(top|right|bottom|left)-/.test(name)) {
                // get style
                var value = dom.getStyle(n, name);

                // replace default values with black
                if (name.indexOf('color') !== -1) {
                    if (value === 'currentcolor' || value === 'windowtext') {
                        each(borderColors, function (str) {
                            if (str === name) {
                                return true;
                            }

                            var val = dom.getStyle(n, str);

                            if (/(currentcolor|windowtext)/.test(val)) {
                                return true;
                            }

                            value = val;
                        });
                    }

                    value = Styles.namedColorToHex(value);
                }

                // Word uses "medium" as the default border-width
                if (value === "medium") {
                    value = '1';
                }

                // if border-style is not set, use "solid"
                if (name.indexOf('style') !== -1 && value === "none") {
                    value = "solid";
                }

                // convert to pixels
                if (value && /^\d[a-z]?/.test(value)) {
                    value = Styles.convertToPixels(value);
                }

                styles[name] = value;
            }
        });

        // convert padding and margin to pixels
        each(positions, function (pos) {
            var padding = dom.getStyle(n, 'padding-' + pos);
            var margin = dom.getStyle(n, 'margin-' + pos);

            if (padding) {
                styles['padding-' + pos] = Styles.convertToPixels(padding);
            }

            if (margin) {
                styles['margin-' + pos] = Styles.convertToPixels(margin);
            }
        });

        each(styles, function (value, name) {

            // remove styles with no width value
            if (name.indexOf('-width') !== -1 && value === "") {
                var prefix = name.replace(/-width/, '');

                delete styles[prefix + '-style'];
                delete styles[prefix + '-color'];
                delete styles[name];
            }

            // convert named colors to hex
            if (name.indexOf('color') !== -1) {
                styles[name] = Styles.namedColorToHex(value);
            }
        });

        each(Styles.backgroundStyles, function (def, name) {
            var value = dom.getStyle(n, name);

            if (value === def) {
                value = "";
            }

            styles[name] = value;
        });

        // remove borders
        dom.setStyle(n, 'border', '');

        // remove background
        dom.setStyle(n, 'background', '');

        dom.setStyles(n, styles);
    });

    // update indent conversion
    each(dom.select('[data-mce-indent]', node), function (el) {
        if (el.nodeName === "p") {
            var value = dom.getAttrib(el, 'data-mce-indent');
            var style = editor.settings.indent_use_margin ? 'margin-left' : 'padding-left';

            dom.setStyle(el, style, value + 'px');
        }

        dom.setAttrib(el, 'data-mce-indent', '');
    });

    each(dom.select('[data-mce-word-list]', node), function (el) {
        el.removeAttribute('data-mce-word-list');
    });
}

function WordFilter(editor, content) {
    var settings = editor.settings;

    var keepStyles, removeStyles, validStyles = {}, styleProps = Styles.styleProps;

    // Chrome...
    content = content.replace(/<meta([^>]+)>/, '');

    // remove styles
    content = content.replace(/<style([^>]*)>([\w\W]*?)<\/style>/gi, function (match, attr, value) {
        // process to remove mso junk
        value = cleanCssContent(value);
        return '<style' + attr + '>' + value + '</style>';
    });

    // Copy paste from Java like Open Office will produce this junk on FF
    content = content.replace(/Version:[\d.]+\nStartHTML:\d+\nEndHTML:\d+\nStartFragment:\d+\nEndFragment:\d+/gi, '');

    // Open Office
    //content = content.replace(ooRe, '', 'g');

    // Remove google docs internal guid markers
    content = content.replace(/<b[^>]+id="?docs-internal-[^>]*>/gi, '');
    content = content.replace(/<br class="?Apple-interchange-newline"?>/gi, '');

    // Remove basic Word junk
    content = Utils.filter(content, [
        // Word comments like conditional comments etc
        /<!--[\s\S]+?-->/gi,

        // Remove comments, scripts (e.g., msoShowComment), XML tag, VML content,
        // MS Office namespaced tags, and a few other tags
        /<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|meta|link|\w:\w+)(?=[\s\/>]))[^>]*>/gi,

        // Convert <s> into <strike> for line-though
        [/<(\/?)s>/gi, "<$1strike>"],

        // Replace nsbp entites to char since it's easier to handle
        [/&nbsp;/gi, "\u00a0"],

        // Convert <span style="mso-spacerun:yes">___</span> to string of alternating
        // breaking/non-breaking spaces of same length
        [/<span\s+style\s*=\s*"\s*mso-spacerun\s*:\s*yes\s*;?\s*"\s*>([\s\u00a0]*)<\/span>/gi,
            function (str, spaces) {
                return (spaces.length > 0) ?
                    spaces.replace(/./, " ").slice(Math.floor(spaces.length / 2)).split("").join("\u00a0") : "";
            }
        ]
    ]);

    // replace <u> and <strike> with styles
    if (settings.inline_styles) {
        content = content.replace(/<(u|strike)>/gi, function (match, node) {
            var value = (node === "u") ? "underline" : "line-through";
            return '<span style="text-decoration:' + value + ';">';
        });

        content = content.replace(/<\/(u|strike)>/g, '</span>');
    }

    // remove double linebreaks (IE issue?)
    if (settings.forced_root_block) {
        content = content.replace(/<br><br>/gi, '');
    }

    // styles to keep
    keepStyles = settings.paste_retain_style_properties;
    // styles to remove
    removeStyles = settings.paste_remove_style_properties;

    // remove valid styles if we are removing all styles
    if (settings.paste_remove_styles !== false) {
        validStyles = {
            'font-weight': {},
            'font-style': {}
        };

        // split to array if string
        if (keepStyles && ibis.is(keepStyles, 'string')) {
            var styleProps = ibis.explode(keepStyles);

            each(styleProps, function (style, i) {
                if (style === "border") {
                    // add expanded border styles
                    styleProps = styleProps.concat(Styles.borderStyles);
                    return true;
                }
            });
        }
    } else {
        // split to array if string
        if (removeStyles && ibis.is(removeStyles, 'string')) {
            var removeProps = ibis.explode(removeStyles);

            each(removeProps, function (style, i) {
                if (style === "border") {
                    // add expanded border styles
                    removeProps = removeProps.concat(Styles.borderStyles);
                    return true;
                }
            });

            // remove from core styleProps array
            styleProps = ibis.grep(styleProps, function (prop) {
                return ibis.inArray(removeProps, prop) === -1;
            });
        }
    }

    each(styleProps, function (style) {
        // add all border styles if "border" is set
        if (style === "border") {
            each(Styles.borderStyles, function (name) {
                validStyles[name] = {};
            });

            return true;
        }

        validStyles[style] = {};
    });

    /**
     * Converts fake bullet and numbered lists to real semantic OL/UL.
     *
     * @param {ibis.html.Node} node Root node to convert children of.
     */
    function convertFakeListsToProperLists(node) {
        var currentListNode, prevListNode, lastLevel = 1;

        function getText(node) {
            var txt = '';

            if (node.type === 3) {
                return node.value;
            }

            if ((node = node.firstChild)) {
                do {
                    txt += getText(node);
                } while ((node = node.next));
            }

            return txt;
        }

        function trimListStart(node, regExp) {
            if (node.type === 3) {
                if (regExp.test(node.value)) {
                    node.value = node.value.replace(regExp, '');
                    return false;
                }
            }

            if ((node = node.firstChild)) {
                do {
                    if (!trimListStart(node, regExp)) {
                        return false;
                    }
                } while ((node = node.next));
            }

            return true;
        }

        function removeIgnoredNodes(node) {
            if (node._listIgnore) {
                node.remove();
                return;
            }

            if ((node = node.firstChild)) {
                do {
                    removeIgnoredNodes(node);
                } while ((node = node.next));
            }
        }

        function convertParagraphToLi(paragraphNode, listName, start, type) {
            var level = paragraphNode._listLevel || lastLevel;

            // Handle list nesting
            if (level != lastLevel) {
                if (level < lastLevel) {
                    // Move to parent list
                    if (currentListNode) {
                        currentListNode = currentListNode.parent.parent;
                    }
                } else {
                    // Create new list
                    prevListNode = currentListNode;
                    currentListNode = null;
                }
            }

            if (!currentListNode || currentListNode.name != listName) {
                prevListNode = prevListNode || currentListNode;
                currentListNode = new Node(listName, 1);

                // add list style if any
                if (type && /roman|alpha/.test(type)) {
                    var style = 'list-style-type:' + type;
                    currentListNode.attr({
                        'style': style,
                        'data-mce-style': style
                    });
                }

                if (start > 1) {
                    currentListNode.attr('start', '' + start);
                }

                paragraphNode.wrap(currentListNode);
            } else {
                currentListNode.append(paragraphNode);
            }

            paragraphNode.name = 'li';

            // Append list to previous list if it exists
            if (level > lastLevel && prevListNode) {
                prevListNode.lastChild.append(currentListNode);
            }

            lastLevel = level;

            // Remove start of list item "1. " or "&middot; " etc
            removeIgnoredNodes(paragraphNode);
            trimListStart(paragraphNode, /^\u00a0+/);

            if (currentListNode.name === "ol") {
                trimListStart(paragraphNode, /^\s*([\u2022\u00b7\u00a7\u25CF]|\w+\.)/);
            }

            if (currentListNode.name === "ul") {
                trimListStart(paragraphNode, /^\s*([\u2022\u00b7\u00a7\u25CF]|\w+\.)/);
            }

            trimListStart(paragraphNode, /^\u00a0+/);
        }

        // Build a list of all root level elements before we start
        // altering them in the loop below.
        var elements = [],
            child = node.firstChild;

        while (typeof child !== 'undefined' && child !== null) {
            elements.push(child);

            child = child.walk();

            if (child !== null) {
                while (typeof child !== 'undefined' && child.parent !== node) {
                    child = child.walk();
                }
            }
        }

        for (var i = 0; i < elements.length; i++) {
            node = elements[i];

            if (node.name == 'p' && node.firstChild) {
                // Find first text node in paragraph
                var nodeText = getText(node),
                    type;

                // Detect unordered lists look for bullets
                if (isBulletList(nodeText)) {
                    convertParagraphToLi(node, 'ul');
                    continue;
                }

                // Detect ordered lists 1., a. or ixv.
                if (node.attr('data-mce-word-list')) {

                    // remove marker
                    node.attr('data-mce-word-list', null);

                    if ((type = isNumericList(nodeText))) {
                        // Parse OL start number
                        var matches = /([0-9]+)\./.exec(nodeText);
                        var start = 1;
                        if (matches) {
                            start = parseInt(matches[1], 10);
                        }

                        convertParagraphToLi(node, 'ol', start, type);
                        continue;
                    }
                }

                // Convert paragraphs marked as lists but doesn't look like anything
                if (node._listLevel) {
                    convertParagraphToLi(node, 'ul', 1);
                    continue;
                }

                currentListNode = null;
            } else {
                // If the root level element isn't a p tag which can be
                // processed by convertParagraphToLi, it interrupts the
                // lists, causing a new list to start instead of having
                // elements from the next list inserted above this tag.
                prevListNode = currentListNode;
                currentListNode = null;
            }
        }
    }

    function filterStyles(node, styleValue) {
        var outputStyles = {},
            matches, styles = editor.dom.parseStyle(styleValue);

        each(styles, function (value, name) {
            // Convert various MS styles to W3C styles
            switch (name) {
                case 'mso-list':
                    // Parse out list indent level for lists
                    matches = /\w+ \w+([0-9]+)/i.exec(styleValue);
                    if (matches) {
                        node._listLevel = parseInt(matches[1], 10);
                    }

                    // Remove these nodes <span style="mso-list:Ignore">o</span>
                    // Since the span gets removed we mark the text node and the span
                    if (/Ignore/i.test(value) && node.firstChild) {
                        node._listIgnore = true;
                        node.firstChild._listIgnore = true;
                    }

                    break;

                case "horiz-align":
                    name = "text-align";
                    break;

                case "vert-align":
                    name = "vertical-align";
                    break;

                case "font-color":
                case "mso-foreground":
                case "color":
                    name = "color";

                    // remove "windowtext"
                    if (value == "windowtext") {
                        value = "";
                    }

                    break;

                case "mso-background":
                case "mso-highlight":
                    name = "background";
                    break;

                case "font-weight":
                case "font-style":
                    if (value == "normal") {
                        value = "";
                    }

                    break;

                case "mso-element":
                    // Remove track changes code
                    if (/^(comment|comment-list)$/i.test(value)) {
                        node.remove();
                        return;
                    }

                    break;

                case "margin-left":
                    if (node.name === "p" && settings.paste_convert_indents !== false) {
                        var indentValue = parseInt(editor.settings.indentation, 10);
                        value = parseInt(value, 10);

                        // convert to an indent value, must be greater than 0
                        value = Math.round(value / indentValue) * indentValue;

                        // store value and remove
                        if (value) {
                            node.attr('data-mce-indent', "" + value);
                            value = "";
                        }
                    }
                    break;
            }

            if (name.indexOf('mso-comment') === 0) {
                node.remove();
                return true;
            }

            // Never allow mso- prefixed names
            if (name.indexOf('mso-') === 0) {
                return true;
            }

            // convert to pixel values
            if (value && ibis.inArray(Styles.pixelStyles, name) !== -1) {
                value = Styles.convertToPixels(value);
            }

            // Output only valid styles
            if (validStyles[name]) {
                outputStyles[name] = value;
            }
        });

        // Convert bold style to "b" element
        if (/(bold|700|800|900)/i.test(outputStyles["font-weight"]) && editor.schema.isValidChild('strong', node.name)) {
            delete outputStyles["font-weight"];
            node.wrap(new Node("strong", 1));
        }

        // Convert italic style to "i" element
        if (/(italic)/i.test(outputStyles["font-style"]) && editor.schema.isValidChild('em', node.name)) {
            delete outputStyles["font-style"];
            node.wrap(new Node("em", 1));
        }

        // Serialize the styles and see if there is something left to keep
        outputStyles = editor.dom.serializeStyle(outputStyles, node.name);

        if (outputStyles) {
            return outputStyles;
        }

        return null;
    }

    var validElements = settings.paste_word_valid_elements || (
        '-strong/b,-em/i,-u,-span,-p,-ol[type|start|reversed],-ul,-li,-h1,-h2,-h3,-h4,-h5,-h6,' +
        '-p/div,-a[href|name],img[src|alt|width|height],sub,sup,strike,br,del,table[width],tr,' +
        'td[colspan|rowspan|width|valign],th[colspan|rowspan|width],thead,tfoot,tbody'
    );

    // keep style tags for process_stylesheets
    if (settings.paste_process_stylesheets == 'style') {
        validElements += ',style';
    }

    // Setup strict schema
    var schema = new Schema({
        valid_elements: validElements,
        valid_children: '-li[p]'
    });

    // allow for extended table attributes
    if (settings.schema !== 'html5' && schema.getElementRule('table')) {
        schema.addValidElements('table[width|border|cellpadding|cellspacing]');
    }

    // Add style/class attribute to all element rules since the user might have removed them from
    // paste_word_valid_elements config option and we need to check them for properties
    each(schema.elements, function (rule) {
        /*eslint dot-notation:0*/
        if (!rule.attributes["class"]) {
            rule.attributes["class"] = {};
            rule.attributesOrder.push("class");
        }

        if (!rule.attributes.style) {
            rule.attributes.style = {};
            rule.attributesOrder.push("style");
        }
    });

    // Parse HTML into DOM structure
    var domParser = new DomParser({}, schema);

    // Filter styles to remove "mso" specific styles and convert some of them
    domParser.addAttributeFilter('style', function (nodes) {
        var i = nodes.length,
            node, style;

        while (i--) {
            node = nodes[i];

            style = node.attr('style');

            // check for fake list (unordered)
            if (style && style.indexOf('mso-list') !== -1 && node.name !== 'li') {
                node.attr('data-mce-word-list', 1);
            }

            node.attr('style', filterStyles(node, style));

            // Remove pointess spans
            if (node.name == 'span' && node.parent && !node.attributes.length) {
                node.unwrap();
            }
        }
    });

    // Check the class attribute for comments or del items and remove those
    domParser.addAttributeFilter('class', function (nodes) {
        var i = nodes.length,
            node, className;

        while (i--) {
            node = nodes[i];

            className = node.attr('class');

            if (/^(MsoCommentReference|MsoCommentText|msoDel)$/i.test(className)) {
                node.remove();
                continue;
            }

            if (/^Mso[\w]+/i.test(className) || settings.paste_strip_class_attributes !== 0) {
                node.attr('class', null);

                if (className && className.indexOf('MsoList') !== -1 && node.name !== 'li') {
                    node.attr('data-mce-word-list', 1);
                }

                if (className && /\s*Mso(Foot|End)note\s*/.test(className)) {
                    var parent = node.parent;

                    // replace footnote span with <sup>
                    if (parent && parent.name === 'a') {
                        node.name = 'sup';
                    }

                    // remove additional span tags
                    if (node.name === 'span' && !node.attributes.length) {
                        node.unwrap();
                    }
                }

                // blockquote
                if (className && /\s*MsoQuote\s*/.test(className)) {
                    node.name = 'blockquote';
                }
            }
        }
    });

    // Remove all del elements since we don't want the track changes code in the editor
    domParser.addNodeFilter('del', function (nodes) {
        var i = nodes.length;

        while (i--) {
            nodes[i].remove();
        }
    });

    var footnotes = settings.paste_process_footnotes || 'convert';

    // Keep some of the links and anchors
    domParser.addNodeFilter('a', function (nodes) {
        var i = nodes.length,
            node, href, name;

        while (i--) {
            node = nodes[i];
            href = node.attr('href');
            name = node.attr('name');

            if (href && href.indexOf('#_msocom_') != -1) {
                node.remove();
                continue;
            }

            // convert URL
            if (href && !name) {
                href = editor.convertURL(href);
            }

            if (href && href.indexOf('#') == 0) {
                href = href.substr(href.indexOf('#'));
            }

            if (!href && !name) {
                node.unwrap();
            } else {
                // Remove all named anchors that aren't specific to TOC, Footnotes or Endnotes
                if (name && !/^_?(?:toc|edn|ftn)/i.test(name)) {
                    node.unwrap();
                    continue;
                }

                // remove footnote
                if (name && footnotes === "remove") {
                    node.remove();
                    continue;
                }

                // unlink footnote
                if (name && footnotes === "unlink") {
                    node.unwrap();
                    continue;
                }

                // set href, remove name
                node.attr({
                    href: href,
                    name: null
                });

                // set appropriate anchor
                if (settings.schema === "html4") {
                    node.attr('name', name);
                } else {
                    node.attr('id', name);
                }
            }
        }
    });

    // Remove empty span tags without attributes or content
    domParser.addNodeFilter('span', function (nodes) {
        var i = nodes.length,
            node;

        while (i--) {
            node = nodes[i];

            if (node.parent && !node.attributes.length) {
                node.unwrap();
            }
        }
    });

    // Remove single paragraphs in table cells
    if (settings.paste_remove_paragraph_in_table_cell) {
        domParser.addNodeFilter('td', function (nodes) {
            var i = nodes.length,
                node;

            while (i--) {
                node = nodes[i];

                if (!node.firstChild) {
                    continue;
                }

                if (node.firstChild.name == "p" && node.firstChild === node.lastChild) {
                    node.firstChild.unwrap();
                }
            }
        });
    }

    // Parse into DOM structure
    var rootNode = domParser.parse(content);

    // Process DOM
    if (settings.paste_convert_word_fake_lists !== false) {
        convertFakeListsToProperLists(rootNode);
    }

    // Serialize DOM back to HTML
    content = new Serializer({
        validate: settings.validate
    }, schema).serialize(rootNode);

    return content;
}

export {
    isWordContent,
    WordFilter,
    postProcess
};