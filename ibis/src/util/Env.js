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
 * This class contains various environment constants like browser versions etc.
 * Normally you don't want to sniff specific browser versions but sometimes you have
 * to when it's impossible to feature detect. So use this with care.
 *
 * @class ibis.Env
 * @static
 */

var nav = navigator,
  userAgent = nav.userAgent;
var opera, webkit, ie, gecko, mac, iDevice, android, fileApi, phone, tablet, windowsPhone, isTouchEnabled;

function matchMediaQuery(query) {
  return "matchMedia" in window ? matchMedia(query).matches : false;
}

isTouchEnabled = navigator.maxTouchPoints > 1;

function isIpad() {
  // Check for iOS 13+ iPad
  var isIOS = /iPad/.test(userAgent);
  // Additional checks for distinguishing iPads from Macs
  var hasMacLikeUserAgent = /Macintosh/.test(userAgent);
  // Combining checks to improve accuracy
  return isIOS || (isTouchEnabled && hasMacLikeUserAgent);
}

opera = window.opera && window.opera.buildNumber;
android = /Android/.test(userAgent);
webkit = /WebKit/.test(userAgent);
ie = !webkit && !opera && (/MSIE/gi).test(userAgent) && (/Explorer/gi).test(nav.appName);
ie = ie && /MSIE (\w+)\./.exec(userAgent)[1];
ie = ie && !webkit;
gecko = !webkit && !ie && /Gecko/.test(userAgent);
mac = userAgent.indexOf('Mac') != -1;
iDevice = /(iPad|iPhone)/.test(userAgent) || isIpad();
fileApi = "FormData" in window && "FileReader" in window && "URL" in window && !!URL.createObjectURL;
phone = matchMediaQuery("only screen and (max-device-width: 480px)") && (android || iDevice);
tablet = matchMediaQuery("only screen and (min-width: 800px)") && (android || iDevice);
windowsPhone = userAgent.indexOf('Windows Phone') != -1;

// Is a iPad/iPhone and not on iOS5 sniff the WebKit version since older iOS WebKit versions
// says it has contentEditable support but there is no visible caret.
var contentEditable = !iDevice || fileApi || userAgent.match(/AppleWebKit\/(\d*)/)[1] >= 534;

ibis.util.Env = {
  /**
   * Constant that is true if the browser is Opera.
   *
   * @property opera
   * @type Boolean
   * @final
   */
  opera: opera,

  /**
   * Constant that is true if the browser is WebKit (Safari/Chrome).
   *
   * @property webKit
   * @type Boolean
   * @final
   */
  webkit: webkit,

  /**
   * Constant that is more than zero if the browser is IE.
   *
   * @property ie
   * @type Boolean
   * @final
   */
  ie: ie,

  /**
   * Constant that is true if the browser is Gecko.
   *
   * @property gecko
   * @type Boolean
   * @final
   */
  gecko: gecko,

  /**
   * Constant that is true if the os is Mac OS.
   *
   * @property mac
   * @type Boolean
   * @final
   */
  mac: mac,

  /**
   * Constant that is true if the os is iOS.
   *
   * @property iOS
   * @type Boolean
   * @final
   */
  ios: iDevice,

  /**
   * Constant that is true if the os is android.
   *
   * @property android
   * @type Boolean
   * @final
   */
  android: android,

  /**
   * Constant that is true if the browser supports editing.
   *
   * @property contentEditable
   * @type Boolean
   * @final
   */
  contentEditable: contentEditable,

  /**
   * Transparent image data url.
   *
   * @property transparentSrc
   * @type Boolean
   * @final
   */
  transparentSrc: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

  /**
   * Returns true/false if the browser can or can't place the caret after a inline block like an image.
   *
   * @property noCaretAfter
   * @type Boolean
   * @final
   */
  caretAfter: true,

  /**
   * Constant that is true if the browser supports native DOM Ranges. IE 9+.
   *
   * @property range
   * @type Boolean
   */
  range: window.getSelection && "Range" in window,

  /**
   * Constant that is true if the browser has a modern file api.
   *
   * @property fileApi
   * @type Boolean
   */
  fileApi: fileApi,

  /**
   * Constant that is true if the browser supports contentEditable=false regions.
   *
   * @property ceFalse
   * @type Boolean
   */
  ceFalse: true,

  /**
   * Constant if CSP mode is possible or not. Meaning we can't use script urls for the iframe.
   */
  canHaveCSP: true,

  desktop: !phone && !tablet,
  windowsPhone: windowsPhone,

  /**
   * Constant that is true if the browser has touch support.
   */
  touchEnabled: isTouchEnabled
};

/**
  * Constant that is true if the browser is Opera.
  *
  * @property isOpera
  * @type Boolean
  * @final
*/
ibis.isOpera = opera;

/**
 * Constant that is true if the browser is WebKit (Safari/Chrome).
 *
 * @property isWebKit
 * @type Boolean
 * @final
 */
ibis.isWebKit = webkit;

/**
 * Constant that is true if the browser is IE.
 *
 * @property isIE
 * @type Boolean
 * @final
 */

ibis.isIE = ie;

// IE 11
ibis.isIE11 = ie && /Trident\/7.0/.test(userAgent) && /rv:11.0/.test(userAgent);


// IE 12 / Edge
ibis.isIE12 = (userAgent.indexOf('Edge/') != -1 && !ie) ? 12 : false;

// Remove webkit flag
if (ibis.isIE12) {
  ibis.isWebKit = false;
}

/**
 * Constant that is true if the browser is Gecko.
 *
 * @property isGecko
 * @type Boolean
 * @final
 */
ibis.isGecko = gecko;

/**
 * Constant that is true if the os is Mac OS.
 *
 * @property isMac
 * @type Boolean
 * @final
 */
ibis.isMac = mac;

/**
 * Constant that tells if the current device is an iPhone or iPad.
 *
 * @property isIDevice
 * @type Boolean
 * @final
 */
ibis.isIDevice = iDevice;

/**
 * Constant that tells if the current os is Android.
 *
 * @property isAndroid
 * @type Boolean
 * @final
 */
ibis.isAndroid = android;

/**
 * Constant that is true if the os is iOS.
 *
 * @property iOS
 * @type Boolean
 * @final
 */
ibis.isIOS = iDevice;

/**
 * Constant that is true if the current browser is running on iOS 5 or greater.
 *
 * @property isIOS5
 * @type Boolean
 * @final
 */
ibis.isIOS5 = iDevice && userAgent.match(/AppleWebKit\/(\d*)/)[1] >= 534;

/**
 * Constant that is true if the current browser has touch support.
 * @property touchEnabled
 * @type Boolean
 * @final
 */
ibis.touchEnabled = isTouchEnabled;