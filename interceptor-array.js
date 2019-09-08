const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto);
[
    'push',
    'pop',
    'shift',
    'unshift',
    'slice',
    'sort',
    'reverse'
].forEach(function (method){
    const origin = arrayProto[method]
    Object.defineProperty(arrayMethods, method, {
        value: function mutator (...args) {
            console.log(1111, args)
            return origin.apply(this, args)
        },
        enumerable: true,
        writable: true,
        configurable: true
    })
})
function remove (arr, item) {
    if (arr.length > 0) {
        const index = arr.indexOf(item)
        return arr.splice(index, 1)
    }
}
class Dep {
    constructor () {
        this.subs = []
    }
    addSub (sub) {
        this.subs.push(sub)
    }
    depend () {
        this.addSub(Dep.target)
    }
    removeSub (sub) {
        remove(this.subs, sub)
    }
    notify () {
        const subs = this.subs.slice()
        for (let i = 0; i < subs.length; i++) {
            subs[i].update()
        }
    }
}
function observe (value) {
    
}
function defineReactive (data, key, val) {
    if (typeof data === 'object') {
        new Observer(val)
    }
    let dep = new Dep()
    let childObj = observe(val)
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get: function () {
            dep.depend()
            return val
        },
        set: function (newVal) {
            if (val === newVal) return
            dep.notify()
            val = newVal
        }
    })
}
function def (obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
}
class Observer {
    constructor (value) {
        this.value = value
        this.dep = new Dep()
        def(this.value, '__ob__', this)
        if (Array.isArray(value)) {
            this.value.__proto__ = arrayMethods
        } else {
            this.walk()
        }
    }
    walk (obj) {
        const keys = Object.keys(obj)
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
        }
    }
}

new Observer([1, 2])