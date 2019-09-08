const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);

['push','pop','shift','unshift','splice','sort','reverse']
.forEach(method => {
    const original = arrayProto[method]
    Object.defineProperty(arrayMethods, method, {
        value: function mutator (...args) {
            console.log('数组拦截操作')
            return original.call(this, args)
        },
        enumerable: false,
        writable: true,
        configurable: true
    })
})
let arr = []
arr.__proto__ = arrayMethods
arr.push(1)