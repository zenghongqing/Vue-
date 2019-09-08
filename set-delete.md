## $set和$delete的原理
因为Vue2.6.*以前侦测数据变化都是通过Object.defineProperty实现，ES6之前都无法提供元编程能力，所以无法侦测对象的增加和删除属性，这个时候需要单独对其进行处理。
### $set处理新增的属性
vm.$set的作用是在Object或者Array上设置一个属性, 在Vue的原型上添加方法Vue.prototype.$set = set, set方法具体实现为:
```
function set (target, key, val) {
    if (isUndef(target) || isPrimitive(target)
    ) {
      warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
    }
    // 对数组，直接添加, 触发前面讲到的splice拦截器
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val
    }
    //  key已经存在于target中，已经被侦测了变化，就可以发送依赖通知
    if (key in target && !(key in Object.prototype)) {
      target[key] = val;
      return val
    }
    // 通过获取ob来判断target是否是响应式的
    var ob = (target).__ob__;
    // 通过_isVue的属性来判断target是否是vue的实例
    if (target._isVue || (ob && ob.vmCount)) {
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
        'at runtime - declare it upfront in the data option.'
      );
      return val
    }
    // 不存在__ob__属性就不做处理
    if (!ob) {
      target[key] = val;
      return val
    }
    //  转化为getter/setter形式，并向target的依赖通知变化
    defineReactive$$1(ob.value, key, val);
    ob.dep.notify();
    return val
  }
```
### $delete方法原理
vm.$delete方法可以删除Object或者Array的某个属性，在Vue原型上挂载Vue.prototype.$delete = del;
```
/**
   * Delete a property and trigger change if necessary.
   */
  function del (target, key) {
    // 如果是数组，则直接删除
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.splice(key, 1);
      return
    }
    // 与set方法一致
    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
        '- just set it to null.'
      );
      return
    }
    // 如果key不是target的属性则直接返回
    if (!hasOwn(target, key)) {
      return
    }
    // 删除属性
    delete target[key];
    // 如果不是响应式数据，则返回
    if (!ob) {
      return
    }
    // 为响应式数据的话，则通知依赖更新
    ob.dep.notify();
  }
```
这部分介绍了侦测数据的API，computed的实现原理在后面的初始化过程再介绍。