### watch的内部原理
Vue在初始化阶段会把watch的对象挂载到Vue实例上，并通过initWatch函数初始化
```
initWatch(vm, opts.watch);
```
通过vm.$options.watch访问watch的对象内容，具体为
```
function initWatch (vm, watch) {
    for (var key in watch) {
      var handler = watch[key];
      if (Array.isArray(handler)) {
        for (var i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i]);
        }
      } else {
        createWatcher(vm, key, handler);
      }
    }
  }
```
对watch里检测的每一个属性创建一个Watcher
```
function createWatcher (
    vm,
    expOrFn,
    handler,
    options
  ) {
    // 为对象时，处理函数是handler，可以增加可选参数deep，immediate
    if (isPlainObject(handler)) {
      options = handler;
      handler = handler.handler;
    }
    if (typeof handler === 'string') {
      handler = vm[handler];
    }
    return vm.$watch(expOrFn, handler, options)
  }
```
获取检测对象的处理函数handler，并返回一个vm原型中的$watch处理返回值
```
Vue.prototype.$watch = function (
      expOrFn,
      cb,
      options
    ) {
      var vm = this;
      // cb如果是对象的话递归创建Watcher
      if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options)
      }
      options = options || {};
      options.user = true;
      var watcher = new Watcher(vm, expOrFn, cb, options);
      if (options.immediate) {
        try {
          cb.call(vm, watcher.value);
        } catch (error) {
          handleError(error, vm, ("callback for immediate watcher \"" + (watcher.expression) + "\""));
        }
      }
      return function unwatchFn () {
        watcher.teardown();
      }
    };
```
上面创建一个Watcher实例，其中expOrFn是函数(在Watcher构造函数中做了判断处理)，当expOrFn是字符串时，Watcher会观察路径属性keypath(如a.b.c)所指向的的数据并观察这个数据的变化；当数据为函数时，它会观察expOrFn所关联的vue实例上的响应式数据，并随之变化。然后判断是否有immediate属性，有的话就立即触发回调函数。最后返回一个unwatchFn函数，作用是取消数据观察
```
Watcher.prototype.teardown = function teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      var i = this.deps.length;
      // 从所有依赖项中将自己移除
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  };
```
实际上在依赖收集的时候，Watcher中会记录有哪些dep即观察的属性，同时Dep类中也会记录收集了哪些依赖(Watcher)，从而可以像数组删除元素那样移除依赖。
```
function remove (arr, item) {
    if (arr.length) {
      var index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1)
      }
    }
}
Dep.prototype.removeSub = function removeSub (sub) {
    remove(this.subs, sub);
};
```
### deep参数的实现
当deep为true时，会把当前值及其子值都触发一边依赖收集，当有任何一个数据变化时，就会通知Watcher
```
Watcher.prototype.get = function get () {
    ...
    // dependencies for deep watching
    if (this.deep) {
        traverse(value);
    }
    popTarget();
    ...
  };
```
必须要在popTarget()前触发子值的收集依赖逻辑，才能保证收集的依赖是当前这个Watcher
```
function traverse (val) {
    _traverse(val, seenObjects);
    seenObjects.clear();
}
function _traverse (val, seen) {
    var i, keys;
    var isA = Array.isArray(val);
    if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
      return
    }
    // 前面已讲过__ob__表示是响应式数据
    if (val.__ob__) {
      var depId = val.__ob__.dep.id;
      // 防止重复添加依赖
      if (seen.has(depId)) {
        return
      }
      seen.add(depId);
    }
    if (isA) {
      i = val.length;
      while (i--) { _traverse(val[i], seen); }
    } else {
      keys = Object.keys(val);
      i = keys.length;
      // 递归获取子值，触发getter，收集依赖，此时Watcher不为空
      while (i--) { _traverse(val[keys[i]], seen); }
    }
}
```
至此整个过程结束。