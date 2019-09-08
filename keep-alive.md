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
其中_c表示createElem创建元素vnode, _v创建文本类型的vnode, _c(view, {tag: "component"})], 1)过程如下:
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
if (isUndef(oldVnode)) {
    // empty mount (likely as component), create new root element
    isInitialPatch = true;
    createElm(vnode, insertedVnodeQueue);
    } else {
    var isRealElement = isDef(oldVnode.nodeType);
    if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
    } else {
        if (isRealElement) {
        // mounting to a real element
        // check if this is server-rendered content and if we can perform
        // a successful hydration.
        if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR);
            hydrating = true;
        }
        // either not server-rendered, or hydration failed.
        // create an empty node and replace it
        oldVnode = emptyNodeAt(oldVnode);
        }

    // replacing existing element
    var oldElm = oldVnode.elm;
    var parentElm = nodeOps.parentNode(oldElm);

    // create new node
    createElm(
    vnode,
    insertedVnodeQueue,
    // extremely rare edge case: do not insert if old element is in a
    // leaving transition. Only happens when combining transition +
    // keep-alive + HOCs. (#4590)
    oldElm._leaveCb ? null : parentElm,
    nodeOps.nextSibling(oldElm)
    );
}
...

```
递归的创建节点然后挂载到parentElem上，对于子组件，会执行$createElement函数, 如果是普通元素节点则直接返回
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
在initRender初始函数中会初始化`$slots={default: [vnode]}`,获取需要渲染的子组件的`VNode、$scopedSlots、vm.$createElement`; 子组件_render执行过程会处理
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
        // include和exclude属性是否匹配, 不匹配则直接返回vnode
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
vnode为:
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
最后是挂载生成的newElem Dom元素，通过removeVnodes(parentElm, [oldVnode], 0, 0);将oldElem删除。