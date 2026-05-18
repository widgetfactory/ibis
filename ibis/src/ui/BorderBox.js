/**
 * Copyright (c) 2009–2026 Ryan Demmer. All rights reserved.
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */
(function (ibis) {
    var DOM = ibis.DOM,
        Dispatcher = ibis.util.Dispatcher,
        each = ibis.each;

    var STYLE_KEYWORDS = ['none', 'hidden', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'];

    function parseBorder(val) {
        if (!val) {
            return { width: '', style: '', color: '' };
        }

        var parts = val.trim().split(/\s+/);
        var result = { width: '', style: '', color: '' };

        each(parts, function (part) {
            if (STYLE_KEYWORDS.indexOf(part) !== -1) {
                result.style = part;
            } else if (/^(thin|medium|thick)$/.test(part) || /^[0-9.]/.test(part)) {
                result.width = part;
            } else {
                result.color = part;
            }
        });

        return result;
    }

    /**
     * A container control combining a Checkbox (enable toggle), two ListBoxes
     * (width and style), and a ColorBox. Returns/accepts a CSS border shorthand
     * string: "1px solid #000", or "" when disabled.
     *
     * @class ibis.ui.BorderBox
     * @extends ibis.ui.Container
     */
    ibis.create('ibis.ui.BorderBox:ibis.ui.Form', {

        BorderBox: function (id, s, ed) {
            this._super(id, s, ed);

            this.classPrefix = 'mceBorderBox';
            this.onChange = new Dispatcher(this);
            this.onPostRender = new Dispatcher(this);
        },

        value: function (val) {
            var enableCtrl = this.get(this.id + '_enabled');
            var widthCtrl = this.get(this.id + '_width');
            var styleCtrl = this.get(this.id + '_style');
            var colorCtrl = this.get(this.id + '_color');

            if (!arguments.length) {
                if (!enableCtrl || !enableCtrl.value()) {
                    return '';
                }

                return [widthCtrl.value(), styleCtrl.value(), colorCtrl.value()]
                    .filter(function (v) {
                        return !!v;
                    }).join(' ');
            }

            var enabled = !!val;

            if (enableCtrl) {
                enableCtrl.value(enabled ? 1 : 0);
            }

            widthCtrl.setDisabled(!enabled);
            styleCtrl.setDisabled(!enabled);
            colorCtrl.setDisabled(!enabled);

            var p = parseBorder(val);
            widthCtrl.value(p.width);
            styleCtrl.value(p.style);
            colorCtrl.value(p.color);
        },

        postRender: function () {
            var self = this;

            var enableCtrl = this.get(this.id + '_enabled');
            var widthCtrl = this.get(this.id + '_width');
            var styleCtrl = this.get(this.id + '_style');
            var colorCtrl = this.get(this.id + '_color');

            each(this.controls, function (ctrl) {
                ctrl.postRender();
            });

            widthCtrl.disabled = -1;
            widthCtrl.setDisabled(true);

            styleCtrl.disabled = -1;
            styleCtrl.setDisabled(true);

            colorCtrl.disabled = -1;
            colorCtrl.setDisabled(true);

            if (this.rendered) {
                return;
            }

            enableCtrl.onChange.add(function () {
                var enabled = !!enableCtrl.value();

                widthCtrl.setDisabled(!enabled);
                styleCtrl.setDisabled(!enabled);
                colorCtrl.setDisabled(!enabled);

                self.onChange.dispatch(self);
            });

            each([widthCtrl, styleCtrl, colorCtrl], function (ctrl) {
                ctrl.onChange.add(function () {
                    self.onChange.dispatch(self);
                });
            });

            this.onPostRender.dispatch(this, DOM.get(this.id));

            this.rendered = true;
        },

        setDisabled: function (state) {
            this._super(state);

            var enableCtrl = this.get(this.id + '_enabled');

            if (enableCtrl) {
                enableCtrl.setDisabled(state);
            }

            if (state || !enableCtrl || !enableCtrl.value()) {
                var widthCtrl = this.get(this.id + '_width');
                var styleCtrl = this.get(this.id + '_style');
                var colorCtrl = this.get(this.id + '_color');

                if (widthCtrl) {
                    widthCtrl.setDisabled(true);
                }

                if (styleCtrl) {
                    styleCtrl.setDisabled(true);
                }

                if (colorCtrl) {
                    colorCtrl.setDisabled(true);
                }
            }
        }
    });
})(ibis);