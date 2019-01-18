import { deserted, Converters } from '..'

const expectCloneEqual = (value: any, des = deserted) => {
  const clone = des.clone(value)

  expect(clone).toEqual(value)

  if (value !== null && typeof value === 'object') {
    expect(clone).not.toBe(value)
  }
}

describe('serialize/deserialize', () => {
  test('correctly transforms null', () => {
    expectCloneEqual(null)
  })

  test('correctly transforms undefined', () => {
    expectCloneEqual(undefined)
  })

  test('correctly transforms NaN', () => {
    expectCloneEqual(NaN)
  })

  test('correctly transforms ints', () => {
    expectCloneEqual(0)
    expectCloneEqual(1)
    expectCloneEqual(-1)
  })

  test('correctly transforms floats', () => {
    expectCloneEqual(0.0)
    expectCloneEqual(1.1)
    expectCloneEqual(-1.3132352334243)
    expectCloneEqual(2.0 / 3.0)
  })

  test('correctly transforms Numbers', () => {
    expectCloneEqual(new Number(0))
    expectCloneEqual(new Number(0.0))
    expectCloneEqual(new Number(1.1))
    expectCloneEqual(new Number(-1.3132352334243))
    expectCloneEqual(new Number(2.0 / 3.0))
  })

  test('correctly transforms strings', () => {
    expectCloneEqual('')
    expectCloneEqual('1')
    expectCloneEqual('abc')
    expectCloneEqual(new String(''))
    expectCloneEqual(new String('1'))
    expectCloneEqual(new String('abc'))
  })

  test('correctly transforms booleans', () => {
    expectCloneEqual(true)
    expectCloneEqual(false)
    expectCloneEqual(new Boolean(true))
    expectCloneEqual(new Boolean(false))
  })

  test('correctly transforms Dates', () => {
    expectCloneEqual(new Date())
    expectCloneEqual(Date.UTC(1996, 6, 4))
    expectCloneEqual(Date.UTC(1996, 6, 4, 3, 2, 1, 6))
  })

  test('correctly transforms Symbols', () => {
    expect(typeof deserted.clone(Symbol())).toEqual('symbol')
    expect(typeof deserted.clone(Symbol('test'))).toEqual('symbol')
    expectCloneEqual(Symbol.for(''))
    expectCloneEqual(Symbol.for('test2'))
  })

  test('correctly transforms Arrays', () => {
    expectCloneEqual([])
    expectCloneEqual([null])
    expectCloneEqual([undefined])
    expectCloneEqual([0])
    expectCloneEqual([false])
    expectCloneEqual([false, null, undefined, 0, ''])
    expectCloneEqual([1, 'a', 3.14, true])
  })

  test('correctly transforms nested Arrays', () => {
    expectCloneEqual([[]])
    expectCloneEqual([[], [], [[['a']]]])
    expectCloneEqual([undefined, [undefined], [[null], []]])
  })

  test('correctly transforms Sets', () => {
    expectCloneEqual(new Set())
    expectCloneEqual(new Set([undefined, false, '', 0]))
    expectCloneEqual(new Set([1, 'abc', 2.2]))
  })

  test('correctly transforms Maps', () => {
    expectCloneEqual(new Map())
    expectCloneEqual(
      new Map<any, any>([[0, undefined], [false, 1.23], ['', []], [0, null]])
    )
    expectCloneEqual(
      new Map<any, any>([[1, 1], ['abc', 'abc'], [2.2, new Date()]])
    )
  })

  test('correctly transforms objects', () => {
    expectCloneEqual({})
    expectCloneEqual({ num: 1 })
    expectCloneEqual({
      num1: 0,
      num2: 1,
      str1: '',
      str2: 'str',
      nl: null,
      b1: true,
      b2: false,
      arr1: [],
      arr2: [undefined, 'arr', [], false]
    })
  })

  test('correctly transforms nested objects', () => {
    expectCloneEqual({
      a: {},
      b: { value: 1 },
      c: { d: { e: { f: { t: undefined, g: { h: false } } } } }
    })
  })

  test('correctly transforms shared objects in objects', () => {
    const shared = { nested: { value: 1 } }
    const obj = { a1: shared, a2: shared }
    const result = deserted.clone(obj)

    expect(result.a1).toBe(result.a2)
  })

  test('correctly transforms shared objects in arrays', () => {
    const shared = { nested: { value: 1 } }
    const arr = [shared, shared]
    const result = deserted.clone(arr)

    expect(result[0]).toBe(result[1])
  })

  test('throws if unknown class part of input', () => {
    class Test {}
    const value = new Test()

    expect(() => deserted.clone(value)).toThrow()
  })

  test('correctly processes registered class', () => {
    class Test {}
    const value = new Test()

    const des = deserted.withConverters(Converters.allProps(Test))

    expectCloneEqual(value, des)
  })

  test('correctly processes complex registered class', () => {
    class Parent {
      value = 1

      increase() {
        this.value++
      }

      decrease = () => this.value--
    }
    class Child extends Parent {
      state = {
        values: [1, 2, 3]
      }

      action() {
        return
      }

      changeState = () => {
        this.state = { values: [5] }
      }
    }

    const value = new Child()
    value.increase()
    value.changeState()

    const des = deserted.withConverters(Converters.allProps(Child))

    const result = des.clone(value)
    expect(result).toBeInstanceOf(Child)
    expect(result.value).toEqual(value.value)
    expect(result.state).toEqual(value.state)
  })

  test('complex shared', () => {
    const v1 = new Map([[1, 2]])
    const obj1 = [v1, v1]

    expectCloneEqual(obj1)
  })

  test('complex shared2', () => {
    const v1: [number, any] = [1, { value: 1 }]
    const obj1 = [new Map([v1]), new Map([v1])]

    expectCloneEqual(obj1)

    const result = deserted.clone(obj1)
    expect(result[0].get(1)).toBe(result[1].get(1))
  })

  test('complex shared3', () => {
    const shared = { value: 1 }
    const v1: [number, any] = [1, shared]
    const obj1 = [new Map([v1]), shared]

    expectCloneEqual(obj1)

    const result = deserted.clone(obj1)
    expect(result[0].get(1)).toBe(result[1])
  })

  test('correctly handles Error', () => {
    const error = new Error()

    expectCloneEqual(error)

    const error2 = new Error('Test')
    error2.name = 'MyName'

    expectCloneEqual(error2)
  })
})
