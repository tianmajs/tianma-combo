'use strict';

var http = require('http');
var combo = require('..');
var request = require('supertest');
var tianma = require('tianma');
var path = require('path');

var MTIME = {
    '/foo/bar.txt': 1000,
    '/foo/baz.txt': 2000
};

function createApp() {
    var app = tianma();
    var server = http.createServer(app.run);

    app.server = server;

    return app;
}

describe('combo()', function () {
    function createServer() {
        var app = createApp();

        app.use(combo())
            .use(function *(next) {
                var req = this.request;
                var res = this.response;
                var extname = path.extname(req.pathname);
                var mtime = new Date(MTIME[req.pathname] || 0).toGMTString();

                switch (extname) {
                case '.js':
                case '.css':
                case '.txt':
                    res.status(200)
                        .type(extname)
                        .head('last-modified', mtime)
                        .data(req.pathname + (req.query.data || ''));
                    break;
                default:
                    res.status(404);
                    break;
                }
            });

        return app.server;
    }

    it('should concat two request', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.txt,baz.txt')
            .expect(200)
            .expect('content-type', 'text/plain')
            .expect('/foo/bar.txt/foo/baz.txt')
            .end(done);
    });

    it('should offer a default delimiter for js', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.js,baz.js')
            .expect(200)
            .expect('content-type', 'application/javascript')
            .expect('/foo/bar.js\n/foo/baz.js\n')
            .end(done);
    });

    it('should offer a default delimiter for css', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.css,baz.css')
            .expect(200)
            .expect('content-type', 'text/css')
            .expect('/foo/bar.css\n/foo/baz.css\n')
            .end(done);
    });

    it('should share the params between sub-request', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.txt,baz.txt?data=hello')
            .expect(200)
            .expect('/foo/bar.txthello/foo/baz.txthello')
            .end(done);
    });

    it('should use the latest mtime', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.txt,baz.txt')
            .expect(200)
            .expect('last-modified', 'Thu, 01 Jan 1970 00:00:02 GMT')
            .end(done);
    });

    it('should fail with a bad sub-request', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.js,baz.html')
            .expect(500)
            .expect(/to get/)
            .end(done);
    });

    it('should fail with mixed file type', function (done) {
        request(createServer())
            .get('/foo/%3F%3Fbar.js,baz.css')
            .expect(500)
            .expect(/inconsistent/)
            .end(done);
    });
});

describe('combo(delimiter)', function () {
    function createServer(delimiter) {
        var app = createApp();

        app.use(combo(delimiter))
            .use(function *(next) {
                this.response
                    .status(200)
                    .type('txt')
                    .data('..');
            });

        return app.server;
    }

    it('should support string delimiter', function (done) {
        request(createServer({ 'text/plain': '\n' }))
            .get('/foo/%3F%3Fbar,baz')
            .expect(200)
            .expect('content-type', 'text/plain')
            .expect('..\n..\n')
            .end(done);
    });

    it('should support buffer delimiter', function (done) {
        request(createServer({ 'text/plain': new Buffer('|') }))
            .get('/foo/%3F%3Fbar,baz')
            .expect(200)
            .expect('content-type', 'text/plain')
            .expect('..|..|')
            .end(done);
    });
});
