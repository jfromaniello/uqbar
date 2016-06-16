const uqbar     = require('../');
const Container = uqbar.Container;
const assert    = require('chai').assert;

describe('container', function () {

  it('should be able to resolve a simple service', function (done) {
    const container = new Container();
    const instance = {};

    container.registerSync('service1', () => instance);

    container.resolve('service1', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service, instance);
      done();
    });
  });

  it('should return different instances when using transient registrations', function (done) {
    const container = new Container();

    container.registerSync('service1', () => ({}), { singleton: false });

    container.resolve('service1', (err, service1) => {
      if (err) return done(err);
      container.resolve('service1', (err, service2) => {
        if (err) return done(err);
        assert.notStrictEqual(service1, service2);
        done();
      });
    });
  });

  it('should be able to resolve multiples services at once', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};
    const instanceC = {};

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );
    container.registerSync('serviceC', () => instanceC );

    container.resolve(['serviceA', 'serviceB', 'serviceC'], (err, services) => {
      if (err) return done(err);
      assert.strictEqual(services[0], instanceA);
      assert.strictEqual(services[1], instanceB);
      assert.strictEqual(services[2], instanceC);
      done();
    });
  });

  it('should allow register a service with dependencies', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );
    container.register('serviceC', callback => {
      container.resolve(['serviceA', 'serviceB'], function (err, services) {
        if (err) { return callback(err); }
        callback(null, { dependencies: services });
      });
    });

    container.resolve('serviceC', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.dependencies[0], instanceA);
      assert.strictEqual(service.dependencies[1], instanceB);
      done();
    });
  });

  it('should allow register a service with dependencies using autoresolution', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );
    container.register('serviceC', (serviceA, serviceB, callback) => {
      callback(null, { dependencies: [serviceA, serviceB] });
    });

    container.resolve('serviceC', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.dependencies[0], instanceA);
      assert.strictEqual(service.dependencies[1], instanceB);
      done();
    });
  });


  it('should allow register a sync factory with dependencies using autoresolution', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    container.registerInstance('serviceA', instanceA );
    container.registerInstance('serviceB', instanceB );
    container.registerSync('serviceC', (serviceA, serviceB) => {
      return { dependencies: [serviceA, serviceB] };
    });

    container.resolve('serviceC', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.dependencies[0], instanceA);
      assert.strictEqual(service.dependencies[1], instanceB);
      done();
    });
  });


  it('should allow register a class constructor with dependencies using autoresolution', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    function ServiceC (serviceA, serviceB) {
      this.dependencies = [serviceA, serviceB];
    }

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );
    container.registerCtor('serviceC', ServiceC);

    container.resolve('serviceC', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.dependencies[0], instanceA);
      assert.strictEqual(service.dependencies[1], instanceB);
      assert.instanceOf(service, ServiceC);
      done();
    });
  });

  it('should allow register a class constructor with dependencies using @require', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    function ServiceC (a, b) {
      this.dependencies = [a, b];
    }

    ServiceC['@require'] = ['serviceA', 'serviceB'];

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );
    container.registerCtor('serviceC', ServiceC);

    container.resolve('serviceC', (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.dependencies[0], instanceA);
      assert.strictEqual(service.dependencies[1], instanceB);
      assert.instanceOf(service, ServiceC);
      done();
    });
  });


  it('should provide a function to inject services', function (done) {
    const container = new Container();
    const instanceA = {};
    const instanceB = {};

    function serviceC (serviceA, serviceB, callback) {
      callback(null, {serviceA, serviceB});
    }

    container.registerSync('serviceA', () => instanceA );
    container.registerSync('serviceB', () => instanceB );

    container.call(serviceC, (err, service) => {
      if (err) return done(err);
      assert.strictEqual(service.serviceA, instanceA);
      assert.strictEqual(service.serviceB, instanceB);
      done();
    });
  });
});
