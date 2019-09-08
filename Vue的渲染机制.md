### 虚拟DOM与VNode简介
1. 什么是虚拟DOM
* 以前M的命令式操作DOM即使用jQuery操作DOM节点，随着状态的增多，DOM的操作就会越来越频繁，程序的状态也越难维护，现在主流的框架都是采用声明式操作DOM，将操作DOM的方法封装起来，我们只要更改数据的状态，框架本身会帮我们操作DOM。
* 虚拟DOM根据状态建立一颗虚拟节点树，新的虚拟节点树会与旧的虚拟节点树进行对比，只渲染发生改变的部分，如下图:
<img src="https://user-gold-cdn.xitu.io/2017/12/28/1609be700a80c98a?imageView2/0/w/1280/h/960/ignore-error/1">
2. 引入虚拟DOM的目的
* 把渲染过程抽象化，从而使得组件的抽象能力也得到提升，并且可以适配DOM以外的渲染目标；
* 可以更好地支持SSR、同构渲染等；
* 不再依赖HTML解析器进行模板解析，可以进行更多的AOT(预编译)工作提高运行时效率，还能将Vue运行时体积进一步压缩。

3. VNode的定义
Vue中定义了VNode的构造函数，这样我们可以实例化不同的vnode
实例如：文本节点、元素节点以及注释节点等。
```
var VNode = function VNode (
    tag,
    data,
    children,
    text,
    elm,
    context,
    componentOptions,
    asyncFactory
  ) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.ns = undefined;
    this.context = context;
    this.fnContext = undefined;
    this.fnOptions = undefined;
    this.fnScopeId = undefined;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = undefined;
    this.parent = undefined;
    this.raw = false;
    this.isStatic = false;
    this.isRootInsert = true;
    this.isComment = false;
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = undefined;
    this.isAsyncPlaceholder = false;
  };
```
vnode其实就是一个描述节点的对象，描述如何创建真实的DOM节点；vnode的作用就是新旧vnode进行对比，只更新发生变化的节点。
VNode有注释节点、文本节点、元素节点、组件节点、函数式组件、克隆节点:
* 注释节点
```
var createEmptyVNode = function (text) {
    if ( text === void 0 ) text = '';
    var node = new VNode();
    node.text = text;
    node.isComment = true;
    return node
  };
```
只有isComment和text属性有效，其余的默认为false或者null
* 文本节点
```
function createTextVNode (val) {
    return new VNode(undefined, undefined, undefined, String(val))
  }
```
只有一个text属性
* 克隆节点
```
function cloneVNode (vnode) {
    var cloned = new VNode(
      vnode.tag,
      vnode.data,
      // #7975
      // clone children array to avoid mutating original in case of cloning
      // a child.
      vnode.children && vnode.children.slice(),
      vnode.text,
      vnode.elm,
      vnode.context,
      vnode.componentOptions,
      vnode.asyncFactory
    );
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned
  }
```
克隆节点将vnode的所有属性赋值到clone节点，并且设置isCloned = true，它的作用是优化静态节点和插槽节点。以静态节点为例，因为静态节点的内容是不会改变的，当它首次生成虚拟DOM节点后，再次更新时是不需要再次生成vnode，而是将原vnode克隆一份进行渲染，这样在一定程度上提升了性能。
* 元素节点
元素节点一般会存在tag、data、children、context四种有效属性,形如:
```
{
    children: [VNode, VNode],
    context: {...},
    tag: 'div',
    data: {attr: {id: app}}
}
```
* 组件节点
组件节点有两个特有属性
(1) componentOptions，组件节点的选项参数，包含如下内容:
```
{ Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children }
```
(2) componentInstance: 组件的实例，也是Vue的实例
对应的vnode
```
new VNode(
      ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
      data, undefined, undefined, undefined, context,
      { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
      asyncFactory
    )
```
即
```
{
    componentOptions: {},
    componentInstance: {},
    tag: 'vue-component-1-child',
    data: {...},
    ...
}
```
* 函数式组件
函数组件通过createFunctionalComponent函数创建, 跟组件节点类似，暂时没看到特殊属性，有的话后续再补上。

### patch
虚拟DOM最重要的功能是patch，将VNode渲染为真实的DOM。
#### patch简介
patch中文意思是打补丁，也就是在原有的基础上修改DOM节点，也可以说是渲染视图。DOM节点的修改有三种:
* 创建新增节点
* 删除废弃的节点
* 修改需要更新的节点。
当缓存上一次的oldvnode与最新的vnode不一致的时候，渲染视图以vnode为准。

### 初次渲染过程
当oldvnode中不存在，而vnode中存在时，就需要使用vnode新生成真实的DOM节点并插入到视图中。首先如果vnode具有tag属性，则认为它是元素属性，再根据当前环境创建真实的元素节点，元素创建后将它插入到指定的父节点。以上节生成的VNode为例，首次执行
```
vm._update(vm._render(), hydrating);
```
vm._render()为上篇生成的VNode，_update函数具体为
```
Vue.prototype._update = function (vnode, hydrating) {
      var vm = this;
      var prevEl = vm.$el;
      var prevVnode = vm._vnode;
      var restoreActiveInstance = setActiveInstance(vm);
      // 缓存vnode
      vm._vnode = vnode;
      // Vue.prototype.__patch__ is injected in entry points
      // based on the rendering backend used.
      // 第一次渲染，preVnode是不存在的
      if (!prevVnode) {
        // initial render
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
      } else {
        // updates
        vm.$el = vm.__patch__(prevVnode, vnode);
      }
      restoreActiveInstance();
      // update __vue__ reference
      if (prevEl) {
        prevEl.__vue__ = null;
      }
      if (vm.$el) {
        vm.$el.__vue__ = vm;
      }
      // if parent is an HOC, update its $el as well
      if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el;
      }
      // updated hook is called by the scheduler to ensure that children are
      // updated in a parent's updated hook.
    };

```
因第一次渲染，执行`vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);`，注意第一个参数是oldVnode为`vm.$el`为元素节点，__patch__函数具体过程为:
(1) 先判断oldVnode是否存在，不存在就创建vnode
```
if (isUndef(oldVnode)) {
    // empty mount (likely as component), create new root element
    isInitialPatch = true;
    createElm(vnode, insertedVnodeQueue);
}
```
(2) 存在进入else，判断oldVnode是否是元素节点，如果oldVnode是元素节点，则
```
if (isRealElement) {
    ...
    // either not server-rendered, or hydration failed.
    // create an empty node and replace it
    oldVnode = emptyNodeAt(oldVnode);
}
```
创建一个oldVnode节点，其形式为
```
{
    asyncFactory: undefined,
    asyncMeta: undefined,
    children: [],
    componentInstance: undefined,
    componentOptions: undefined,
    context: undefined,
    data: {},
    elm: div#app,
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
    tag: "div",
    text: undefined,
    child: undefined
}
```
然后获取oldVnode的元素节点以及其父节点，并创建新的节点
```
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
```
创建新节点的过程
```
// 标记是否是根节点
 vnode.isRootInsert = !nested; // for transition enter check
 // 这个函数如果vnode有componentInstance属性，会创建子组件，后续具体介绍，否则不做处理
if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
}
```
接着在对子节点处理
```
var data = vnode.data;
  var children = vnode.children;
  var tag = vnode.tag;
  if (isDef(tag)) {
    ...
    vnode.elm = vnode.ns
      ? nodeOps.createElementNS(vnode.ns, tag)
      : nodeOps.createElement(tag, vnode);
    setScope(vnode);

    /* istanbul ignore if */
    {
        createChildren(vnode, children, insertedVnodeQueue);
        if (isDef(data)) {
          invokeCreateHooks(vnode, insertedVnodeQueue);
        }
        insert(parentElm, vnode.elm, refElm);
    }

    if (data && data.pre) {
        creatingElmInVPre--;
    }
  }
}
```
将vnode的属性设置为创建元素节点elem，创建子节点
`createChildren(vnode, children, insertedVnodeQueue);`
该函数遍历子节点children数组
```
function createChildren (vnode, children, insertedVnodeQueue) {
  if (Array.isArray(children)) {
      for (var i = 0; i < children.length; ++i) {
          createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
      }
  } else if (isPrimitive(vnode.text)) {
      // 如果vnode是文本直接挂载
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
  }
}
```
遍历children，递归createElm方法创建子元素节点
```
else if (isTrue(vnode.isComment)) {
    vnode.elm = nodeOps.createComment(vnode.text);
    insert(parentElm, vnode.elm, refElm);
} else {
    vnode.elm = nodeOps.createTextNode(vnode.text);
    insert(parentElm, vnode.elm, refElm);
}
```
如果是评论节点，直接创建评论节点，并将其插入到父节点上，其他的创建文本节点，并将其插入到父节点parentElm(刚创建的div)上去。
触发钩子，更新节点属性，将其插入到parentElm('#app'元素节点)上
```
{
    createChildren(vnode, children, insertedVnodeQueue);
    if (isDef(data)) {
        invokeCreateHooks(vnode, insertedVnodeQueue);
    }
    insert(parentElm, vnode.elm, refElm);
}
```
最后将老的节点删掉
```
if (isDef(parentElm)) {
    removeVnodes(parentElm, [oldVnode], 0, 0);
} else if (isDef(oldVnode.tag)) {
    invokeDestroyHook(oldVnode);
}
```
```
function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
        var i;
        var listeners = cbs.remove.length + 1;
        ...
        // recursively invoke hooks on child component root node
        if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
            removeAndInvokeRemoveHook(i, rm);
        }
        for (i = 0; i < cbs.remove.length; ++i) {
            cbs.remove[i](vnode, rm);
        }
        if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
            i(vnode, rm);
        } else {
            // 删除id为app的老节点
            rm();
        }
    } else {
        removeNode(vnode.elm);
    }
}
```
初次渲染结束。

### 更新节点过程
为了更好地测试，模板选用
```
<div id="app">{{ message }}<button @click="update">更新</button></div>
```
点击按钮，会更新message，重新渲染视图，生成的VNode为
```
{
    asyncFactory: undefined,
    asyncMeta: undefined,
    children: [VNode, VNode],
    componentInstance: undefined,
    componentOptions: undefined,
    context: Vue实例,
    data: {attrs: {id: "app"}},
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
    tag: "div",
    text: undefined,
    child: undefined
}
```
在组件更新的时候,preVnode和vnode都是存在的,执行
```
vm.$el = vm.__patch__(prevVnode, vnode);
```
实际上是运行以下函数
```
patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
```
该函数首先判断oldVnode和vnode是否相等，相等则立即返回
```
if (oldVnode === vnode) {
    return
}
```
如果两者均为静态节点且key值相等，且vnode是被克隆或者具有isOnce属性时，vnode的组件实例componentInstance直接赋值
```
if (isTrue(vnode.isStatic) &&
    isTrue(oldVnode.isStatic) &&
    vnode.key === oldVnode.key &&
    (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
) {
    vnode.componentInstance = oldVnode.componentInstance;
    return
}
```
接着对两者的属性值作对比，并更新
```
var oldCh = oldVnode.children;
var ch = vnode.children;
if (isDef(data) && isPatchable(vnode)) {
    for (i = 0; i < cbs.update.length; ++i) {       // 以vnode为准更新oldVnode的不同属性
        cbs.update[i](oldVnode, vnode); 
    }
    if (isDef(i = data.hook) && isDef(i = i.update)) { 
        i(oldVnode, vnode); 
    }
}
```
vnode和oldVnode的对比以及相应的DOM操作具体如下:
```
// vnode不存在text属性的情况
if (isUndef(vnode.text)) {
  if (isDef(oldCh) && isDef(ch)) {
    // 子节点不相等时，更新
    if (oldCh !== ch) { 
        updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
  } else if (isDef(ch)) {
      {
        checkDuplicateKeys(ch);
      }
      // 只存在vnode的子节点，如果oldVnode存在text属性，则将元素的文本内容清空，并新增elm节点
      if (isDef(oldVnode.text)) {             nodeOps.setTextContent(elm, ''); 
      }
      addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
  } else if (isDef(oldCh)) {
      // 如果只存在oldVnode的子节点，则删除DOM的子节点
      removeVnodes(elm, oldCh, 0, oldCh.length - 1);
  } else if (isDef(oldVnode.text)) {
      // 只存在oldVnode有text属性，将元素的文本清空
      nodeOps.setTextContent(elm, '');
  }
} else if (oldVnode.text !== vnode.text) {
    // node和oldVnode的text属性都存在且不一致时，元素节点内容设置为vnode.text
    nodeOps.setTextContent(elm, vnode.text);
}
```
对于子节点的对比，先分别定义oldVnode和vnode两数组的前后两个指针索引
```
var oldStartIdx = 0;
var newStartIdx = 0;
var oldEndIdx = oldCh.length - 1;
var oldStartVnode = oldCh[0];
var oldEndVnode = oldCh[oldEndIdx];
var newEndIdx = newCh.length - 1;
var newStartVnode = newCh[0];
var newEndVnode = newCh[newEndIdx];
var oldKeyToIdx, idxInOld, vnodeToMove, refElm;
```
如下图:
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b707df4902029?imageView2/0/w/1280/h/960/ignore-error/1">
接下来是一个while循环，在这过程中，oldStartIdx、newStartIdx、oldEndIdx 以及 newEndIdx 会逐渐向中间靠拢
```
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) 
```
当oldStartVnode或者oldEndVnode为空时，两中间移动
```
if (isUndef(oldStartVnode)) {
    oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
} else if (isUndef(oldEndVnode)) {
    oldEndVnode = oldCh[--oldEndIdx];
} 
```
接下来这一块，是将 oldStartIdx、newStartIdx、oldEndIdx 以及 newEndIdx 两两比对的过程，共四种:
```
else if (sameVnode(oldStartVnode, newStartVnode)) {
    patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
    oldStartVnode = oldCh[++oldStartIdx];
    newStartVnode = newCh[++newStartIdx];
} else if (sameVnode(oldEndVnode, newEndVnode)) {
    patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
    oldEndVnode = oldCh[--oldEndIdx];
    newEndVnode = newCh[--newEndIdx];
} else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
    patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
    canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
    oldStartVnode = oldCh[++oldStartIdx];
    newEndVnode = newCh[--newEndIdx];
} else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
    patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
    canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
    oldEndVnode = oldCh[--oldEndIdx];
    newStartVnode = newCh[++newStartIdx];
}
```
第一种: 前前相等比较
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b71f5a48631f4?imageView2/0/w/1280/h/960/ignore-error/1">
如果相等，则oldStartVnode.elm和newStartVnode.elm均向后移一位，继续比较。
第二种: 后后相等比较
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b7228b9ecb23a?imageView2/0/w/1280/h/960/ignore-error/1">
如果相等，则oldEndVnode.elm和newEndVnode.elm均向前移一位，继续比较。
第三种: 前后相等比较
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b723af0fd706a?imageView2/0/w/1280/h/960/ignore-error/1">
将oldStartVnode.elm节点直接移动到oldEndVnode.elm节点后面，然后将oldStartIdx向后移一位，newEndIdx向前移动一位。
第四种: 后前相等比较
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b72ae720954cd?imageView2/0/w/1280/h/960/ignore-error/1">
将oldEndVnode.elm节点直接移动到oldStartVnode.elm节点后面，然后将oldEndIdx向前移一位，newStartIdx向后移动一位。
如果以上均不满足，则
```
else {
  if (isUndef(oldKeyToIdx)) { 
      oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); 
  }
  idxInOld = isDef(newStartVnode.key)
    ? oldKeyToIdx[newStartVnode.key]
    : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
  if (isUndef(idxInOld)) { // New element
      createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
  } else {
      vnodeToMove = oldCh[idxInOld];
      if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
            oldCh[idxInOld] = undefined;
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
      } else {
      // same key but different element. treat as new element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
      }
    }
    newStartVnode = newCh[++newStartIdx];
}
```
createkeyToOldIdx函数的作用是建立key和index索引对应的map表，如果还是没有找到节点，则新创建节点
```
createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
```
插入到oldStartVnode.elm节点前面，否则，如果找到了节点，并符合sameVnode，将两个节点patchVnode，并将该位置的老节点置为undefined，同时将vnodeToMove.elm移到oldStartVnode.elm的前面，以及newStartIdx往后移一位，示意图如下:
<img src="https://user-gold-cdn.xitu.io/2018/1/2/160b73aa8f758342?imageView2/0/w/1280/h/960/ignore-error/1">
如果不符合sameVnode，只能创建一个新节点插入到 parentElm 的子节点中，newStartIdx 往后移动一位。
最后如果，oldStartIdx > oldEndIdx，说明老节点比对完了，但是新节点还有多的，需要将新节点插入到真实 DOM 中去，调用 addVnodes 将这些节点插入即可；如果满足 newStartIdx > newEndIdx 条件，说明新节点比对完了，老节点还有多，将这些无用的老节点通过 removeVnodes 批量删除即可。到这里这个过程基本结束。

### 总结
本文详细介绍了虚拟DOM的整个patch过程，如何到渲染到页面，以及元素从视图中删除，最后是子节点的更新过程，包括了创建新增的子节点、删除废弃子节点、更新发生变化的子节点以及位置发生变化的子节点更新等。

### 参考文献
深入浅出Vue.js
剖析 Vue.js 内部运行机制
