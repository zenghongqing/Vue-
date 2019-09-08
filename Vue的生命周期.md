### 初始化阶段
此阶段主要是初始化Vue实例的属性computed、provide、inject和watch、事件methods以及响应式数据data等
Vue的构造函数为:
```
function Vue (options) {
    if (!(this instanceof Vue)
    ) {
      warn('Vue is a constructor and should be called with the `new` keyword');
    }
    this._init(options);
}
```
### 初始化实例属性
_init初始化代码为:
```
Vue.prototype._init = function (options) {
    vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
    );
}
```
resolveConstructorOptions(vm.constructor)函数的作用是获取当前当前实例中构造函数的options选项及其所有父级的构造函数的options，然后在_init中由initLifecycle函数初始化实例属性:
```
function initLifecycle (vm) {
    var options = vm.$options;

    // locate first non-abstract parent
    // 找到第一个非抽象父类
    var parent = options.parent;
    if (parent && !options.abstract) {
      while (parent.$options.abstract && parent.$parent) {
        parent = parent.$parent;
      }
      parent.$children.push(vm);
    }

    vm.$parent = parent;
    vm.$root = parent ? parent.$root : vm;

    vm.$children = [];
    vm.$refs = {};

    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false;
    vm._isDestroyed = false;
    vm._isBeingDestroyed = false;
}
```
### 初始化事件
在Vue实例上初始化一些属性并设置默认值。
接着初始化事件，被初始化的事件就是父组件在模板中使用v-on监听子组件中触发的事件:
```
function initEvents (vm) {
    vm._events = Object.create(null);
    vm._hasHookEvent = false;
    // init parent attached events
    // 父组件初始化时监听的事件
    var listeners = vm.$options._parentListeners;
    if (listeners) {
      updateComponentListeners(vm, listeners);
    }
  }
```
_parentListeners是父组件传递到子组件，其格式如下:
```
{
    increment: function () {}
}
```
然后将父组件向子组件注册的事件注册到子组件
```
function updateComponentListeners (
    vm,
    listeners,
    oldListeners
  ) {
    target = vm;
    updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
    target = undefined;
}
```
updateComponentListeners函数具体为:
```
function updateListeners (
    on,
    oldOn,
    add,
    remove$$1,
    createOnceHandler,
    vm
  ) {
    var name, def$$1, cur, old, event;
    for (name in on) {
      def$$1 = cur = on[name];
      old = oldOn[name];
      // 判断是否使用修饰符
      event = normalizeEvent(name);
      if (isUndef(cur)) {
        warn(
          "Invalid handler for event \"" + (event.name) + "\": got " + String(cur),
          vm
        );
      } else if (isUndef(old)) {
          // 哪些事件在中oldOn不存在，则调用add注册
        if (isUndef(cur.fns)) {
          cur = on[name] = createFnInvoker(cur, vm);
        }
        if (isTrue(event.once)) {
          cur = on[name] = createOnceHandler(event.name, cur, event.capture);
        }
        add(event.name, cur, event.capture, event.passive, event.params);
      } else if (cur !== old) {
          // 如果on和oldOn不一致，则将事件回调替换成on中的回调，并把on中的回调引用指向oldOn中对应的事件
        old.fns = cur;
        on[name] = old;
      }
    }
    // 删除在on中不存在的事件
    for (name in oldOn) {
      if (isUndef(on[name])) {
        event = normalizeEvent(name);
        remove$$1(event.name, oldOn[name], event.capture);
      }
    }
}
```
add函数为
```
function add (event, fn, once) {
    if (once) {
        target.$once(event, fn)
    } else {
        target.$on(event, fn)
    }
}
```
将事件添加到vm._events = {} 中。
initRender函数主要是初始化一些变量属性和函数
```
vm._vnode = null; // the root of the child tree
vm._staticTrees = null; // v-once cached trees
var options = vm.$options;
var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
var renderContext = parentVnode && parentVnode.context;
vm.$slots = resolveSlots(options._renderChildren, renderContext);
vm.$scopedSlots = emptyObject;
vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };
```
### 初始化reject和provide
因data或者props中能依赖reject，需要将reject初始化在initState前，inject初始化为:
```
function initInjections (vm) {
    var result = resolveInject(vm.$options.inject, vm);
    if (result) {
        // 设置不要将内容转换成响应式
      toggleObserving(false);
      Object.keys(result).forEach(function (key) {
        /* istanbul ignore else */
        {
          defineReactive$$1(vm, key, result[key], function () {
            warn(
              "Avoid mutating an injected value directly since the changes will be " +
              "overwritten whenever the provided component re-renders. " +
              "injection being mutated: \"" + key + "\"",
              vm
            );
          });
        }
      });
      toggleObserving(true);
    }
}
```
resolveInject函数的作用是通过配置的reject从当前组件自底向上，查找可用的内容
```
function resolveInject (inject, vm) {
    if (inject) {
      // inject is :any because flow is not smart enough to figure out cached
      var result = Object.create(null);
      var keys = hasSymbol
        ? Reflect.ownKeys(inject)
        : Object.keys(inject);
        // inject中的key值逐级查找，如果所有没有可用值，则使用默认值
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        // #6574 in case the inject object is observed...
        // 跳过响应式的key
        if (key === '__ob__') { continue }
        var provideKey = inject[key].from;
        var source = vm;
        while (source) {
          if (source._provided && hasOwn(source._provided, provideKey)) {
            result[key] = source._provided[provideKey];
            break
          }
          source = source.$parent;
        }
        if (!source) {
          if ('default' in inject[key]) {
            var provideDefault = inject[key].default;
            result[key] = typeof provideDefault === 'function'
              ? provideDefault.call(vm)
              : provideDefault;
          } else {
            warn(("Injection \"" + key + "\" not found"), vm);
          }
        }
      }
      return result
    }
}
```
然后初始化数据属性initState，这个稍后介绍，接着初始化provide
```
initProvide(vm)

function initProvide (vm) {
    var provide = vm.$options.provide;
    if (provide) {
      vm._provided = typeof provide === 'function'
        ? provide.call(vm)
        : provide;
    }
}
```
其在vm.$options中的形式如下:
```
_provided: {foo: Window}
```
### 初始化数据和方法
刚讲到的在初始化reject后，provide前，初始化了data、copmputed、watch、props以及methods等数据方法，先讲初始化methods:
```
initMethods(vm, opts.methods);
```
其中opts.methods为
```
{
    incremenTotal: ƒ incremenTotal(total)
}
```
首先会判断props属性中是否有跟methods的方法名一样的，有的话则给出警告；再将方法绑定到实例上:
```
vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
```
可以通过vm.x访问methods中的x了。data、watch以及props前面均有讲到，接下来详细说下computed的原理。

### computed原理
computed是一个惰性求值的观察者，具有缓存性，只有当依赖变化后，第一次访问computed属性才会计算新的值，计算属性的返回值是否发生变化是通过dirty属性来确定，当dirty为true时，需要重新计算返回值，为false时不需要重新结算。
初始化computed代码为
```
var computedWatcherOptions = { lazy: true };
function initComputed (vm, computed) {
    // $flow-disable-line

    var watchers = vm._computedWatchers = Object.create(null);
    // computed properties are just getters during SSR
    // 计算属性在SSR环境中，只是一个普通的getter方法
    var isSSR = isServerRendering();
    // 遍历computed属性
    for (var key in computed) {
      var userDef = computed[key];
      var getter = typeof userDef === 'function' ? userDef : userDef.get;
      if (getter == null) {
        warn(
          ("Getter is missing for computed property \"" + key + "\"."),
          vm
        );
      }

      if (!isSSR) {
        // create internal watcher for the computed property.
        // 在非SSR环境下，创建一个watcher观察器，保存到vm._computedWatchers
        watchers[key] = new Watcher(
          vm,
          getter || noop,
          noop,
          computedWatcherOptions
        );
      }

      // component-defined computed properties are already defined on the
      // component prototype. We only need to define computed properties defined
      // at instantiation here.
      if (!(key in vm)) {
        // 如果计算属性不在vm中则在vm上设置一个计算属性
        defineComputed(vm, key, userDef);
      } else {
        if (key in vm.$data) {
          warn(("The computed property \"" + key + "\" is already defined in data."), vm);
        } else if (vm.$options.props && key in vm.$options.props) {
          warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
        }
      }
    }
}
```
如果computed属性名与methods重名时，计算属性会失效。defineComputed函数具体为
```
function defineComputed (
    target,
    key,
    userDef
  ) {
    // shouldCache为true表示非SSR环境下
    var shouldCache = !isServerRendering();
    if (typeof userDef === 'function') {
      // 处理函数
      sharedPropertyDefinition.get = shouldCache
        ? createComputedGetter(key)
        : createGetterInvoker(userDef);
      sharedPropertyDefinition.set = noop;
    } else {
      // 处理get对象
      sharedPropertyDefinition.get = userDef.get
        ? shouldCache && userDef.cache !== false
          ? createComputedGetter(key)
          : createGetterInvoker(userDef.get)
        : noop;
      sharedPropertyDefinition.set = userDef.set || noop;
    }
    if (sharedPropertyDefinition.set === noop) {
      sharedPropertyDefinition.set = function () {
        warn(
          ("Computed property \"" + key + "\" was assigned to but it has no setter."),
          this
        );
      };
    }
    Object.defineProperty(target, key, sharedPropertyDefinition);
}
```
在浏览器端会执行createComputedGetter(key)函数，如下:
```
function computedGetter () {
  var watcher = this._computedWatchers && this._computedWatchers[key];
  if (watcher) {
    if (watcher.dirty) {
      watcher.evaluate();
    }
    if (Dep.target) {
      watcher.depend();
    }
    return watcher.value
  }
}
```
从vm._computedWatchers中取出前面存储的计算属性的watcher实例，如果watcher存在，再判断watcher.dirty，如果为true，说明计算属性发生变化，需要重新计算。随后判断Dep.target，如果存在，调用watcher.depend()，将计算属性的watcher添加到相关联的属性依赖列表中去。当我们修改计算属性中的依赖时，因为组件watcher观察了计算属性中的依赖，故当依赖的属性发生变化时，组件的watcher会得到通知，然后重新渲染。watcher的相关代码为:
```
//  其中options为var computedWatcherOptions = { lazy: true };
var Watcher = function Watcher (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    if (options) {
      this.lazy = !!options.lazy; // true
      this.sync = !!options.sync; // false
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
    ...
    this.value = this.lazy
      ? undefined
      : this.get();
}
Watcher.prototype.evaluate = function evaluate () {
    // 重新计算下值
    this.value = this.get();
    this.dirty = false;
  };
Watcher.prototype.depend = function depend () {
    var i = this.deps.length;
    // 遍历this.deps依赖列表，将computed的watcher添加到相关的列表中
    while (i--) {
      this.deps[i].depend();
    }
};
```
执行dep的depend方法能将组件的watcher添加到依赖列表，当这些状态发生变化时，组件的watcher也会收到通知，并进行重新渲染。

### 模板编译阶段
该阶段主要在created和beforeMount钩子函数之间，这个阶段解析模板，生成渲染函数，只存在完整版中.

### 挂载阶段
在beforeMount和mounted钩子函数之间，将生成的render函数生成VNode，并挂载到页面，在挂载过程中，Watcher会持续追踪状态变化

### 卸载阶段
执行vm.$destroy方法，Vue.js会将自身从父组件中删掉，取消实例上所有的依赖追踪并且移除所有的事件监听器

### 番外篇

#### $nextTick的原理
vm.$nextTick和Vue.nextTick方法是一致的，都是被抽象成了nextTick方法:
```
Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
};
```
nextTick函数的具体实现方式如下:
```
function nextTick (cb, ctx) {
    var _resolve;
    callbacks.push(function () {
      if (cb) {
        try {
          cb.call(ctx);
        } catch (e) {
          handleError(e, ctx, 'nextTick');
        }
      } else if (_resolve) {
        _resolve(ctx);
      }
    });
    if (!pending) {
      pending = true;
      timerFunc();
    }
    // $flow-disable-line
    // 用于没有回调函数返回Promise，支持nextTick().then形式
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise(function (resolve) {
        _resolve = resolve;
      })
    }
}
```
callbacks数组用来存储用户注册的回调，pending表示是否需要被添加入任务队列，接着执行timerFunc函数:
```
if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve();
    timerFunc = function () {
      p.then(flushCallbacks);
      // In problematic UIWebViews, Promise.then doesn't completely break, but
      // it can get stuck in a weird state where callbacks are pushed into the
      // microtask queue but the queue isn't being flushed, until the browser
      // needs to do some other work, e.g. handle a timer. Therefore we can
      // "force" the microtask queue to be flushed by adding an empty timer.
      if (isIOS) { setTimeout(noop); }
    };
    isUsingMicroTask = true;
  } else if (!isIE && typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]'
  )) {
    // Use MutationObserver where native Promise is not available,
    // e.g. PhantomJS, iOS7, Android 4.4
    // (#6466 MutationObserver is unreliable in IE11)
    var counter = 1;
    var observer = new MutationObserver(flushCallbacks);
    var textNode = document.createTextNode(String(counter));
    observer.observe(textNode, {
      characterData: true
    });
    timerFunc = function () {
      counter = (counter + 1) % 2;
      textNode.data = String(counter);
    };
    isUsingMicroTask = true;
  } else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    // Fallback to setImmediate.
    // Techinically it leverages the (macro) task queue,
    // but it is still a better choice than setTimeout.
    timerFunc = function () {
      setImmediate(flushCallbacks);
    };
  } else {
    // Fallback to setTimeout.
    timerFunc = function () {
      setTimeout(flushCallbacks, 0);
    };
}
```
timerFunc表示一个异步延迟包装器，保延迟调用 flushCallbacks 函数。Vue2.6.*版本以微任务优先，其顺序为promise > MutationObserver > setImmediate > setTimeout。Vue2.5.*的整体优先级是：Promise > setImmediate > MessageChannel > setTimeout，flushCallbacks函数是遍历执行回调函数
```
function flushCallbacks () {
    pending = false;
    var copies = callbacks.slice(0);
    callbacks.length = 0;
    for (var i = 0; i < copies.length; i++) {
      copies[i]();
    }
}
```
#### DOM的异步更新
当$nextTick的回调函数改变了状态值，会触发Object.defineProperty中的set属性，随后执行
```
dep.notify();
// Dep类的notify方法
Dep.prototype.notify = function notify () {
    // stabilize the subscriber list first
    var subs = this.subs.slice();
    if (!config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort(function (a, b) { return a.id - b.id; });
    }
    for (var i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
};
```
触发watcher的update方法:
```
Watcher.prototype.update = function update () {
    /* istanbul ignore else */
    // computed需要更新值时
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      // 同步执行时
      this.run();
    } else {
      // 加入到任务队列中
      queueWatcher(this);
    }
};
```
queueWatcher函数主要执行`nextTick(flushSchedulerQueue)`函数，表示下一个事件循环执行flushSchedulerQueue函数，该函数简化为:
```
  function flushSchedulerQueue () {
    flushing = true
    let watcher, id

    for (index = 0; index < queue.length; index++) {
      watcher = queue[index]
      if (watcher.before) {
        watcher.before()
      }
      id = watcher.id
      has[id] = null
      watcher.run()
}
```
此时能更新视图，重新渲染。

#### Vue的错误处理机制
Vue的API中有个errorCapture钩子函数的作用是捕获来自子孙组件的错误，当返回false时，组织错误继续传播，其错误传播机制如下:
* 默认情况下，如果全局的 config.errorHandler定义，所有的错误仍会发送它，因此这些错误仍然会向单一的分析服务的地方进行汇报
* 如果一个组件的继承或父级从属链路中存在多个 errorCaptured 钩子，则它们将会被相同的错误逐个唤起。
* 如果此 errorCaptured 钩子自身抛出了一个错误，则这个新错误和原本被捕获的错误都会发送给全局的 config.errorHandler，不能捕获异步promise内部抛出的错误和自身的错误
* 一个 errorCaptured 钩子能够返回 false 以阻止错误继续向上传播
全局config.errorHandler具体用法如下:
```
Vue.config.errorHandler = function (err, vm, info) {
  // handle error
  // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
  // 只在 2.2.0+ 可用
}
```
相关代码如下:
```
function handleError (err, vm, info) {
    // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
    // See: https://github.com/vuejs/vuex/issues/1505
    pushTarget();
    try {
      if (vm) {
        var cur = vm;
        // 自底向上循环读取父组件errorCaptured钩子函数，并执行
        while ((cur = cur.$parent)) {
          var hooks = cur.$options.errorCaptured;
          if (hooks) {
            for (var i = 0; i < hooks.length; i++) {
              try {
                var capture = hooks[i].call(cur, err, vm, info) === false;
                // 如果errorCaptured钩子函数返回的值是false，则直接返回
                if (capture) { return }
              } catch (e) {
                globalHandleError(e, cur, 'errorCaptured hook');
              }
            }
          }
        }
      }
      globalHandleError(err, vm, info);
    } finally {
      popTarget();
    }
  }
```
然后执行globalHandleError(err, vm, info)函数:
```
function globalHandleError (err, vm, info) {
    if (config.errorHandler) {
      try {
        // 传递到全局的errorHandler函数处理
        return config.errorHandler.call(null, err, vm, info)
      } catch (e) {
        // if the user intentionally throws the original error in the handler,
        // do not log it twice
        if (e !== err) {
          logError(e, null, 'config.errorHandler');
        }
      }
    }
    // 打印错误
    logError(err, vm, info);
  }

```