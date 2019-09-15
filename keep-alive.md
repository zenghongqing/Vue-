### keep-alive的运行过程
keep-alive是个抽象组件（或称为功能型组件），实际上不会被渲染在DOM树中。它的作用是在内存中缓存组件（不让组件销毁），等到下次再渲染的时候，还会保持其中的所有状态，并且会触发activated钩子函数。一般与<router-view />或者动态组件配合使用，本篇以动态组件为例:
keep-alive的模板
```
<div id="app"><keep-alive><component :is="view"></component></keep-alive><button @click="changeView">切换</button></div>  
```
子组件模板分别为
```
Vue.component('view1', {
    template: '<div>view component1</div>'
})
Vue.component('view2', {
    template: '<div>view component2</div>'
})
```
。
### keep-alive父子组件的解析
动态组件component标签元素会在closeElement函数执行过程中，由processComponent处理
```
function processComponent (el) {
    var binding;
    if ((binding = getBindingAttr(el, 'is'))) {
      el.component = binding;
    }
    if (getAndRemoveAttr(el, 'inline-template') != null) {
      el.inlineTemplate = true;
    }
}
```
生成
```
{
  component: 'view'
}
```
即AST节点为
```
{
  attrsList: [],
  attrsMap: {:is: "view"},
  children: [],
  component: "view",
  end: 60,
  parent: {type: 1, tag: "keep-alive", attrsList: Array(0), attrsMap: {…}, rawAttrsMap: {…}, …}
  plain: false
  rawAttrsMap: {:is: {
    end: 47,
    name: ":is",
    start: 37,
    value: "view"
  }},
  start: 26,
  tag: "component",
  type: 1
}
```
再生成代码阶段，genElement函数会调用
```
var code;
if (el.component) {
  code = genComponent(el.component, el, state);
} else {
  var data;
  if (!el.plain || (el.pre && state.maybeComponent(el))) {
    data = genData$2(el, state);
  }

  var children = el.inlineTemplate ? null : genChildren(el, state, true);
  code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
}
```
genComponent具体为
```
function genComponent (
    componentName,
    el,
    state
  ) {
    var children = el.inlineTemplate ? null : genChildren(el, state, true);
    return ("_c(" + componentName + "," + (genData$2(el, state)) + (children ? ("," + children) : '') + ")")
}
```
返回
```
"_c(view,{tag:"component"})"
```
然后添加keep-alive组件生成
```
"_c('keep-alive',[_c(view,{tag:"component"})],1)"
```
最后父组件的render生成的完整形式为
```
_c('div',{
    attrs:{"id":"app"}
}, [
    _c('keep-alive',
    [
        _c(view, {tag: "component"})], 1),
        _v(" "),
        _c('button',{on:{"click":changeView}},[_v("切换")
    ])
], 1)
```
其中_c表示createElem创建元素vnode, _v创建文本类型的vnode。keep-alive的子组件component变为`_c(view, {tag: "component"})], 1)`然后生成vnode的过程如下:
```
function createElement (
    context,
    tag,
    data,
    children,
    normalizationType,
    alwaysNormalize
  ) {
    ...
    return _createElement(context, tag, data, children, normalizationType)
  }

```
data为 `{tag: "component"}`, tag为`view`, _createElement函数为
```
...
var vnode, ns;
    if (typeof tag === 'string') {
      var Ctor;
      ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
      if (config.isReservedTag(tag)) {
        // platform built-in elements
        vnode = new VNode(
          config.parsePlatformTagName(tag), data, children,
          undefined, undefined, context
        );
      } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
        // component
        // 创建子组件的vnode
        vnode = createComponent(Ctor, data, context, children, tag);
      } else {
        // unknown or unlisted namespaced elements
        // check at runtime because it may get assigned a namespace when its
        // parent normalizes children
        vnode = new VNode(
          tag, data, children,
          undefined, undefined, context
        );
      }
    } else {
      // direct component options / constructor
      vnode = createComponent(tag, data, context, children);
    }
```
因为view1并不是元素节点，故进入执行`vnode = createComponent(Ctor, data, context, children, tag)`, 函数具体为
```
function createComponent (
    Ctor,
    data,
    context,
    children,
    tag
  ) {
    ...
    data = data || {};

    // resolve constructor options in case global mixins are applied after
    // component constructor creation
    resolveConstructorOptions(Ctor);

    // extract props
    var propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // functional component
    if (isTrue(Ctor.options.functional)) {
      return createFunctionalComponent(Ctor, propsData, data, context, children)
    }

    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    var listeners = data.on;
    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;

    if (isTrue(Ctor.options.abstract)) {
      // abstract components do not keep anything
      // other than props & listeners & slot

      // work around flow
      var slot = data.slot;
      data = {};
      if (slot) {
        data.slot = slot;
      }
    }

    // install component management hooks onto the placeholder node
    // 在data中增加insert、prepatch、init、destroy四个钩子
    installComponentHooks(data);

    // return a placeholder vnode
    // 创建并返回vnode
    var name = Ctor.options.name || tag;
    var vnode = new VNode(
      ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
      data, undefined, undefined, undefined, context,
      { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
      asyncFactory
    );

    return vnode
  }
```
其中vnode中的componentOptions为 {Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children}
`_c(view,{tag:"component"})`生成vnode为
```
{
  asyncFactory: undefined,
  asyncMeta: undefined,
  children: undefined,
  componentInstance: undefined,
  componentOptions: {
    Ctor: ƒ, 
    propsData: undefined, 
    listeners: undefined, 
    tag: "view1", 
    children: undefined
  },
  context: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …},
  data: {tag: "component", on: undefined, hook: {…}},
  elm: undefined,
  fnContext: undefined,
  fnOptions: undefined,
  fnScopeId: undefined,
  isAsyncPlaceholder: false,
  isCloned: false,
  isComment: false,
  isOnce: false,
  isRootInsert: true,
  isStatic: false,
  key: undefined,
  ns: undefined,
  parent: undefined,
  raw: false,
  tag: "vue-component-1-view1",
  text: undefined,
  child: undefined
}
```
### keep-alive组件
keep-alive组件是Vue内部定义的组件，它的实现也是一个对象，注意它有一个属性 abstract 为 true，是一个抽象组件。在初始化initLifecycle过程中
```
// locate first non-abstract parent
let parent = options.parent
if (parent && !options.abstract) {
  while (parent.$options.abstract && parent.$parent) {
    parent = parent.$parent
  }
  parent.$children.push(vm)
}
vm.$parent = parent
```
组件之间建立父子关系会跳过该抽象组件，这个例子中的
keep-alive生成的VNode为:
```
{
  asyncFactory: undefined,
  asyncMeta: undefined,
  children: undefined,
  componentInstance: undefined,
  componentOptions: {
    Ctor: ƒ, 
    propsData: {}, 
    listeners: undefined, 
    tag: "keep-alive", 
    children: Array(1)
  },
  context: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …},
  data: {
    hook: {init: ƒ, prepatch: ƒ, insert: ƒ, destroy: ƒ}
  },
  elm: undefined,
  fnContext: undefined,
  fnOptions: undefined,
  fnScopeId: undefined,
  isAsyncPlaceholder: false,
  isCloned: false,
  isComment: false,
  isOnce: false,
  isRootInsert: true,
  isStatic: false,
  key: undefined,
  ns: undefined,
  parent: undefined,
  raw: false,
  tag: "vue-component-3-keep-alive",
  text: undefined,
  child: undefined
}
```
最后进行updateComponent操作, 在挂载阶段会进行dom diff操作, 执行
patch (oldVnode, vnode, hydrating, removeOnly)
```
...
patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
}
...

```
递归的创建节点然后挂载到parentElem上，对于子组件，会执行$createElement函数, 如果是普通元素节点则直接返回，过程如下:
```
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    // i 是insert、init、prepatch、destroy的钩子对象
    var i = vnode.data;
    if (isDef(i)) {
    var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
    if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */);
    }
    // after calling the init hook, if the vnode is a child component
    // it should've created a child instance and mounted it. the child
    // component also has set the placeholder vnode's elm.
    // in that case we can just return the element and be done.
    if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        insert(parentElm, vnode.elm, refElm);
        if (isTrue(isReactivated)) {
        reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true
    }
    }
}
```
上面i 是insert、init、prepatch、destroy的钩子对象

```
// inline hooks to be invoked on component VNodes during patch
  var componentVNodeHooks = {
    init: function init (vnode, hydrating) {
      if (
        vnode.componentInstance &&
        !vnode.componentInstance._isDestroyed &&
        vnode.data.keepAlive
      ) {
        // kept-alive components, treat as a patch
        var mountedNode = vnode; // work around flow
        componentVNodeHooks.prepatch(mountedNode, mountedNode);
      } else {
        var child = vnode.componentInstance = createComponentInstanceForVnode(
          vnode,
          activeInstance
        );
        child.$mount(hydrating ? vnode.elm : undefined, hydrating);
      }
    },

    prepatch: function prepatch (oldVnode, vnode) {
      var options = vnode.componentOptions;
      var child = vnode.componentInstance = oldVnode.componentInstance;
      updateChildComponent(
        child,
        options.propsData, // updated props
        options.listeners, // updated listeners
        vnode, // new parent vnode
        options.children // new children
      );
    },

    insert: function insert (vnode) {
      var context = vnode.context;
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isMounted) {
        componentInstance._isMounted = true;
        callHook(componentInstance, 'mounted');
      }
      if (vnode.data.keepAlive) {
        if (context._isMounted) {
          // vue-router#1212
          // During updates, a kept-alive component's child components may
          // change, so directly walking the tree here may call activated hooks
          // on incorrect children. Instead we push them into a queue which will
          // be processed after the whole patch process ended.
          queueActivatedComponent(componentInstance);
        } else {
          activateChildComponent(componentInstance, true /* direct */);
        }
      }
    },

    destroy: function destroy (vnode) {
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isDestroyed) {
        if (!vnode.data.keepAlive) {
          componentInstance.$destroy();
        } else {
          deactivateChildComponent(componentInstance, true /* direct */);
        }
      }
    }
  };
```
如果是初次创建组件，则调用init钩子里的
```
createComponentInstanceForVnode(
          vnode,
          activeInstance
        );
child.$mount(hydrating ? vnode.elm : undefined, hydrating);
```
已存在的话更新组件调用prepatch; 

创建元素实例vnode
```
function createComponentInstanceForVnode (
    vnode, // we know it's MountedComponentVNode but flow doesn't
    parent // activeInstance in lifecycle state
  ) {
    var options = {
      _isComponent: true,
      _parentVnode: vnode,
      parent: parent
    };
    // check inline-template render functions
    var inlineTemplate = vnode.data.inlineTemplate;
    if (isDef(inlineTemplate)) {
      options.render = inlineTemplate.render;
      options.staticRenderFns = inlineTemplate.staticRenderFns;
    }
    return new vnode.componentOptions.Ctor(options)
  }
```
_parentNode表示当前vnode, 然后就是子组件的初始化
```
var Sub = function VueComponent (options) {
        this._init(options);
      };
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(
    Super.options,
    extendOptions
    );
    Sub['super'] = Super
```
在initRender初始函数中会初始化`$slots={default: [vnode]}`, 因为 <keep-alive> 是在标签内部写 DOM，所以可以先获取到它的默认插槽，然后再获取到它的第一个子节点。<keep-alive> 只处理第一个子元素，所以一般和它搭配使用的有 component 动态组件或者是 router-view获取需要渲染的子组件的`VNode、$scopedSlots、vm.$createElement`; 子组件_render执行过程会处理
```
vm.$scopedSlots = normalizeScopedSlots {
    ...
    return {
        default: ƒ ()
        $hasNormal: true
        $key: undefined
        $stable: false
    }
}
vnode = render.call(vm._renderProxy, vm.$createElement);
```
render函数此时指向vm._renderProxy即keep-alive内置组件, 如果当前子组件是keep-alive则执行
```
var KeepAlive = {
    name: 'keep-alive',
    abstract: true,
    props: {
      include: patternTypes,
      exclude: patternTypes,
      max: [String, Number]
    },
    created: function created () {
      this.cache = Object.create(null);
      this.keys = [];
    },

    destroyed: function destroyed () {
      for (var key in this.cache) {
        pruneCacheEntry(this.cache, key, this.keys);
      }
    },

    mounted: function mounted () {
      var this$1 = this;

      this.$watch('include', function (val) {
        pruneCache(this$1, function (name) { return matches(val, name); });
      });
      this.$watch('exclude', function (val) {
        pruneCache(this$1, function (name) { return !matches(val, name); });
      });
    },

    render: function render () {
      // 获取子组件内容 [VNode]
      var slot = this.$slots.default;
      var vnode = getFirstComponentChild(slot);
      var componentOptions = vnode && vnode.componentOptions;
      if (componentOptions) {
        // check pattern
        // 获得子组件的组件名
        var name = getComponentName(componentOptions);
        var ref = this;
        var include = ref.include;
        var exclude = ref.exclude;
        // 如果满足了配置 include 且不匹配或者是配置了 exclude 且匹配，那么就直接返回这个组件的 vnode
        if (
          // not included
          (include && (!name || !matches(include, name))) ||
          // excluded
          (exclude && name && matches(exclude, name))
        ) {
          return vnode
        }

        var ref$1 = this;
        var cache = ref$1.cache;
        var keys = ref$1.keys;
        var key = vnode.key == null
          // same constructor may get registered as different local components
          // so cid alone is not enough (#3269)
          ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
          : vnode.key;
          // 判读缓存里是否有"1::view1",存在的话直接从缓存里获取组件实例，更新keys中的key
        if (cache[key]) {
          vnode.componentInstance = cache[key].componentInstance;
          // make current key freshest
          remove(keys, key);
          keys.push(key);
        } else {
          // 缓存vnode
          cache[key] = vnode;
          keys.push(key);
          // prune oldest entry
          // 如果配置了 max 并且缓存的长度超过了 this.max，还要从缓存中删除第一个
          if (this.max && keys.length > parseInt(this.max)) {
            pruneCacheEntry(cache, keys[0], keys, this._vnode);
          }
        }

        vnode.data.keepAlive = true;
      }
      return vnode || (slot && slot[0])
    }
  };
```
其中pruneCacheEntry函数为:
```
function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null 
  remove(keys, key)
}
```
如果缓存的组件标签与当前渲染组件的tag不一致时，也执行删除缓存的组件实例的 $destroy 方法,最后设置 vnode.data.keepAlive = true。此外keep-alive还会通过watch检测传入的include 和 exclude 的变化，对缓存做处理即对 cache 做遍历，发现缓存的节点名称和新的规则没有匹配上的时候，就把这个缓存节点从缓存中摘除。
keep-alive的子组件生成的vnode为:
```
{
  asyncFactory: undefined
  asyncMeta: undefined,
  children: undefined,
  componentInstance: undefined,
  componentOptions: {
    Ctor: ƒ, 
    propsData: undefined, 
    listeners: undefined, 
    tag: "view1", 
    children: undefined
  },
  context: Vue {_uid: 0, _isVue: true, $options: {…}, _renderProxy: Proxy, _self: Vue, …},
  data: {
    tag: "component", 
    on: undefined, 
    hook: {…}, 
    keepAlive: true
  },
  elm: undefined,
  fnContext: undefined,
  fnOptions: undefined,
  fnScopeId: undefined,
  isAsyncPlaceholder: false,
  isCloned: false,
  isComment: false,
  isOnce: false,
  isRootInsert: true,
  isStatic: false,
  key: undefined,
  ns: undefined,
  parent: undefined,
  raw: false,
  tag: "vue-component-1-view1",
  text: undefined,
  child: undefined,
}
```
接着在渲染阶段的createElm函数调用createComponent, 会对view1组件进行初始化并进行编译模板生成render函数
```
(function anonymous(
) {
with(this){return _c('div',[_v("view component1")])}
})
```
最后是渲染过程。
### 首次渲染
在最后的渲染阶段，createElm函数执行createComponent，会触发componentVNodeHooks中的init钩子，初次渲染vnode.componentInstance为undefined，vnode.data.keepAlive设置了为true，所以会进入else，走正常的mount流程:
```
// 前面设置了keep-alive属性为true,故vnode.data.keepAlive = true
init: function init (vnode, hydrating) {
  if (
    vnode.componentInstance &&
    !vnode.componentInstance._isDestroyed &&
    vnode.data.keepAlive
  ) {
    // kept-alive components, treat as a patch
    var mountedNode = vnode; // work around flow
    componentVNodeHooks.prepatch(mountedNode, mountedNode);
  } else {
    // 将动态组件view1挂载到父级(非keep-alive组件)
    var child = vnode.componentInstance = createComponentInstanceForVnode(
      vnode,
      activeInstance
    );
    // 子节点挂载到父组件
    child.$mount(hydrating ? vnode.elm : undefined, hydrating);
  }
}
```
逐级挂载，最后渲染到页面。
### 缓存渲染过程
当一个组件切换到另一个组件时，在patch过程中会对比新旧vnode以及它们的子节点，而keep-alive组件的更新，首先在组件patchVnode过程中，一个元素即将被修复时会执行prepatch钩子函数:
```
if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
  i(oldVnode, vnode);
}
```
即
```
prepatch: function prepatch (oldVnode, vnode) {
      var options = vnode.componentOptions;
      var child = vnode.componentInstance = oldVnode.componentInstance;
      updateChildComponent(
        child,
        options.propsData, // updated props
        options.listeners, // updated listeners
        vnode, // new parent vnode
        options.children // new children
      );
    },
```
里面的关键代码就是执行
updateChildComponent(
        child,
        options.propsData, // updated props
        options.listeners, // updated listeners
        vnode, // new parent vnode
        options.children // new children
      );
```
该函数的核心代码:
```
// renderChildren为最新的子组件[VNode]，vm.$options._renderChildren表示老的子组件[VNode]
```
var needsForceUpdate = !!(
      renderChildren ||               // has new static slots
      vm.$options._renderChildren ||  // has old static slots
      hasDynamicScopedSlot
    );
// resolve slots + force update if has children
if (needsForceUpdate) {
  vm.$slots = resolveSlots(renderChildren, parentVnode.context);
  vm.$forceUpdate();
}
```
resolveSlots将新的子组件的VNode赋值给vm.$slots，即
```
vm.$slots = {
    default: [VNode]
}
```
再进行强制更新，重新渲染
```
Vue.prototype.$forceUpdate = function () {
  var vm = this;
  if (vm._watcher) {
    vm._watcher.update();
  }
};
```
再次执行到createComponent函数时
```
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
  var i = vnode.data;
  if (isDef(i)) {
    // 更新时，isReactivated为true
    var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
    if (isDef(i = i.hook) && isDef(i = i.init)) {
      i(vnode, false /* hydrating */);
    }
    // after calling the init hook, if the vnode is a child component
    // it should've created a child instance and mounted it. the child
    // component also has set the placeholder vnode's elm.
    // in that case we can just return the element and be done.
    if (isDef(vnode.componentInstance)) {
      initComponent(vnode, insertedVnodeQueue);
      insert(parentElm, vnode.elm, refElm);
      if (isTrue(isReactivated)) {
        reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
      }
      return true
    }
  }
}
```
其中data为:
```
{
    hook: {init: ƒ, prepatch: ƒ, insert: ƒ, destroy: ƒ}
    keepAlive: true,
    on: undefined,
    tag: "component",
}
```
上面的`i(vnode, false /* hydrating */)`,执行
```
init: function init (vnode, hydrating) {
  if (
    vnode.componentInstance &&
    !vnode.componentInstance._isDestroyed &&
    vnode.data.keepAlive
  ) {
    // 更新过程的patch
    // kept-alive components, treat as a patch
    var mountedNode = vnode; // work around flow
    componentVNodeHooks.prepatch(mountedNode, mountedNode);
  }
}
```
在执行 init 钩子函数的时候不会再执行组件的 mount 过程，回到createComponent函数，在 isReactivated 为 true 的情况下会执行 reactivateComponent 方法
```
function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
      var i;
      var innerNode = vnode;
      。。。
      // unlike a newly created component,
      // a reactivated keep-alive component doesn't insert itself
      insert(parentElm, vnode.elm, refElm);
    }
```
把缓存的 DOM 对象直接插入到目标元素。