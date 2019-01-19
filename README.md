# deserted

A simple and lonely serialization library for JS

## Installation

`yarn add deserted`

## API Documentation

Generated by Typedoc:
https://vitoke.github.io/deserted/globals.html

## Usage

### Simple

```typescript
import { deserted } from 'deserted'

const myObject = {
  value: 523,
  nested: {
    text: 'foo',
    bar: false
  },
  date: new Date(1990, 1, 1)
}

const asString = deserted.serialize(myObject)

const backToObject = deserted.deserialize(asString)

const quickCloneObject = deserted.clone(myObject)
```

### Advanced

```typescript
import { deserted, Converters } from 'deserted'

class Test {
  constructor() {
    this.foo = 1
    this.bar = true
  }
}
const test = new Test()
test.bar = false

const testSerializer = deserted.withConverters(Converters.allProps(Test))

const shared = { value: 123, { nested: test: 'foo' } }

const someObject = [shared, { value: shared }, new Map([1, shared])]

const asString = testSerializer.serialize(someObject)

const backToObject = testSerializer.deserialize(asString)

const quickCloneObject = testSerializer.clone(someObject)
```

## Motivation

Serialization is important in any system dealing with data that should be saved or sent over a wire. It is also useful for deep cloning of objects.
In a quick search for a simple to use but powerful library, I could not find anything that matches these requirements.

The `deserted` library can serialize complex object-graphs with circular references without configuration.

Things that are serializable out of the box:

- primitives: `number`, `string`, `boolean`, `undefined`, `null`, `Symbol`
- boxed primitives: `Number`, `String`, `Boolean`
- objects
- collections: `Array`, `Map`, `Set`
- `Date`
- `Error`

Things that require some configuration:

- serializing custom class instances
- serializing functions/code (limited, not the goal of this library)
- serializing non-global `Symbols`, if they need to be reconnected to existing `Symbols`

Things that are not serializable:

- `Promises`
- any classes that have some hidden state

## In-depth

### (De)Normalization

The `deserted` library uses a two-phase approach to perform serialization. First, JS objects are
'normalized' to a JSON-like format. Basically, it creates a JSON object with object shapes based on primitive
values that match the basic needed cases, like primitives, objects, class instances, references etc.

The `normalize` function on Deserted instances does exactly this.

For example, calling `deserted.normalize({ test: 1 })` results in `{ obj: { test: { val: 1 } } }`. This indicates that
the serialized item is an object, is has a property called `test`, and the value of this property is the primitive value 1.

The resulting object can easily be fed to `JSON.stringify`. While this is also true for the source object, `JSON.stringify` easily breaks down when circular references are encountered.

Deserted also has the `denormalize` function that does exactly the inverse. Calling it on the result of the above example would
return an object that is exactly the same as the provided object. But it is not the same in terms of references. Thus, it is
a clone.

### Cloning

Often it is necessary to copy or clone some input value, especially when dealing with functional frameworks. Redux is a common
example for this, where state should be immutable, and thus the original object should not be modified. While except for small
states, it is probably not a good idea to use this library for cloning, if cloning needs to be done occasionally, this library
is a good fit.

I've seen examples of people using `JSON.parse( JSON.stringify( someObject ) )` to do cloning. While that works, it has terrible
performance, and does not handle circular references and also has no means to deal with custom classes.

Especially for this use case, Deserted provides the `.clone` method. All this does is perform `denormalize( normalize ( someObject ) )`, having the same effect but much faster. This is because there is no conversion to a String, and thus
no parsing needed.

### Configuration

#### Options

Deserted supports the following options, which can be supplied to `Deserted.empty(options)` `Deserted.default(options)` and
`.withOptions(options)` on an existing instance:

- `noRefs`: if true, the serializer will throw an exception if a circular reference is encountered.
- `functionConverter`: a custom converter to serialize functions. By default they are replaced by a string.
- `symbolConverter`: a custom converter to serialize Symbols. Useful if non-global symbols are used, and they need to be linked back.
- `stringifier`: a custom converter that converts objects to strings and back. By default this is JSON.stringify/parse.

#### Custom converters

Deserted can also serialize custom class instances. However, you will need to configure how you want them to be serialized. The
`Converters` object provides a number of common converters, but it's also possible to create your own.

Imagine we have the following class that we want to serialize:

```typescript
class CounterState {
  constructor(initialCount = 0) {
    this.state = {
      count: initialCount,
      modifications: 0
    }
  }

  increase() {
    this.state.count++
    this.state.modifications++
  }

  decrease() {
    this.state.count--
    this.state.modifications++
  }
}
```

The class would only require its properties (the state property) to be serialized. Deserted can be configured
to do that as follows:

```typescript
import { deserted, Converters } from 'deserted'

const serializer = deserted.withConverters(Converters.allProps(CounterState))

const counter = new CounterState(10)
counter.increase()

const counterAsString = serializer.serialize(counter)
```

If you have a lot of custom classes that need the same type of converter, you can specify that as follows:

```typescript
const serializer = deserted.withConverters(
  Converters.pick(SomeClass, 'prop1', 'prop2'),
  Converters.all(Converters.allProps, Class1, Class2, Class3)
)
```

## Conclusion

The Deserted library is simple yet powerful, and allows to serialize complex object graphs with circular references
with little effort. And it also makes deep cloning of objects a breeze.

## Author

Arvid Nicolaas

# Have fun!
