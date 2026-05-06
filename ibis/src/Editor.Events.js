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
	var each = ibis.each;

	var legacyEventMap = {
		preinit: 'onPreInit',
		beforerenderui: 'onBeforeRenderUI',
		postrender: 'onPostRender',
		load: 'onLoad',
		init: 'onInit',
		remove: 'onRemove',
		activate: 'onActivate',
		deactivate: 'onDeactivate',
		show: 'onShow',
		hide: 'onHide',
		click: 'onClick',
		event: 'onEvent',
		mouseup: 'onMouseUp',
		mousedown: 'onMouseDown',
		dblclick: 'onDblClick',
		keydown: 'onKeyDown',
		keyup: 'onKeyUp',
		keypress: 'onKeyPress',
		contextmenu: 'onContextMenu',
		submit: 'onSubmit',
		reset: 'onReset',
		paste: 'onPaste',
		cut: 'onCut',
		copy: 'onCopy',
		preprocess: 'onPreProcess',
		postprocess: 'onPostProcess',
		beforesetcontent: 'onBeforeSetContent',
		beforegetcontent: 'onBeforeGetContent',
		setcontent: 'onSetContent',
		getcontent: 'onGetContent',
		loadcontent: 'onLoadContent',
		savecontent: 'onSaveContent',
		nodechange: 'onNodeChange',
		change: 'onChange',
		beforeexeccmd: 'onBeforeExecCommand',
		execcmd: 'onExecCommand',
		undo: 'onUndo',
		redo: 'onRedo',
		visualaid: 'onVisualAid',
		setprogressstate: 'onSetProgressState',
		setattrib: 'onSetAttrib',
		selectionchange: 'onSelectionChange',
		blur: 'onBlur',
		focus: 'onFocus',
		focusin: 'onFocusIn',
		focusout: 'onFocusOut',
		beforeinput: 'onBeforeInput',
		input: 'onInput',
		compositionstart: 'onCompositionStart'
	};

	/**
	 * Creates all event dispatcher instances for the editor instance and also adds
	 * passthoughs for legacy callback handlers.
	 */
	ibis.Editor.prototype.setupEvents = function () {
		var self = this,
			settings = self.settings;

		// Add events to the editor
		each([
			/**
			 * Fires before the initialization of the editor.
			 *
			 * @event onPreInit
			 * @param {ibis.Editor} sender Editor instance.
			 * @see #onInit
			 * @example
			 * // Adds an observer to the onPreInit event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onPreInit.add(function(ed) {
			 *           console.debug('PreInit: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onPreInit',

			/**
			 * Fires before the initialization of the editor.
			 *
			 * @event onBeforeRenderUI
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onBeforeRenderUI event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *      ed.onBeforeRenderUI.add(function(ed, cm) {
			 *          console.debug('Before render: ' + ed.id);
			 *      });
			 *    }
			 * });
			 */
			'onBeforeRenderUI',

			/**
			 * Fires after the rendering has completed.
			 *
			 * @event onPostRender
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onPostRender event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onPostRender.add(function(ed, cm) {
			 *           console.debug('After render: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onPostRender',

			/**
			 * Fires when the onload event on the body occurs.
			 *
			 * @event onLoad
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onLoad event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onLoad.add(function(ed, cm) {
			 *           console.debug('Document loaded: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onLoad',

			/**
			 * Fires after the initialization of the editor is done.
			 *
			 * @event onInit
			 * @param {ibis.Editor} sender Editor instance.
			 * @see #onPreInit
			 * @example
			 * // Adds an observer to the onInit event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onInit.add(function(ed) {
			 *           console.debug('Editor is done: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onInit',

			/**
			 * Fires when the editor instance is removed from page.
			 *
			 * @event onRemove
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onRemove event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onRemove.add(function(ed) {
			 *           console.debug('Editor was removed: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onRemove',

			/**
			 * Fires when the editor is activated.
			 *
			 * @event onActivate
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onActivate event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onActivate.add(function(ed) {
			 *           console.debug('Editor was activated: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onActivate',

			/**
			 * Fires when the editor is deactivated.
			 *
			 * @event onDeactivate
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onDeactivate event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onDeactivate.add(function(ed) {
			 *           console.debug('Editor was deactivated: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onDeactivate',

			/**
			 * Fires when the editor is shown.
			 *
			 * @event onShow
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onShow event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onShow.add(function(ed) {
			 *           console.debug('Editor was shown: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onShow',

			/**
			 * Fires when the editor is hidden.
			 *
			 * @event onHide
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onHide event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onHide.add(function(ed) {
			 *           console.debug('Editor was hidden: ' + ed.id);
			 *       });
			 *    }
			 * });
			 */
			'onHide',

			/**
			 * Fires when something in the body of the editor is clicked.
			 *
			 * @event onClick
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onClick event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onClick.add(function(ed, e) {
			 *           console.debug('Editor was clicked: ' + e.target.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onClick',

			/**
			 * Fires when a registered event is intercepted.
			 *
			 * @event onEvent
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onEvent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onEvent.add(function(ed, e) {
			 *          console.debug('Editor event occurred: ' + e.target.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onEvent',

			/**
			 * Fires when a mouseup event is intercepted inside the editor.
			 *
			 * @event onMouseUp
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onMouseUp event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onMouseUp.add(function(ed, e) {
			 *           console.debug('Mouse up event: ' + e.target.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onMouseUp',

			/**
			 * Fires when a mousedown event is intercepted inside the editor.
			 *
			 * @event onMouseDown
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onMouseDown event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onMouseDown.add(function(ed, e) {
			 *           console.debug('Mouse down event: ' + e.target.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onMouseDown',

			/**
			 * Fires when a dblclick event is intercepted inside the editor.
			 *
			 * @event onDblClick
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onDblClick event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onDblClick.add(function(ed, e) {
			 *          console.debug('Double click event: ' + e.target.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onDblClick',

			/**
			 * Fires when a keydown event is intercepted inside the editor.
			 *
			 * @event onKeyDown
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onKeyDown event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onKeyDown.add(function(ed, e) {
			 *           console.debug('Key down event: ' + e.keyCode);
			 *       });
			 *    }
			 * });
			 */
			'onKeyDown',

			/**
			 * Fires when a keydown event is intercepted inside the editor.
			 *
			 * @event onKeyUp
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onKeyUp event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onKeyUp.add(function(ed, e) {
			 *           console.debug('Key up event: ' + e.keyCode);
			 *       });
			 *    }
			 * });
			 */
			'onKeyUp',

			/**
			 * Fires when a keypress event is intercepted inside the editor.
			 *
			 * @event onKeyPress
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onKeyPress event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onKeyPress.add(function(ed, e) {
			 *           console.debug('Key press event: ' + e.keyCode);
			 *       });
			 *    }
			 * });
			 */
			'onKeyPress',

			/**
			 * Fires when a contextmenu event is intercepted inside the editor.
			 *
			 * @event onContextMenu
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onContextMenu event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onContextMenu.add(function(ed, e) {
			 *            console.debug('Context menu event:' + e.target);
			 *       });
			 *    }
			 * });
			 */
			'onContextMenu',

			/**
			 * Fires when a form submit event is intercepted.
			 *
			 * @event onSubmit
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onSubmit event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSubmit.add(function(ed, e) {
			 *            console.debug('Form submit:' + e.target);
			 *       });
			 *    }
			 * });
			 */
			'onSubmit',

			/**
			 * Fires when a form reset event is intercepted.
			 *
			 * @event onReset
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onReset event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onReset.add(function(ed, e) {
			 *            console.debug('Form reset:' + e.target);
			 *       });
			 *    }
			 * });
			 */
			'onReset',

			/**
			 * Fires when a paste event is intercepted inside the editor.
			 *
			 * @event onPaste
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onPaste event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onPaste.add(function(ed, e) {
			 *            console.debug('Pasted plain text');
			 *       });
			 *    }
			 * });
			 */
			'onPaste',

			/**
			 * Fires when a cut event is intercepted inside the editor.
			 *
			 * @event onCut
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onCut event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onCut.add(function(ed, e) {
			 *            console.debug('Cut plain text');
			 *       });
			 *    }
			 * });
			 */
			'onCut',

			/**
			 * Fires when a copy event is intercepted inside the editor.
			 *
			 * @event onCopy
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onCopy event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onCopy.add(function(ed, e) {
			 *            console.debug('copy plain text');
			 *       });
			 *    }
			 * });
			 */
			'onCopy',

			/**
			 * Fires when the Serializer does a preProcess on the contents.
			 *
			 * @event onPreProcess
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Object} obj PreProcess object.
			 * @option {Node} node DOM node for the item being serialized.
			 * @option {String} format The specified output format normally "html".
			 * @option {Boolean} get Is true if the process is on a getContent operation.
			 * @option {Boolean} set Is true if the process is on a setContent operation.
			 * @option {Boolean} cleanup Is true if the process is on a cleanup operation.
			 * @example
			 * // Adds an observer to the onPreProcess event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onPreProcess.add(function(ed, o) {
			 *            // Add a class to each paragraph in the editor
			 *            ed.dom.addClass(ed.dom.select('p', o.node), 'myclass');
			 *       });
			 *    }
			 * });
			 */
			'onPreProcess',

			/**
			 * Fires when the Serializer does a postProcess on the contents.
			 *
			 * @event onPostProcess
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Object} obj PreProcess object.
			 * @example
			 * // Adds an observer to the onPostProcess event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onPostProcess.add(function(ed, o) {
			 *            // Remove all paragraphs and replace with BR
			 *            o.content = o.content.replace(/<p[^>]+>|<p>/g, '');
			 *            o.content = o.content.replace(/<\/p>/g, '<br />');
			 *       });
			 *    }
			 * });
			 */
			'onPostProcess',

			/**
			 * Fires before new contents is added to the editor. Using for example setContent.
			 *
			 * @event onBeforeSetContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onBeforeSetContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onBeforeSetContent.add(function(ed, o) {
			 *            // Replaces all a characters with b characters
			 *            o.content = o.content.replace(/a/g, 'b');
			 *       });
			 *    }
			 * });
			 */
			'onBeforeSetContent',

			/**
			 * Fires before contents is extracted from the editor using for example getContent.
			 *
			 * @event onBeforeGetContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Event} evt W3C DOM Event instance.
			 * @example
			 * // Adds an observer to the onBeforeGetContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onBeforeGetContent.add(function(ed, o) {
			 *            console.debug('Before get content.');
			 *       });
			 *    }
			 * });
			 */
			'onBeforeGetContent',

			/**
			 * Fires after the contents has been added to the editor using for example onSetContent.
			 *
			 * @event onSetContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onSetContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSetContent.add(function(ed, o) {
			 *            // Replaces all a characters with b characters
			 *            o.content = o.content.replace(/a/g, 'b');
			 *       });
			 *    }
			 * });
			 */
			'onSetContent',

			/**
			 * Fires after the contents has been extracted from the editor using for example getContent.
			 *
			 * @event onGetContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onGetContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onGetContent.add(function(ed, o) {
			 *           // Replace all a characters with b
			 *           o.content = o.content.replace(/a/g, 'b');
			 *       });
			 *    }
			 * });
			 */
			'onGetContent',

			/**
			 * Fires when the editor gets loaded with contents for example when the load method is executed.
			 *
			 * @event onLoadContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onLoadContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onLoadContent.add(function(ed, o) {
			 *           // Output the element name
			 *           console.debug(o.element.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onLoadContent',

			/**
			 * Fires when the editor contents gets saved for example when the save method is executed.
			 *
			 * @event onSaveContent
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onSaveContent event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSaveContent.add(function(ed, o) {
			 *           // Output the element name
			 *           console.debug(o.element.nodeName);
			 *       });
			 *    }
			 * });
			 */
			'onSaveContent',

			/**
			 * Fires when the user changes node location using the mouse or keyboard.
			 *
			 * @event onNodeChange
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onNodeChange event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onNodeChange.add(function(ed, cm, e) {
			 *           // Activates the link button when the caret is placed in a anchor element
			 *           if (e.nodeName == 'A')
			 *              cm.setActive('link', true);
			 *       });
			 *    }
			 * });
			 */
			'onNodeChange',

			/**
			 * Fires when a new undo level is added to the editor.
			 *
			 * @event onChange
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onChange event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onChange.add(function(ed, l) {
			 *          console.debug('Editor contents was modified. Contents: ' + l.content);
			 *       });
			 *    }
			 * });
			 */
			'onChange',

			/**
			 * Fires before a command gets executed for example "Bold".
			 *
			 * @event onBeforeExecCommand
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onBeforeExecCommand event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onBeforeExecCommand.add(function(ed, cmd, ui, val) {
			 *           console.debug('Command is to be executed: ' + cmd);
			 *       });
			 *    }
			 * });
			 */
			'onBeforeExecCommand',

			/**
			 * Fires after a command is executed for example "Bold".
			 *
			 * @event onExecCommand
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onExecCommand event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onExecCommand.add(function(ed, cmd, ui, val) {
			 *           console.debug('Command was executed: ' + cmd);
			 *       });
			 *    }
			 * });
			 */
			'onExecCommand',

			/**
			 * Fires when the contents is undo:ed.
			 *
			 * @event onUndo
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Object} level Undo level object.
			 * @ example
			 * // Adds an observer to the onUndo event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onUndo.add(function(ed, level) {
			 *           console.debug('Undo was performed: ' + level.content);
			 *       });
			 *    }
			 * });
			 */
			'onUndo',

			/**
			 * Fires when the contents is redo:ed.
			 *
			 * @event onRedo
			 * @param {ibis.Editor} sender Editor instance.
			 * @param {Object} level Undo level object.
			 * @example
			 * // Adds an observer to the onRedo event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onRedo.add(function(ed, level) {
			 *           console.debug('Redo was performed: ' +level.content);
			 *       });
			 *    }
			 * });
			 */
			'onRedo',

			/**
			 * Fires when visual aids is enabled/disabled.
			 *
			 * @event onVisualAid
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onVisualAid event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onVisualAid.add(function(ed, e, s) {
			 *           console.debug('onVisualAid event: ' + ed.id + ", State: " + s);
			 *       });
			 *    }
			 * });
			 */
			'onVisualAid',

			/**
			 * Fires when the progress throbber is shown above the editor.
			 *
			 * @event onSetProgressState
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onSetProgressState event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSetProgressState.add(function(ed, b) {
			 *            if (b)
			 *                 console.debug('SHOW!');
			 *            else
			 *                 console.debug('HIDE!');
			 *       });
			 *    }
			 * });
			 */
			'onSetProgressState',

			/**
			 * Fires after an attribute is set using setAttrib.
			 *
			 * @event onSetAttrib
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onSetAttrib event using ibis.init
			 *ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSetAttrib.add(function(ed, node, attribute, attributeValue) {
			 *            console.log('onSetAttrib tag');
			 *       });
			 *    }
			 * });
			 */
			'onSetAttrib',

			/**
			 * Fires when  when the current text selection in the editor is changed.
			 *
			 * @event onSelectionChange
			 * @param {ibis.Editor} sender Editor instance.
			 * @example
			 * // Adds an observer to the onSelectionChange event using ibis.init
			 * ibis.init({
			 *    ...
			 *    setup : function(ed) {
			 *       ed.onSelectionChange.add(function(ed, e) {
			 *          console.debug('Editor contents was modified. Contents: ' + e.content);
			 *       });
			 *    }
			 * });
			 */
			'onSelectionChange',

			/**
			 * Fires when the editor loses focus.
			 *
			 * @event onBlur
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onBlur',

			/**
			 * Fires after the editor is focused.
			 *
			 * @event onFocus
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onFocus',

			/**
			 * Fires when focus is moved to the editor.
			 *
			 * @event onFocusIn
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onFocusIn',

			/**
			 * Fires when focus is moved from the editor.
			 *
			 * @event onFocusOut
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onFocusOut',

			/**
			 * Fires before the editor input is changed.
			 *
			 * @event onBeforeInput
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onBeforeInput',

			/**
			 * Fires when the editor input is changed.
			 *
			 * @event onInput
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onInput',

			/**
			 * Fires when a composition event starts, such as when the user starts typing in an input method editor (IME).
			 * 
			 * @event onCompositionStart
			 * @param {ibis.Editor} sender Editor instance.
			 */
			'onCompositionStart'

		], function (name) {
			self[name] = new ibis.util.Dispatcher(self);
		});

		// Handle legacy cleanup_callback option
		if (settings.cleanup_callback) {
			self.onBeforeSetContent.add(function (ed, o) {
				o.content = ed.execCallback('cleanup_callback', 'insert_to_editor', o.content, o);
			});

			self.onPreProcess.add(function (ed, o) {
				if (o.set) {
					ed.execCallback('cleanup_callback', 'insert_to_editor_dom', o.node, o);
				}

				if (o.get) {
					ed.execCallback('cleanup_callback', 'get_from_editor_dom', o.node, o);
				}
			});

			self.onPostProcess.add(function (ed, o) {
				if (o.set) {
					o.content = ed.execCallback('cleanup_callback', 'insert_to_editor', o.content, o);
				}

				if (o.get) {
					o.content = ed.execCallback('cleanup_callback', 'get_from_editor', o.content, o);
				}
			});
		}

		var selectionEvents = [
			'onSetContent',
			'onBeforeSetContent',
			'onGetContent',
			'onBeforeGetContent'
		];

		// proxy "on" function for legacy code
		self.on = function (name, handler, prepend) {
			// split into an array by space
			var names = name.split(' ');

			var names = name.toLowerCase().split(' ');
			var i = names.length;

			while (i--) {
				name = names[i];

				var evt = legacyEventMap[name] || name;

				// Wrap the handler so it receives a modern-style event object
				var wrapped = function (ed, arg) {
					var eventObj = (typeof arg === 'object' && arg !== null) ? ibis.extend({ editor: ed }, arg) : { editor: ed, data: arg };
					handler(eventObj);
				};

				if (prepend) {
					self[evt].addToTop(wrapped);
				} else {
					self[evt].add(wrapped);
				}

				// Special case: if this is a content event with a selection flag, also attach to editor.selection
				if (ibis.inArray(selectionEvents, evt) !== -1 &&
					self.selection &&
					typeof self.selection[evt] === 'object' &&
					typeof self.selection[evt].add === 'function'
				) {
					// eslint-disable-next-line no-loop-func
					var selectionWrapped = function (sel, arg) {						
						// Only fire if the event was dispatched with selection: true
						if (arg && arg.selection === true) {
							var eventObj = (typeof arg === 'object' && arg !== null) ? ibis.extend({ editor: self }, arg) : { editor: self, data: arg };
							handler(eventObj);
						}
					};

					if (prepend) {
						self.selection[evt].add(selectionWrapped);
					} else {
						self.selection[evt].addToTop(selectionWrapped);
					}
				}
			}
		};

		self.fire = function (name, arg) {
			name = name.toLocaleLowerCase();

			var evt = legacyEventMap[name] || name;

			// Wrap the arg to simulate modern signature
			var eventObj = (typeof arg === 'object' && arg !== null) ? ibis.extend({ editor: self }, arg) : { editor: self, data: arg };

			self[evt].dispatch(self, eventObj);
		};

		self.off = function (name, handler) {
			name = name.toLocaleLowerCase();

			var evt = legacyEventMap[name] || name;

			if (handler) {
				self[evt].remove(handler);
			} else {
				self[evt].removeAll();
			}
		};
	};

	/**
	 * Binds native DOM events and sends these out to the dispatchers.
	 */
	ibis.Editor.prototype.bindNativeEvents = function () {
		// 'focus', 'blur', 'dblclick', 'beforedeactivate', submit, reset
		var self = this,
			settings = self.settings,
			dom = self.dom,
			nativeToDispatcherMap;

		nativeToDispatcherMap = {
			mouseup: 'onMouseUp',
			mousedown: 'onMouseDown',
			click: 'onClick',
			keyup: 'onKeyUp',
			keydown: 'onKeyDown',
			keypress: 'onKeyPress',
			submit: 'onSubmit',
			reset: 'onReset',
			contextmenu: 'onContextMenu',
			dblclick: 'onDblClick',
			paste: 'onPaste',
			cut: 'onCut',
			copy: 'onCopy',
			selectionchange: 'onSelectionChange',
			focusin: 'onFocusIn',
			focusout: 'onFocusOut',
			beforeinput: 'onBeforeInput',
			input: 'onInput'
		};

		// Handler that takes a native event and sends it out to a dispatcher like onKeyDown
		function eventHandler(evt, args) {
			// Don't fire events when it's removed
			if (self.removed) {
				return;
			}

			// Sends the native event out to a global dispatcher then to the specific event dispatcher
			if (self.onEvent.dispatch(self, evt, args) !== false) {
				self[nativeToDispatcherMap[evt.fakeType || evt.type]].dispatch(self, evt, args);
			}
		}

		// Add DOM events
		each(nativeToDispatcherMap, function (dispatcherName, nativeName) {
			var root = settings.content_editable ? self.getBody() : self.getDoc();

			switch (nativeName) {
				case 'contextmenu':
					dom.bind(root, nativeName, eventHandler);
					break;

				case 'paste':
				case 'cut':
				case 'copy':
					dom.bind(self.getBody(), nativeName, eventHandler);
					break;

				case 'submit':
				case 'reset':
					dom.bind(self.getElement().form || ibis.DOM.getParent(self.id, 'form'), nativeName, eventHandler);
					break;

				default:
					dom.bind(root, nativeName, eventHandler);
			}
		});

		function getFocusTarget() {
			if (settings.content_editable) {
				return self.getBody();
			}

			if (ibis.isGecko) {
				return self.getDoc();
			}

			return self.getWin();
		}

		// Set the editor as active when focused
		dom.bind(getFocusTarget(), 'focus', function () {
			self.focus(true);
		});

		// Add reset handler
		self.onReset.add(function () {
			self.setContent(self.startContent, {
				format: 'raw'
			});
		});

		function hasModifier(e) {
			return e.altKey || e.ctrlKey || e.metaKey;
		}

		function isFunctionKey(e) {
			return e.type === "keydown" && e.keyCode >= 112 && e.keyCode <= 123;
		}

		function matchShortcut(e, shortcut) {
			if (!shortcut) {
				return false;
			}

			/*var ctrlState = ibis.isMac ? e.metaKey : e.ctrlKey;
	  
				  if (shortcut.ctrl != ctrlState) {
					  return false;
				  }*/

			if (shortcut.ctrl != e.ctrlKey || shortcut.meta != e.metaKey) {
				return false;
			}

			if (shortcut.alt != e.altKey || shortcut.shift != e.shiftKey) {
				return false;
			}

			if (e.keyCode == shortcut.keyCode || (e.charCode && e.charCode == shortcut.charCode)) {
				e.preventDefault();
				return true;
			}

			return false;
		}

		function executeShortcutAction(shortcut) {
			return shortcut.func ? shortcut.func.call(shortcut.scope) : null;
		}

		var pendingPatterns = [];

		// Add shortcuts
		function handleShortcut(e) {
			if ((hasModifier(e) || isFunctionKey(e)) && !e.isDefaultPrevented()) {
				each(self.shortcuts, function (shortcut) {
					if (matchShortcut(e, shortcut)) {
						pendingPatterns = shortcut.subpatterns.slice(0);

						if (e.type == "keydown") {
							executeShortcutAction(shortcut);
						}

						return true;
					}
				});

				if (matchShortcut(e, pendingPatterns[0])) {
					if (pendingPatterns.length === 1) {
						if (e.type == "keydown") {
							executeShortcutAction(pendingPatterns[0]);
						}
					}

					pendingPatterns.shift();
				}
			}
		}

		self.onKeyUp.add(function (ed, e) {
			handleShortcut(e);
		});

		self.onKeyPress.add(function (ed, e) {
			handleShortcut(e);
		});

		self.onKeyDown.add(function (ed, e) {
			handleShortcut(e);
		});
	};
})(ibis);