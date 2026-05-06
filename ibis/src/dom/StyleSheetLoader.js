/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */
/*eslint no-console:1 */

(function (ibis) {
  /**
	 * This class handles asynchronous/synchronous loading of stylesheet files it will execute callbacks when various items gets loaded. This class is useful to load external stylesheet files.
	 *
	 * @class ibis.dom.StyleSheetLoader
	 * @example
	 * // Load a stylesheet from a specific URL using the global stylesheet loader
	 * ibis.StyleSheetLoader.load('somestylesheet.js');
	 *
	 * // Load a stylesheet using a unique instance of the stylesheet loader
	 * var StyleSheetLoader = new ibis.dom.StyleSheetLoader();
	 *
	 * StyleSheetLoader.load('somestylesheet.js');
	 *
	 * // Load multiple stylesheets
	 * var StyleSheetLoader = new ibis.dom.StyleSheetLoader();
	 *
	 * StyleSheetLoader.add('somestylesheet1.js');
	 * StyleSheetLoader.add('somestylesheet2.js');
	 * StyleSheetLoader.add('somestylesheet3.js');
	 *
	 * StyleSheetLoader.loadQueue(function() {
	 *    alert('All stylesheets are now loaded.');
	 * });
	 */
  ibis.dom.StyleSheetLoader = function (document) {
    var QUEUED = 0,
      LOADING = 1,
      LOADED = 2,
      states = {},
      queue = [],
      stylesheetLoadedCallbacks = {},
      queueLoadedCallbacks = [],
      loading = 0,
      undef,
      maxLoadTime = 5000;

    /**
		 * Loads a specific stylesheet directly without adding it to the load queue.
		 *
		 * @method load
		 * @param {String} url Absolute URL to stylesheet to add.
		 * @param {function} callback Optional callback function to execute ones this stylesheet gets loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
    function loadStylesheet(url, callback) {
      var dom = ibis.DOM,
        elm, id, startTime, complete;

      // Execute callback when stylesheet is loaded
      function done() {
        if (complete) {
          return;
        }

        complete = true;

        if (elm) {
          elm.onreadystatechange = elm.onload = elm = null;
        }

        callback();
      }

      function error() {
        // Report the error so it's easier for people to spot loading errors
        if (typeof (console) !== "undefined" && console.log) {
          console.log("Failed to load: " + url);
        }

        // We can't mark it as done if there is a load error since
        // A) We don't want to produce 404 errors on the server and
        // B) the onerror event won't fire on all browsers.
        done();
      }

      // Calls the waitCallback until the test returns true or the timeout occurs
      // Uses methods from Tinymce 4.x for testing stylesheet files - https://github.com/ibis/ibis/blob/4.5.x/js/ibis/classes/dom/StyleSheetLoader.js
      function wait(testCallback, waitCallback) {
        if (!testCallback()) {
          // Wait for timeout
          if ((new Date().getTime()) - startTime < maxLoadTime) {
            setTimeout(waitCallback);
          } else {
            error();
          }
        }
      }

      function waitForLoaded() {
        wait(function () {
          var styleSheets = document.styleSheets,
            styleSheet, i = styleSheets.length,
            owner;

          while (i--) {
            styleSheet = styleSheets[i];

            owner = styleSheet.ownerNode ? styleSheet.ownerNode : styleSheet.owningElement;
            if (owner && owner.id === elm.id) {
              done();
              return true;
            }
          }
        }, waitForLoaded);
      }

      id = dom.uniqueId();

      // Create new link element
      elm = document.createElement('link');
      elm.rel = 'stylesheet';
      elm.type = 'text/css';
      elm.href = ibis._addVer(url);
      elm.async = false;
      elm.defer = false;

      startTime = new Date().getTime();

      // prevent cloudflare rocket-loader caching
      elm.setAttribute('data-cfasync', false);
      elm.id = id;

      // Add onload listener
      elm.onload = waitForLoaded;

      // Add onerror event
      elm.onerror = error;

      // Add stylesheet to document
      (document.getElementsByTagName('head')[0] || document.body).appendChild(elm);
    }

    /**
		 * Returns true/false if a stylesheet has been loaded or not.
		 *
		 * @method isDone
		 * @param {String} url URL to check for.
		 * @return [Boolean} true/false if the URL is loaded.
		 */
    this.isDone = function (url) {
      return states[url] == LOADED;
    };

    /**
		 * Marks a specific stylesheet to be loaded. This can be useful if a stylesheet got loaded outside
		 * the stylesheet loader or to skip it from loading some stylesheet.
		 *
		 * @method markDone
		 * @param {string} u Absolute URL to the stylesheet to mark as loaded.
		 */
    this.markDone = function (url) {
      states[url] = LOADED;
    };

    /**
		 * Adds a specific stylesheet to the load queue of the stylesheet loader.
		 *
		 * @method add
		 * @param {String} url Absolute URL to stylesheet to add.
		 * @param {function} callback Optional callback function to execute ones this stylesheet gets loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
    this.add = this.load = function (url, callback, scope) {
      var state = states[url];

      // Add url to load queue
      if (state == undef) {
        queue.push(url);
        states[url] = QUEUED;
      }

      if (callback) {
        // Store away callback for later execution
        if (!stylesheetLoadedCallbacks[url]) {
          stylesheetLoadedCallbacks[url] = [];
        }

        stylesheetLoadedCallbacks[url].push({
          func: callback,
          scope: scope || this
        });
      }
    };

    /**
		 * Starts the loading of the queue.
		 *
		 * @method loadQueue
		 * @param {function} callback Optional callback to execute when all queued items are loaded.
		 * @param {Object} scope Optional scope to execute the callback in.
		 */
    this.loadQueue = function (callback, scope) {
      this.loadStylesheets(queue, callback, scope);
    };

    /**
		 * Loads the specified queue of files and executes the callback ones they are loaded.
		 * This method is generally not used outside this class but it might be useful in some scenarios.
		 *
		 * @method loadStylesheets
		 * @param {Array} stylesheets Array of queue items to load.
		 * @param {function} callback Optional callback to execute ones all items are loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
    this.loadStylesheets = function (stylesheets, callback, scope) {
      var loadStylesheets;

      function execstylesheetLoadedCallbacks(url) {
        // Execute URL callback functions
        ibis.each(stylesheetLoadedCallbacks[url], function (callback) {
          callback.func.call(callback.scope);
        });

        stylesheetLoadedCallbacks[url] = undef;
      }

      queueLoadedCallbacks.push({
        func: callback,
        scope: scope || this
      });

      loadStylesheets = function () {
        var loadingstylesheets = ibis.grep(stylesheets);

        // Current stylesheets has been handled
        stylesheets.length = 0;

        // Load stylesheets that needs to be loaded
        ibis.each(loadingstylesheets, function (url) {
          // stylesheet is already loaded then execute stylesheet callbacks directly
          if (states[url] == LOADED) {
            execstylesheetLoadedCallbacks(url);
            return;
          }

          // Is stylesheet not loading then start loading it
          if (states[url] != LOADING) {
            states[url] = LOADING;
            loading++;

            loadStylesheet(url, function () {
              states[url] = LOADED;
              loading--;

              execstylesheetLoadedCallbacks(url);

              // Load more stylesheets if they where added by the recently loaded stylesheet
              loadStylesheets();
            });
          }
        });

        // No stylesheets are currently loading then execute all pending queue loaded callbacks
        if (!loading) {
          ibis.each(queueLoadedCallbacks, function (callback) {
            callback.func.call(callback.scope);
          });

          queueLoadedCallbacks.length = 0;
        }
      };

      loadStylesheets();
    };

    this.loadStylesheet = loadStylesheet;
  };

  // Global stylesheet loader
  ibis.StyleSheetLoader = new ibis.dom.StyleSheetLoader();
})(ibis);