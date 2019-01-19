/**
 * @module deserted
 */

import { Path, SerItem, Action, Arr } from '../../private/util'
import {
  Converters,
  ConverterConfig,
  DefaultFunctionConverter,
  Converter,
  DefaultSymbolConverter
} from '../converters'

/**
 * Options for the Deserted instance
 * @param noRefs if true, any encountered circular references will throw an error
 * @param functionConverter a custom converter for functions, defaults to a string value
 * @param symbolConverter a custom converter for symbols, defaults to resolving global Symbols
 * @param stringifier a custom stringifier, defaults to JSON.stringify/parse
 */
export type Options = {
  noRefs: boolean
  functionConverter: Converter
  symbolConverter: Converter
  stringifier: {
    convertToString: (value: any) => string
    convertFromString: (value: string) => any
  }
}

const defaultOptions: Options = {
  noRefs: false,
  functionConverter: DefaultFunctionConverter,
  symbolConverter: DefaultSymbolConverter,
  stringifier: {
    convertToString: value => JSON.stringify(value),
    convertFromString: value => JSON.parse(value)
  }
}

/**
 * Class performing the (de)normalization and (de)serialization
 */
export class Deserted {
  /**
   * Returns a new Deserted instance with no pre-configured converters.
   * @param options the options to supply to the Deserted instance
   */
  static empty(options?: Options): Deserted {
    return new Deserted({}, options)
  }

  /**
   * Returns a new Deserted instance with the default pre-configured converters.
   * @param options the options to supply to the Deserted instance
   */
  static default(options?: Options): Deserted {
    return new Deserted(Converters.default, options)
  }

  private constructor(
    private readonly converters: ConverterConfig = {},
    private readonly options: Options = defaultOptions
  ) {}

  /**
   * Returns a new Deserted instance with the given `converters` added to the current converters.
   * @param converters a list of ConverterConfigs to add
   */
  withConverters(...converters: ConverterConfig[]): Deserted {
    const newConverters = { ...this.converters }

    for (const converter of converters) {
      Object.assign(newConverters, converter)
    }

    return new Deserted(newConverters, this.options)
  }

  /**
   * Returns a new Deserted instance with the given `options` in addition to or overwiting the current options.
   * @param options the new options
   */
  withOptions(options: Options): Deserted {
    return new Deserted(this.converters, { ...this.options, ...options })
  }

  /**
   * Returns an object representing a 'normalized' version of the input value, meaning that objects are dereferenced and
   * states are flattened to a JSON-compatible structure.
   * @param input the input to serialize
   */
  normalize(input: any): SerItem {
    const dict = new Map<any, Path>()
    const { converters, options } = this

    function ser(item: any, path: string[]): SerItem {
      // We don't want to serialize functions
      if (typeof item === 'function') {
        return { fun: ser(options.functionConverter.from(item), path) }
      }

      // Primitive values can be serialized directly
      if (
        item === null ||
        item === undefined ||
        (typeof item !== 'symbol' && typeof item !== 'object')
      ) {
        return { val: item }
      }

      if (typeof item === 'symbol') {
        return { sym: options.symbolConverter.from(item) }
      }

      // If the object has been processed before, create a reference
      const ref = dict.get(item)
      if (ref !== undefined) {
        if (options.noRefs) {
          throw Error('Deserted: reference found while noRefs=true')
        }
        return { ref }
      }

      // If not, add the object for possible future reference
      dict.set(item, path)

      // If the object is an Array, serialize all its elements
      if (Array.isArray(item)) {
        return item.map((elem, index) => ser(elem, [...path, String(index)]))
      }

      if (item.constructor === undefined) throw Error('no constructor')

      const { name } = item.constructor

      // If the object is a common Object, serialize its properties
      if (name === 'Object') {
        const obj: { [key: string]: SerItem } = {}

        for (const key in item) {
          if (Object.hasOwnProperty.call(item, key)) {
            obj[key] = ser(item[key], [...path, key])
          }
        }

        return { obj }
      }

      // Get the registered converter for the prototype based class
      const converter = converters[name]

      if (!converter) throw Error('unregistered class')

      // Serialize the prototype name, and the converted state
      return {
        proto: name,
        state: ser(converter.from(item), path)
      }
    }

    return ser(input, [])
  }

  /**
   * Returns the value resulting from denormalizing the normalized input, meaning that objects and classes are re-instantited, and the
   * states are put back, and also references are re-instated.
   * @param input a normalized object
   */
  denormalize(input: SerItem): any {
    const actions: Action[] = []
    const { converters, options } = this

    function des(item: SerItem, path: Path): any {
      // Primitive values can be returned directly
      if ('val' in item) return item.val

      // Convert functions as defined in options
      if ('fun' in item) {
        return options.functionConverter.to(des(item.fun, path))
      }

      if ('sym' in item) {
        return options.symbolConverter.to(item.sym)
      }

      // If it is a reference, create an action to resolve it later
      if ('ref' in item) {
        actions.push({ target: path, source: item.ref })
        return null
      }

      // For common Objects, deserialize each property
      if ('obj' in item) {
        const { obj } = item
        const result: { [key: string]: any } = {}
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = des(obj[key], [...path, key])
          }
        }
        return result
      }

      // For Arrays, deserialize each item
      if (Array.isArray(item)) {
        return item.map((elem, index) => des(elem, [...path, String(index)]))
      }

      // For class-based Objects, create an action to convert the state to an object later, and set the deserialized state
      if ('proto' in item) {
        const { proto, state } = item
        actions.push({ convertTo: proto, path })
        return des(state, path)
      }

      // Input didn't match one of the cases above..
      throw Error('unknown item')
    }

    // Perform the initial deserialization pass
    const result = des(input, [])

    // Sort the actions by model depth
    actions.sort(Action.compare)

    for (const action of actions) {
      if ('source' in action) {
        // A reference needs to be made from source to target
        const { source, target } = action
        Path.copyProperty(result, source, target)
      } else if ('convertTo' in action) {
        // The state at the specified path needs to be converted to the prototype object who's name is in convertTo
        const { convertTo, path } = action
        const converter = converters[convertTo]

        if (converter === undefined) throw Error('no converter')

        // If we are at the root, we can directly return the result
        if (path.length <= 0) return converter.to(result)

        // We're not at the root, so we need to update the parent property
        const parent = Path.find(result, Arr.init(path))
        const propName = Arr.last(path)
        parent[propName] = converter.to(parent[propName])
      }
    }

    return result
  }

  /**
   * Returns a deep clone including any references (if options permit) of the given `input` value.
   * @param input the input to clone
   */
  clone(input: any): any {
    return this.denormalize(this.normalize(input))
  }

  /**
   * Returns a serialized string of the normalized version of the given `input` value.
   * @param input the input to serialize
   */
  serialize(input: any): string {
    return this.options.stringifier.convertToString(this.normalize(input))
  }

  /**
   * Returns the value resulting from parsing the given `input` string to a normalized object, and then denormalizing that object.
   * @param input input
   */
  deserialize(input: string): any {
    return this.denormalize(this.options.stringifier.convertFromString(input))
  }
}

/**
 * A default Deserted instance pre-configured with standard converters and options.
 */
export const deserted: Deserted = Deserted.default()
