uqbar is a simple IoC (Inversion of Control) container for javascript.

This module is inspired a lot in the simplicity of the [Funq Container](https://funq.codeplex.com/) for the .Net Framework from [Daniel Cazzulino](https://twitter.com/kzu).

## Installation

```
npm i uqbar
```

## What you need to know

Create an instance of `Container` as follows:

```javascript
const Container = require('uqbar').Container;
const container = new Container();
```

A container has 2 important APIs `register` and `resolve`.

**Register** is the API to wire the services in the container. A simple registration looks like this:

```javascript
container.register('myservice', (callback) => {
  callback(null, { the_serivce: '123'});
})
```

It receives a `name` and a `factory` function with a callback. `register` is always async but there are three sync shorthands:

-  `registerSync(name, syncfactory, [options])`
-  `registerCtor(name, ctor, [options])`
-  `registerInstance(name, ctor, [options])`


**Resolve** creates an instance of a service and it is always async:

```javascript
container.resolve('myservice', (err, myservice) => {
  console.log(myservice);
})
```

Everything in uqbar builds on top of these two methods.

## Singleton vs transient

`register` assumes by default that the service is singleton:

```javascript
var i = 0;
container.registerSync('service', () => ++i);
container.resolve('service', (err, service) => {
  assert.equal(service, 1);
  container.resolve('service', (err, service) => {
    assert.equal(service, 1); ///is still 1.. because the factory is called once.
  });
});
```

If you want to register a "transient" service:

```javascript
var i = 0;
container.registerSync('service', () => ++i, { singleton: false });
container.resolve('service', (err, service) => {
  assert.equal(service, 1);
  container.resolve('service', (err, service) => {
    assert.equal(service, 2); ///yeah now is 2
  });
});
```

## Brewing machine example

How boring will be a container if it couldn't handle dependencies!

Given a set of classes like this:

```javascript
function Heater() {}

function Pump() {}

function CoffeeMaker(heater, pump) {
  this.heater = heater;
  this.pump = pump;
}

CoffeeMaker.prototype.brew = function () {
  //this.pump.pump();
  //this.heater.on();
}
```

In order to understand the primitives of the API this is the most verbose way of registering these services:

```javascript
container.register('heater', callback => callback(null, new Heater()));
container.register('pump', callback => callback(null, new Pump()));
container.register('coffee_maker', callback => {
  container.resolve(['heater', 'pump'], (err, services) => {
    if (err) { return callback(err); }
    callback(null, new Pump(services[0], services[1]));
  })
});
```

The container supports auto resolution of dependencies, so the above can be written as follows:

```javascript
container.registerSync('heater', () => new Heater());
container.registerSync('pump', () => new Pump());
container.registerSync('coffee_maker', (heater, pump) => new CoffeeMaker(heater, pump));
```

And the less verbose way looks like this:

```javascript
container.registerCtor('heater', Heater);
container.registerCtor('pump', Pump);
container.registerCtor('coffee_maker', CoffeeMaker);
```

## Database example

Let's say we have a module called `database.js` like this:

```javascript
module.exports = function(mysql, settings, callback) {
  var connection = mysql.createConnection({
    host: settings.HOST,
    port: settings.PORT
  });

  connection.connect((err) => callback(err, connection));
}
```

and a `todo.js` like this:

```javascript
function Todos (db) {
  this.db = db;
};

Todos.prototype.find = function () {
  db.query('SELECT * from todos', callback);
};

module.exports = Todos;
```


We wire the application like this:

```javascript
//register the "settings" service
container.registerInstance('settings', process.env);

//register all node_modules (including mysql)
fs.readdirSync('./node_modules')
  .filter(d => d !== '.bin')
  .forEach(m => {
    container.registerSync(m, () => require(m));
  })

//register "db"
container.register('db', require('./lib/database'));

//register "todos"
container.register('todos', require('./lib/todos'));
```

## Interfaces examples

A common pattern is to inject several instances implementing a common interface.

The most common example of this is a `logger` receiving an array of `streams`:

```javascript
function logger (bunyan, loggerStream) {
  return bunyna.create({ streams: loggerStream });
}
```

Register the streams as follows:

```javascript
container.registerSync('file_stream',
                        settings => fs.createWriteStream(settings.LOG_FILE),
                        { interfaces: ['loggerStream']});

container.registerSync('stdout_stream',
                       () => process.stdout,
                       { interfaces: ['loggerStream']});

container.registerSync('logger', logger);
```

Note: Resolving an interface name always returns an Array.

## Dependency binding

The register API can figure out the dependencies of a service. Currently it supports two methods.

The default method is to use the names of the parameters of the function. For instance if we register a function like this:

```javascript
function logger(bunyan, loggerStream) {}
```

The container assumes that the `logger` service depends on the `bunyan` service and the `loggerStream` service.

Another way is to expose a `@require` property in the function like this:

```javascript
function logger(bunyan, streams) {
  //...
}

logger['@require'] = ['bunyan', 'loggerStream'];
```

In this case `logger` depends on `bunyan` and `loggerStream` regardless that the parameter name of the function is `streams`.


## License

MIT - Copyright (c) 2016 JOSE FERNANDO ROMANIELLO.

See the LICENSE file.





