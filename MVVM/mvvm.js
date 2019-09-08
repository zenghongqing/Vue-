const data = {
    a: 1,
    b: {
        c: 2
    }
}

function remove (arr, item) {
    if (arr.length > 0) {
        const index = arr.indexOf(item)
        return arr.splice(index, 1)
    }
}
function parsePath (path) {
    const bailRE = /^\w.$/
    if (bailRE.test(path)) return
    const segment = path.split('.')
    return function (obj) {
        for (let i = 0; i < segment.length; i++) {
            if (!obj) return
            obj = obj[segment[i]]
        }
        return obj
    }
}

class Dep {
    constructor () {
        this.deps = []
    }
    addSub (sub) {
        this.deps.push(sub)
    }
    depend () {
        this.addSub(Dep.target)
    }
    notify () {
        let deps = this.deps.slice()
        for (let i = 0; i < deps.length; i++) {
            deps[i].update()
        }
    }
}

class Watcher {
    constructor (vm, expOrFn, cb) {
        this.vm = vm
        this.getter = parsePath(expOrFn)
        this.cb = cb
        this.value = this.get()
    }
    get () {
        Dep.target = this
        let value =  this.getter.call(this.vm, this.vm)
        Dep.target = null
        return value
    }
    update () {
        const oldValue = this.value
        this.value = this.get()
        this.cb.call(this.vm, oldValue, this.value)
    }
}

function defineReactive (data, key, value) {
    if (typeof value === 'object') {
        new Observer(value)
    }
    let dep = new Dep()
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get: function () {
            dep.depend()
            return value
        },
        set: function (newVal) {
            if (value === newVal) {
                return
            }
            value = newVal
            dep.notify()
        }
    })
}

class Observer {
    constructor (value) {
        this.value = value
        if (!Array.isArray(value)) {
            this.walk(value)
        }
    }
    walk (obj) {
        const keys = Object.keys(obj)
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
        }
    }
}
new Observer(data)
new Watcher(data, 'a', function (val, val1) {
    console.log(val, val1, '111')
})

data.a = 5