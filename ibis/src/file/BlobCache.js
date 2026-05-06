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
 * Hold blob info objects where a blob has extra internal information.
 *
 * @private
 * @class ibis.file.BlobCache
 */


var Arr = ibis.util.Arr, Fun = ibis.util.Fun, Uuid = ibis.util.Uuid;

var cache = [],
  constant = Fun.constant;

function mimeToExt(mime) {
  var mimes = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/png': 'png'
  };

  return mimes[mime.toLowerCase()] || 'dat';
}

function create(o, blob, base64, filename) {
  return typeof o === 'object' ? toBlobInfo(o) : toBlobInfo({
    id: o,
    name: filename,
    blob: blob,
    base64: base64
  });
}

function toBlobInfo(o) {
  var id, name;

  if (!o.blob || !o.base64) {
    throw "blob and base64 representations of the image are required for BlobInfo to be created";
  }

  id = o.id || Uuid.uuid('blobid');
  name = o.name || id;

  return {
    id: constant(id),
    name: constant(name),
    filename: constant(name + '.' + mimeToExt(o.blob.type)),
    blob: constant(o.blob),
    base64: constant(o.base64),
    blobUri: constant(o.blobUri || URL.createObjectURL(o.blob)),
    uri: constant(o.uri)
  };
}

function add(blobInfo) {
  if (!get(blobInfo.id())) {
    cache.push(blobInfo);
  }
}

function get(id) {
  return findFirst(function (cachedBlobInfo) {
    return cachedBlobInfo.id() === id;
  });
}

function findFirst(predicate) {
  return Arr.filter(cache, predicate)[0];
}

function getByUri(blobUri) {
  return findFirst(function (blobInfo) {
    return blobInfo.blobUri() == blobUri;
  });
}

function removeByUri(blobUri) {
  cache = Arr.filter(cache, function (blobInfo) {
    if (blobInfo.blobUri() === blobUri) {
      URL.revokeObjectURL(blobInfo.blobUri());
      return false;
    }

    return true;
  });
}

function destroy() {
  Arr.each(cache, function (cachedBlobInfo) {
    URL.revokeObjectURL(cachedBlobInfo.blobUri());
  });

  cache = [];
}

ibis.file.BlobCache = {
  create: create,
  add: add,
  get: get,
  getByUri: getByUri,
  findFirst: findFirst,
  removeByUri: removeByUri,
  destroy: destroy
};
