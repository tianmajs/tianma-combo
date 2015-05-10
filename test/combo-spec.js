'use strict';

var path = require('path');
var http = require('http');
var should = require('should');
var rewire = require('rewire');
var request = require('supertest');
var tianma = require('tianma');
var combo = rewire('..');

function createServer() {
    var app = tianma();
    var server = http.createServer(app.run);
    var root = path.resolve(__dirname, './fixtures');

    app.use(function *(next){
            // because of supertest  parse  '??' to '?%3F'
            this.request.url(decodeURIComponent(this.request.url()));
            yield next;
        })
        .use(combo())
        .static(root)
        .use(function *(next) {
            this.response.status(404);
        })
    return server;
}

describe('combo private method', function(){
    var parseURL = combo.__get__('parseURL');

    describe('parseURL()', function(){
        it('should return null when parsing a normal url', function(){
            var result = parseURL('/css/6v/apollo/a.css');
            (result===null).should.be.true;
        });

        it('should return matched urls when parsing a combo url with parameter', function(){
            var path = '/css/6v/??apollo/a.css,apollo/b.css?t=100';
            var result = parseURL(path);
            result.length.should.equal(2);
            result[0].should.equal('/css/6v/apollo/a.css?t=100');
            result[1].should.equal('/css/6v/apollo/b.css?t=100');
        });

        it('should return matched urls when parsing a combo url without parameter', function(){
            var path = '/css/6v/??apollo/a.css';
            var result = parseURL(path);
            result.length.should.equal(1);
            result[0].should.equal('/css/6v/apollo/a.css?');
        });
    });
});

describe('combo(pathname)', function () {
    var server = createServer();

    it('should return all content when parsing exist url', function(done) {
        var reqpath = '/css/%3F%3Fa.css,b.css'; // /css/??a.css,b.css
        request(server)
            .get(reqpath)
            .expect(/\.a\{\}\s*\.b\{\}/)
            .end(done);
    });

    it('should return error pathname when parsing no exist url', function(done){
        var reqpath = '/css/%3F%3Fa.css,z.css'; // /css/??a.css,z.css
        request(server)
            .get(reqpath)
            // .expect(404)
            .expect('/css/z.css')
            .end(done);
    });
});

