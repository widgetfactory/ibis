/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


import * as WordFilter from './WordFilter';
import * as Styles from './Styles';

var each = ibis.each;
var isIE = ibis.isIE || ibis.isIE12;

function preProcess(editor, o) {
    var h = o.content;

    // Process away some basic content
    h = h.replace(/^\s*(&nbsp;)+/g, ''); // nbsp entities at the start of contents
    h = h.replace(/(&nbsp;|<br[^>]*>)+\s*$/g, ''); // nbsp entities at the end of contents

    // skip plain text
    if (o.pasteAsPlainText) {
        return h;
    }

    if (o.wordContent) {
        h = WordFilter.WordFilter(editor, h);
    }

    // convert some tags if cleanup is off
    if (editor.settings.verify_html === false) {
        h = h.replace(/<b\b([^>]*)>/gi, '<strong$1>');
        h = h.replace(/<\/b>/gi, '</strong>');
    }

    o.content = h;
}

function postProcess(editor, o) {
    var dom = editor.dom, settings = editor.settings;

    // remove url conversion containers
    dom.remove(dom.select('div[data-mce-convert]', o.node), 1);

    // skip plain text
    if (o.pasteAsPlainText) {
        return;
    }

    // Remove Apple style spans
    each(dom.select('span.Apple-style-span', o.node), function (n) {
        dom.remove(n, 1);
    });

    // Remove all classes
    if (settings.paste_strip_class_attributes == 1) {
        // Remove class attribute
        each(dom.select('*[class]', o.node), function (el) {
            el.removeAttribute('class');
        });
    }

    // Convert width and height attributes to styles
    each(dom.select('table, td, th', o.node), function (n) {
        var width = dom.getAttrib(n, 'width');

        if (width) {
            dom.setStyle(n, 'width', width);
            dom.setAttrib(n, 'width', '');
        }

        var height = dom.getAttrib(n, 'height');

        if (height) {
            dom.setStyle(n, 'height', height);
            dom.setAttrib(n, 'height', '');
        }
    });

    // Remove all styles if none are retained
    if (settings.paste_remove_styles !== false && !settings.paste_retain_style_properties) {
        // Remove style attribute
        each(dom.select('*[style]', o.node), function (el) {
            el.removeAttribute('style');
            el.removeAttribute('data-mce-style');
        });
    } else {
        // process style attributes
        processStyles(editor, o.node);
    }

    if (o.wordContent) {
        WordFilter.postProcess(editor, o.node);
    }

    function isValidDataUriImage(value) {
        return /^(file:|data:image)\//i.test(value);
    }

    // Process images - remove local
    each(dom.select('img', o.node), function (el) {
        var src = dom.getAttrib(el, 'src');

        // remove or processs for upload img element if blank, local file url or base64 encoded
        if (!src || isValidDataUriImage(src)) {
            // leave it as it is to be processed as a blob (but skip file:// images)
            if (settings.paste_upload_data_images) {
                // add marker
                dom.setAttrib(el, 'data-mce-upload-marker', '1');
            } else {
                dom.remove(el);
            }

        } else {
            dom.setAttrib(el, 'src', editor.convertURL(src));
        }
    });

    // remove font and underline tags in IE
    if (isIE) {
        each(dom.select('a', o.node), function (el) {
            each(dom.select('font,u'), function (n) {
                dom.remove(n, 1);
            });
        });
    }

    // remove tags
    if (settings.paste_remove_tags) {
        dom.remove(dom.select(settings.paste_remove_tags, o.node), 1);
    }

    // keep tags
    if (settings.paste_keep_tags) {
        var tags = settings.paste_keep_tags;

        dom.remove(dom.select('*:not(' + tags + ')', o.node), 1);
    }

    // remove all spans
    if (settings.paste_remove_spans) {
        dom.remove(dom.select('span', o.node), 1);
        // remove empty spans
    } else {
        each(dom.select('span', o.node), function (n) {
            // remove span without attributes eg: <span>foo</span> or <span></span>
            if (dom.getAttribs(n).length === 0) {
                dom.remove(n, n.hasChildNodes() ? 1 : 0);
            }
        });
    }

    if (settings.paste_remove_empty_paragraphs !== false) {
        var paras = dom.select('p', o.node);
        var i, p, text;

        for (i = paras.length - 1; i >= 0; i--) {
            p = paras[i];

            if (!p.hasChildNodes()) {
                dom.remove(p);

                continue;
            }

            // Get visible text (ignores markup)
            text = p.textContent || '';

            // Normalise Office/Word junk:
            // - NBSP -> space
            // - zero-width chars -> removed
            // - whitespace collapsed
            text = text
                .replace(/\u00a0/g, ' ')
                // eslint-disable-next-line no-misleading-character-class
                .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
                .replace(/\s+/g, '');

            // Remove if there's no text left
            if (text === '') {
                dom.remove(p);
            }
        }
    }

    // replace paragraphs with linebreaks
    /*if (!settings.forced_root_block')) {
        var frag = dom.createFragment('<br /><br />');

        each(dom.select('p,div', o.node), function (n) {
            // if the linebreaks are 
            if (n.parentNode.lastChild !== n) {
                dom.insertAfter(frag, n);
            }

            dom.remove(n, 1);
        });
    }*/
}

/**
 * Process style attributes
 * @param node Node to process
 */
function processStyles(editor, node) {
    var dom = editor.dom, settings = editor.settings, styleProps = Styles.styleProps;

    // Style to keep
    var keepStyles = settings.paste_retain_style_properties;

    // Style to remove
    var removeStyles = settings.paste_remove_style_properties;

    // split to array if string
    if (keepStyles && ibis.is(keepStyles, 'string')) {
        var styleProps = ibis.explode(keepStyles);

        each(styleProps, function (style, i) {
            if (style == "border") {
                // add expanded border styles
                styleProps = styleProps.concat(Styles.borderStyles);
                return true;
            }

            if (style == "font") {
                // add expanded border styles
                styleProps = styleProps.concat(Styles.fontStyles);
                return true;
            }

            if (style == "padding" || style == "margin") {
                each(['top', 'bottom', 'right', 'left'], function (side) {
                    styleProps.push(style + '-' + side);
                });

                return true;
            }
        });
    }

    // split to array if string
    if (removeStyles && ibis.is(removeStyles, 'string')) {
        var removeProps = ibis.explode(removeStyles);

        each(removeProps, function (style, i) {
            if (style === "border") {
                // add expanded border styles
                removeProps = removeProps.concat(Styles.borderStyles);
                return true;
            }

            if (style == "font") {
                // add expanded border styles
                removeProps = removeProps.concat(Styles.fontStyles);
                return true;
            }

            if (style == "padding" || style == "margin") {
                each(['top', 'bottom', 'right', 'left'], function (side) {
                    removeProps.push(style + '-' + side);
                });

                return true;
            }
        });

        // remove from core styleProps array
        styleProps = ibis.grep(styleProps, function (prop) {
            return ibis.inArray(removeProps, prop) === -1;
        });
    }

    // Retains some style properties
    each(dom.select('*[style]', node), function (n) {
        var ns = {},
            x = 0;

        // get styles on element
        var styles = dom.parseStyle(n.style.cssText);

        // check style against styleProps array
        each(styles, function (v, k) {
            if (ibis.inArray(styleProps, k) != -1) {
                ns[k] = v;
                x++;
            }
        });

        // Remove all of the existing styles
        dom.setAttrib(n, 'style', '');

        // compress
        ns = dom.parseStyle(dom.serializeStyle(ns, n.nodeName));

        if (x > 0) {
            dom.setStyles(n, ns); // Add back the stored subset of styles
        } else {
            // Remove empty span tags that do not have class attributes
            if (n.nodeName == 'SPAN' && !n.className) {
                dom.remove(n, true);
            }
        }

        // We need to compress the styles on WebKit since if you paste <img border="0" /> it will become <img border="0" style="... lots of junk ..." />
        // Removing the mce_style that contains the real value will force the Serializer engine to compress the styles
        if (ibis.isWebKit) {
            n.removeAttribute('data-mce-style');
        }
    });

    // convert some attributes
    each(dom.select('*[align]', node), function (el) {
        var v = dom.getAttrib(el, 'align');

        if (v === "left" || v === "right" || v === "center") {
            if (/(IFRAME|IMG|OBJECT|VIDEO|AUDIO|EMBED)/i.test(el.nodeName)) {
                if (v === "center") {
                    dom.setStyles(el, {
                        'margin': 'auto',
                        'display': 'block'
                    });
                } else {
                    dom.setStyle(el, 'float', v);
                }
            } else {
                dom.setStyle(el, 'text-align', v);
            }
        }

        el.removeAttribute('align');
    });
}

const setup = function (editor) {
    editor.onPastePreProcess.add(function (editor, o) {
        preProcess(editor, o);
    });

    editor.onPastePostProcess.add(function (editor, o) {
        postProcess(editor, o);
    });
};

export {
    setup
};