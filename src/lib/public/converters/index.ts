/**
 * @module deserted
 */

/**
 * A constructor taking any parameter.
 */
export type AnyConstructor = { new (arg: any): any }

/**
 * A constructor taking no parameters
 */
export type EmptyConstructor = { new (): any }

/**
 * A two-way converter from and to some object
 */
export interface Converter {
  from(state: any): any
  to(obj: any): any
}

export const Converter = {
  /**
   * Returns a new converter based on the provided `from` and `to` functions.
   * @param from the function to convert from some value to a normalized value.
   * @param to the function to convert from some normalized value to a denormalized value.
   */
  create(from: (state: any) => any, to: (obj: any) => any): Converter {
    return { from, to }
  }
}

/**
 * The default converter for functions. It converts the function to a string.
 */
export const DefaultFunctionConverter: Converter = Converter.create(
  (f: Function) => f.name,
  name => `[function ${name}]`
)

/**
 * The default converter for Symbols. It gets the Symbol's descriptor, and when denormalizing tries to get a global Symbol with that descriptor.
 */
export const DefaultSymbolConverter: Converter = Converter.create(
  (s: symbol) => {
    const key = Symbol.keyFor(s)
    if (key !== undefined) return key
    return String(s).slice(7, -1)
  },
  (key: string) => Symbol.for(key)
)

/**
 * An object containing class names as keys, and the corresponding converter instances as values.
 */
export type ConverterConfig = { [key: string]: Converter }

export class Converters {
  /**
   * Returns a Converter instance that assumes a `valueOf` method returning the state, and a single argument constructor taking the state to get back the original instance.
   * @param constructor the class constructor
   */
  static valueOf(constructor: AnyConstructor): ConverterConfig {
    return {
      [constructor.name]: Converter.create(
        obj => obj.valueOf(),
        value => new constructor(value)
      )
    }
  }

  /**
   * Returns a Converter instance that assumes the class is Iterable, and has a constructor that takes the array resulting from the Iterable to get back the original instance.\
   * @param constructor the class constructor
   */
  static fromIterable(constructor: {
    new (elems: any[]): any
  }): ConverterConfig {
    return {
      [constructor.name]: Converter.create(
        obj => [...obj[Symbol.iterator]()],
        elems => new constructor(elems)
      )
    }
  }

  /**
   * Returns a Converter that copies the object's properties to a 'normal' object to be normalized, and assumes a no-arg constructor after which the properties can be copied back.
   * @param constructor the class constructor
   */
  static allProps(constructor: EmptyConstructor): ConverterConfig {
    return {
      [constructor.name]: Converter.create(
        obj => ({ ...obj }),
        state => Object.assign(new constructor(), state)
      )
    }
  }

  /**
   * Returns a Converter similar to `allProps` but with the option to specify which properties to copy.
   * @param constructor the class constructor
   * @param props the list of property names to copy
   */
  static pick(
    constructor: EmptyConstructor,
    ...props: string[]
  ): ConverterConfig {
    return {
      [constructor.name]: Converter.create(
        obj => {
          const result: { [key: string]: any } = {}
          for (const prop of props) result[prop] = obj[prop]
          return result
        },
        obj => Object.assign(new constructor(), obj)
      )
    }
  }

  /**
   * Returns a Converter that treats all the given `constructors` with the `toConverter` function supplied first.
   * @param toConverter function taking a constructor and returning a ConverterConfig
   * @param constructors a list of class constructors to supply to `toConverter`
   */
  static all(
    toConverter: (constructor: AnyConstructor) => ConverterConfig,
    ...constructors: AnyConstructor[]
  ): ConverterConfig {
    const result: ConverterConfig = {}

    for (const item of constructors) {
      Object.assign(result, toConverter(item))
    }

    return result
  }

  /**
   * The default Converter configuration for standard objects
   */
  static readonly default: ConverterConfig = {
    ...Converters.all(Converters.valueOf, Date, Boolean, String, Number),
    ...Converters.all(Converters.fromIterable, Map, Set),
    ...Converters.pick(Error, 'name', 'message')
  }
}
