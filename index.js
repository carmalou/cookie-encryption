"use strict";
/**
 * @file cookie-encryption main
 * @module cookie-encryption
 * @package cookie-encryption
 * @subpackage main
 * @version 1.1.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2014
 * @license GPLv3
 */

/*
 * initialize module
 */
// import
try {
    var arc4;
    var autokey;
    var crypto = require('crypto');
    var getCipher = new Array([ 'arc4', 'rc4a', 'vmpc', 'rc4+' ], crypto
            .getCiphers(), crypto.getHashes(), [ 'modp1', 'modp2', 'modp5',
            'modp14', 'modp15', 'modp16', 'modp17', 'modp18' ], [ 'pbkdf2' ], [ 'autokey' ]);
} catch (MODULE_NOT_FOUND) {
    console.error(MODULE_NOT_FOUND);
    process.exit(1);
}

/*
 * class
 */
/**
 * SIGNED class
 * 
 * @class SIGNED
 * @param {Object} my - user option
 * @return {Object}
 */
function SIGNED(my) {

    this._my = my;
    this.cookie = this._my.cookie;
    this.encoding = this._my.encoding;
    this.decrypt;
    this.encrypt;
    this._cipher;
    this.customization(true);
    this.cache = {
        read: new Object(),
        write: new Object()
    };
}
/**
 * NORMAL class
 * 
 * @class NORMAL
 * @param {Object} my - user option
 * @return {Object}
 */
function NORMAL(my) {

    this._my = my;
    this.cookie = this._my.cookie;
    this.encoding = this._my.encoding;
    this.decrypt;
    this.encrypt;
    this._cipher;
    this.customization(false);
    this.cache = {
        read: new Object(),
        write: new Object()
    };
}

/**
 * customization for class
 * 
 * @function customization
 * @param {Boolean} signed - if signed class
 */
SIGNED.prototype.customization = NORMAL.prototype.customization = function(
                                                                           signed) {

    var my = this._my;
    if (my.cipher === getCipher[4][0]) { // pbkdf2
        this.encrypt = function(data, encoding) {

            return crypto
                    .pbkdf2Sync(my.cipher, my.extra[0], my.extra[1], my.extra[2])
                    .toString(encoding || this.encoding);
        };
        this.decrypt = function(data, encoding) {

            throw new TypeError('Pbkdf2 not supported');
            return;
        };

    } else if (my.cipher === getCipher[5][0]) { // autokey
        if (!autokey) { // lazy load
            autokey = require('autokey');
        }
        this._cipher = autokey(my.secret);
        this.encrypt = function(data, encoding) {

            if (typeof (data) === 'string') {
                return this._cipher.encodeString(data, 'utf8', encoding
                        || this.encoding);
            }
            if (Buffer.isBuffer(data)) {
                return this._cipher.encodeBuffer(data).toString(encoding
                        || this.encoding);
            }
            throw new TypeError('Not a string or buffer');
            return;
        };
        this.decrypt = function(data, encoding) {

            if (typeof (data) === 'string') {
                return this._cipher.decodeString(data, encoding
                        || this.encoding);
            }
            throw new TypeError('Not a string or buffer');
            return;
        };

    } else if (getCipher[0].indexOf(my.cipher) >= 0) { // arc4
        if (!arc4) { // lazy load
            arc4 = require('arc4');
        }
        this._cipher = arc4(my.cipher, my.secret);
        this.encrypt = function(data, encoding) {

            if (typeof (data) === 'string') {
                return this._cipher.encodeString(data, 'utf8', encoding
                        || this.encoding);
            }
            if (Buffer.isBuffer(data)) {
                return this._cipher.encodeBuffer(data).toString(encoding
                        || this.encoding);
            }
            throw new TypeError('Not a string or buffer');
            return;
        };
        this.decrypt = function(data, encoding) {

            if (typeof (data) === 'string') {
                return this._cipher.decodeString(data, encoding
                        || this.encoding);
            }
            throw new TypeError('Not a string or buffer');
            return;
        };

    } else if (getCipher[1].indexOf(my.cipher) >= 0) { // ciphers
        this.encrypt = function(data, encoding) {

            var cipher = crypto.createCipher(my.cipher, my.secret);
            cipher.update(data);
            return cipher.final(encoding || this.encoding);
        };
        this.decrypt = function(data, encoding) {

            var cipher = crypto.createDecipher(my.cipher, my.secret);
            cipher.update(data, encoding || this.encoding);
            return cipher.final();
        };

    } else if (getCipher[2].indexOf(my.cipher) >= 0) {
        if (my.extra[0] === undefined) { // hash
            this.encrypt = function(data, encoding) {

                var cipher = crypto.createHash(my.cipher);
                cipher.update(data);
                return cipher.digest(encoding || this.encoding);
            };
            this.decrypt = function(data, encoding) {

                throw new TypeError('Hash not supported');
                return;
            };

        } else { // hmac
            this.encrypt = function(data, encoding) {

                var cipher = crypto.createHmac(my.cipher, my.secret);
                cipher.update(data);
                return cipher.digest(encoding || this.encoding);
            };
            this.decrypt = function(data, encoding) {

                throw new TypeError('Hmac not supported');
                return;
            };
        }

    } else if (getCipher[3].indexOf(my.cipher) >= 0) { // DiffieHellman
        this.encrypt = function(data, encoding) {

            var cipher = crypto.getDiffieHellman(my.cipher);
            return cipher.generateKeys().toString(encoding || this.encoding);
        };
        this.decrypt = function(data, encoding) {

            throw new TypeError('DiffieHellman not supported');
            return;
        };
    } else {
        throw new TypeError('Cipher not supported');
    }

    /**
     * set data to cookie
     * 
     * @function set
     * @param {Object} res - response to client
     * @param {String} data - string for cookie
     * @param {String} [cookie] - fast cookie
     * @return {String}
     */
    this.set = function(res, data, cookie) {

        var my = this._my;
        return res.cookie(cookie || this.cookie, data, {
            domain: my.domain,
            path: my.path,
            maxAge: my.age,
            httpOnly: my.httpOnly,
            secure: my.secure,
            signed: signed
        }), data;
    };
    return;
};

/**
 * Decrypt information on signed cookie
 * 
 * @function read
 * @param {Object} req - client request
 * @param {String} [cookie] - fast cookie
 * @param {String} [encoding] - fast encoding
 * @return {String}
 */
SIGNED.prototype.read = function(req, cookie, encoding) {

    var ck;
    if (req.signedCookies === undefined
            || !(ck = req.signedCookies[cookie || this.cookie])) {
        return '';
        /**
         * @todo req.headers.cookie
         */
    }
    // try {
    if (this.cache.read[ck]) {
        return this.cache.read[ck];
    }
    this.cache.read = new Object();
    return this.cache.read[ck] = this.decrypt(ck, encoding);
    // } catch (TypeError) {
    // return '';
    // }
};
/**
 * Decrypt information on cookie
 * 
 * @function read
 * @param {Object} req - client request
 * @param {String} [cookie] - fast cookie
 * @param {String} [encoding] - fast encoding
 * @return {String}
 */
NORMAL.prototype.read = function(req, cookie, encoding) {

    var ck;
    if (req.cookies === undefined || !(ck = req.cookies[cookie || this.cookie])) {
        return '';
        /**
         * @todo req.headers.cookie
         */
    }
    // try {
    if (this.cache.read[ck]) {
        return this.cache.read[ck];
    }
    this.cache.read = new Object();
    return this.cache.read[ck] = this.decrypt(ck, encoding);
    // } catch (TypeError) {
    // return '';
    // }
};

/**
 * Encrypt information on signed cookie
 * 
 * @function write
 * @param {Object} req - client request
 * @param {String} data - data to write on cookie
 * @param {String} [cookie] - fast cookie
 * @param {String} [encoding] - fast encoding
 */
SIGNED.prototype.write = function(req, data, cookie, encoding) {

    var out;
    var ck = cookie || this.cookie;
    if (this.cache.write[data]) {
        out = this.cache.write[data];
    } else {
        this.cache.write = new Object();
        out = this.cache.write[data] = this.encrypt(data, encoding);
    }
    if (req.signedCookies[ck] !== out) {
        var res = req.res;
        req.signedCookies[ck] = this.set(res, out, cookie);
    }
    return out;
};
/**
 * Encrypt information on cookie
 * 
 * @function write
 * @param {Object} req - client request
 * @param {String} data - data to write on cookie
 * @param {String} [cookie] - fast cookie
 * @param {String} [encoding] - fast encoding
 */
NORMAL.prototype.write = function(req, data, cookie, encoding) {

    var out;
    var ck = cookie || this.cookie;
    if (this.cache.write[data]) {
        out = this.cache.write[data];
    } else {
        this.cache.write = new Object();
        out = this.cache.write[data] = this.encrypt(data, encoding);
    }
    if (req.cookies[ck] !== out) {
        var res = req.res;
        req.cookies[ck] = this.set(res, out, cookie);
    }
    return out;
};

/*
 * functions
 */
/**
 * options setting
 * 
 * @exports cookiee
 * @function cookiee
 * @param {String} secret - user password
 * @param {Object} [options] - various options. Check README.md
 * @return {Object}
 */
module.exports = function cookiee(secret, options) {

    if (!secret) {
        throw new TypeError('secret required');
    }
    var options = options || Object.create(null);
    var my = {
        secret: String(secret),
        cipher: String(options.cipher || 'arc4'),
        cookie: String(options.cookie || 'vault'),
        domain: String(options.domain || ''),
        path: String(options.path || '/'),
        age: Number(options.age) || 1000 * 3600 * 24 * 365,
        httpOnly: Boolean(options.httpOnly),
        secure: Boolean(options.secure),
        signed: Boolean(options.signed),
        encoding: String(options.encoding || 'hex'),
        extra: Array.isArray(options.extra) == true ? options.extra
                : new Array()
    };

    if (Boolean(options.signed)) {
        return new SIGNED(my);
    }
    return new NORMAL(my);
};

/**
 * get supported ciphers
 * 
 * @exports getCiphers
 * @function getCiphers
 * @return {Array}
 */
module.exports.getCiphers = function getCiphers() {

    return getCipher;
};
