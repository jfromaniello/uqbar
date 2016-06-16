'use strict';

const xtend = require('xtend');
const async = require('async');
const getParNames = require('get-parameter-names');


function getDependenciesNames(func, ignoreLastArg) {
  if (func['@require']) {
    return func['@require'];
  }

  if (ignoreLastArg) {
    return getParNames(func).slice(0, -1);
  } else {
    return getParNames(func);
  }
}

function Container (guywire) {
  this._registry = new Map([]);
  this._instances = new Map([]);
  this._interfaces = new Map([]);

  if (guywire) {
    guywire(this);
  }
}

const default_register_options = {
  singleton: true
};

/**
 * Register a service with an asynchronous factory.
 *
 * The factory is a function that returns an instance of the service.
 *
 * @param  {string}   name    name of the service
 * @param  {function} factory a function to construct the service
 * @param  {object}   options additional options
 */
Container.prototype.register = function (name, factory, options) {
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  if (typeof factory !== 'function') {
    throw new Error('the factory function is required');
  }

  if (factory.length === 0) {
    throw new Error('the factory function needs at least 1 argument (callback)');
  }

  const config = xtend(default_register_options, options || {});

  const asyncFactory = factory.length === 1 ? factory : (callback) => {
    this.call(factory, callback);
  };

  this._registry.set(name, { factory: asyncFactory, config });

  this._addInterfaceMapping(name, config.interfaces);
};

/**
 * Register a service with an synchronous factory.
 *
 * The factory is a function that returns an instance of the service.
 *
 * @param  {string}   name    name of the service
 * @param  {function} factory a function to construct the service
 * @param  {object}   options additional options
 */
Container.prototype.registerSync = function (name, factory, options) {
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  if (typeof factory !== 'function') {
    throw new Error('the factory function is required');
  }

  const config = xtend(default_register_options, options || {});

  const asyncFactory = (callback) => {
    this.callSync(factory, callback);
  };

  this._registry.set(name, { factory: asyncFactory, config });

  this._addInterfaceMapping(name, config.interfaces);
};

/**
 * Register a service with a constructor.
 *
 * This is similar to registerSync but it does `new` when creating the instance.
 *
 * The factory is a function that returns an instance of the service.
 *
 * @param  {string}   name    name of the service
 * @param  {function} factory a function to construct the service
 * @param  {object}   options additional options
 */
Container.prototype.registerCtor = function (name, factory, options) {
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  if (typeof factory !== 'function') {
    throw new Error('the factory function is required');
  }

  const config = xtend(default_register_options, options || {});

  const asyncFactory = (callback) => {
    this.callCtor(factory, callback);
  };

  this._registry.set(name, { factory: asyncFactory, config });

  this._addInterfaceMapping(name, config.interfaces);
};

/**
 * Register a service with an instance directly.
 *
 * This is similar to registerSync but it does `new` when creating the instance.
 *
 * The factory is a function that returns an instance of the service.
 *
 * @param  {string}   name    name of the service
 * @param  {function} factory a function to construct the service
 * @param  {object}   options additional options
 */
Container.prototype.registerInstance = function (name, instance, options) {
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  if (typeof instance === 'undefined') {
    throw new Error('instance is required');
  }

  const config = xtend(default_register_options, options || {});

  const asyncFactory = (callback) => {
    callback(null, instance);
  };

  this._registry.set(name, { factory: asyncFactory, config });

  this._addInterfaceMapping(name, config.interfaces);
};


Container.prototype._addInterfaceMapping = function (name, interfaces) {
  if(interfaces && interfaces.length > 0) {
    interfaces.forEach((i) => {
      const implementations = (this._interfaces.get(i) || []).concat([name]);
      this._interfaces.set(i, implementations);
    });
  }
};

Container.prototype.callCtor = function (factory, callback) {
  const dependencies = getDependenciesNames(factory);
  this.resolve(dependencies, function (err, services) {
    if (err) { return callback(err); }
    const Factory = (Function.prototype.bind.apply(factory, [null].concat(services)));
    callback(null, new Factory());
  });
};

Container.prototype.callSync = function (factory, callback) {
  const dependencies = getDependenciesNames(factory);
  this.resolve(dependencies, function (err, services) {
    if (err) { return callback(err); }
    callback(null, factory.apply(null, services));
  });
};

Container.prototype.call = function (factory, callback) {
  const dependencies = getDependenciesNames(factory, true);
  this.resolve(dependencies, function (err, services) {
    if (err) { return callback(err); }
    return factory.apply(null, services.concat([callback]));
  });
};

Container.prototype.resolve = function (name, callback) {
  const r = this._registry.get(name);

  if (Array.isArray(name)) {
    const names = name;
    return async.map(names,
                    this.resolve.bind(this),
                    callback);
  }

  if (!r) {
    const interfaceImplementations = this._interfaces.get(name);

    if (interfaceImplementations && interfaceImplementations.length > 0) {
      return async.map(interfaceImplementations,
                       this.resolve.bind(this),
                       callback);
    }

    return setImmediate(callback, new Error(`unknown service or interface ${name}`));
  }

  if (r.config.singleton) {
    let instance = this._instances.get(name);

    if (instance) {
      return callback(null, instance);
    }
  }

  r.factory((err, instance) => {
    if (err) {
      return callback(err);
    }
    if (r.config.singleton) {
      this._instances.set(name, instance);
    }
    callback(null, instance);
  });
};

module.exports = { Container };
