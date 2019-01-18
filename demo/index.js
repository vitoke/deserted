const { deserted, Converters } = require('..')

const Gender = {
  MALE: Symbol.for('MALE'),
  FEMALE: Symbol.for('FEMALE')
}

class Person {
  constructor(name, birthDate) {
    this.name = name
    this.birthDate = birthDate
    this.hasCat = false
    this.addressInfo = {}
    this.gender = null
  }

  setHasCat(value) {
    this.hasCat = value
  }
}

class Employee extends Person {
  constructor(name, birthDate) {
    super(name, birthDate)
    this.manager = null
  }
}

class Manager extends Person {
  constructor(name, birthDate) {
    super(name, birthDate)
    this.employees = []
    this.manager = null
  }
}

class Company {
  constructor() {
    this.employees = []
    this.employeesByName = new Map()
    this.profit = 5000000
  }

  addEmployees(...employees) {
    for (const employee of employees) {
      this.employees.push(employee)
      this.employeesByName.set(employee.name, employee)
    }
  }
}

function addRelation(employee, manager) {
  employee.manager = manager
  manager.employees.push(employee)
}

const profitCompany = new Company()
const john = new Employee('john', new Date(1980, 4, 16))
john.gender = Gender.MALE
const anna = new Employee('anna', new Date(1983, 9, 2))
const mike = new Manager('mike', new Date(1968, 4, 23))
const tina = new Manager('tina', new Date(1985, 12, 6))
tina.gender = Gender.FEMALE

profitCompany.profit = 1000000
profitCompany.addEmployees(john, anna, mike, tina)
addRelation(john, tina)
addRelation(anna, mike)
addRelation(mike, tina)
tina.setHasCat(true)

const companySerializer = deserted.withConverters(
  Converters.all(Converters.allProps, Employee, Manager, Company)
)
console.log('\nInitial object, stringified by JSON.stringify')
console.log(profitCompany)

console.log('\nNormalized object, stringified by JSON.stringify')
console.log(companySerializer.normalize(profitCompany))

console.log('\nSerialized object')
console.log(companySerializer.serialize(profitCompany))

const cloned = companySerializer.clone(profitCompany)
console.log('\nCloned object')
console.log(cloned)

// It is really a clone, thus modifying the clone does not modify the original
cloned.employees[0].name = 'jimmy'
console.log(profitCompany.employees[0].name, cloned.employees[0].name)
