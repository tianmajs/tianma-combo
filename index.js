'use strict';

var PATTERN_COMBO_URL = /^(\/.*?)\?\?(.*?)(\?.*)?$/;

/**
 * Parse the combo style URL.
 * @param url {string}
 * @return {Array|null}
 */
function parseURL(url) {
    var re;

    if (re = url.match(PATTERN_COMBO_URL)) {
        return re[2].split(',').map(function(pathname) {
            return re[1] + pathname + (re[3] || '?');
        });
    }

    return null;
}

/**
 * Filter factory.
 * @param [delimiter] {Object}
 * @return {Function}
 */
module.exports = function(delimiter) {
    return function*(next) {
        var req = this.request,
            res = this.response,
            paths,
            datum = [];

        if (req.method() === 'GET' && (paths = parseURL(req.path))) {
            for (let i = 0, len = paths.length; i < len; ++i) {
                req.url(paths[i]);
                yield next;
                if (res.status() !== 200) {
                    res.data(req.pathname);
                    return;
                }
                datum.push(res.data());
            }

            res.data(datum);
        } else {
            yield next;
        }
    };
};
