process.on('unhandledRejection', r => console.log('UnhandledPromiseRejectionWarning',r));
var Promise = require('bluebird');
var mongodb = require('mongodb');
var Throttler = require('../src');
var assert = require('assert');

var db;

module.exports = t => {

  return mongodb.connect('mongodb://localhost:27017/fn-throttler-test').then(d => {

    db = d;

    t.test('Retrieve OK to go ahead', t => {
    
      t.test('should get initial ok', () => {
        var th = Throttler({
          collection: 'test',
          max: 1,
          unit: 'second',
          db: db,
        });
        return th.getToken()
          .then(d => assert.equal(d, 'OK'));
      });

      t.test('should get a WAIT after initial OK', () => {
        var th = Throttler({
          max: 1,
          unit: 'second',
          db: db,
        });
        th.getToken();
        return th.getToken()
          .then(console.log, e => assert.fail(e, 'WAIT'));
      });

      t.test('spreads requests across time using seconds', () => {
        this.timeout(10000);

        var th = Throttler({
          max: 1,
          unit: 'second',
          db: db,
        });

        function fn(d) {
          return [d, new Date()];
        }

        return Promise.map([1, 2, 3, 4, 5], d => {
            return Promise.resolve(d)
              .then(th.nextToken)
              .then(fn);
          })
          .then(d => {
            d.forEach((x, i) => i && assert(Math.abs(d[i][1] - d[i - 1][1]) >= 1000));
            console.log(d);
          });
      });

      t.test('spreads requests across time using 500 ms windows', () => {
        this.timeout(10000);

        var th = Throttler({
          max: 1,
          unit: 500,
          retryInterval: 500,
          db: db,
        });

        function fn(d) {
          return [d, new Date()];
        }

        return Promise.map([1, 2, 3, 4, 5], d => {
            return Promise.resolve(d)
              .then(th.nextToken)
              .then(fn);
          })
          .then(d => d.forEach((x, i) => i && assert(Math.abs(d[i][1] - d[i - 1][1]) >= 500)));
      });

//      t.end();

//      t.teardown(() => db.collection('test').remove({}));

    });

    t.end();
  });

};

if (!module.parent) module.exports(require('tap'));
