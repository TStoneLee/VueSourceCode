(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

  function isObject(data) {
    return typeof data === 'object' && typeof data !== null;
  }
  function isReservedTag(tagName) {
    let str = 'p,div,span,input,button';
    let obj = [];
    str.split(',').forEach(tag => {
      obj[tag] = true;
    });
    return obj[tagName];
  }
  function def(data, key, value) {
    Object.defineProperty(data, key, {
      configurable: false,
      enumerable: false,
      value
    });
  } // 取值时实现代理效果

  function proxy(vm, source, key) {
    Object.defineProperty(vm, key, {
      get() {
        return vm[source][key];
      },

      set(newValue) {
        vm[source][key] = newValue;
      }

    });
  }
  const LIFECYCLE_HOOKS = ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed']; // 生命周期合并策略

  const strats = {};

  function mergeHook(parentVal, childVal) {
    if (childVal) {
      if (parentVal) {
        return parentVal.concat(childVal);
      } else {
        return [childVal];
      }
    } else {
      return parentVal;
    }
  }

  LIFECYCLE_HOOKS.forEach(hook => {
    strats[hook] = mergeHook;
  });

  function mergeAssets(parentVal, childVal) {
    // 如果子类有components则直接获取，如果没有，则通过res.__proto__访问父类的components
    const res = Object.create(parentVal);

    if (childVal) {
      for (let key in childVal) {
        res[key] = childVal[key];
      }
    }

    return res;
  } // 组件的合并策略


  strats.components = mergeAssets;
  function mergeOptions$1(parent, child) {
    const option = {}; //以child为准

    for (let key in parent) {
      mergeField(key);
    } // 如果child的属性，parent中没有，需要遍历child


    for (let key in child) {
      if (!parent.hasOwnProperty(key)) {
        mergeField(key);
      }
    } // 默认的合并策略，有些属性需要特殊的合并方式，生命周期合并，会把所有的相同生命周期合并到一个数组中，然后依次执行


    function mergeField(key) {
      if (strats[key]) {
        return option[key] = strats[key](parent[key], child[key]);
      }

      if (typeof parent[key] === 'object' && typeof child[key] === 'object') {
        option[key] = { ...parent[key],
          ...child[key]
        };
      } else if (child[key] == null) {
        option[key] = parent[key];
      } else {
        option[key] = child[key];
      }
    }

    return option;
  }

  // 需要重写数组的某些方法 push pop shift unshift reverse sort splice,会导致数组本身发生变化
  // 首先要保存数组原先的方法
  const oldArrayMethods = Array.prototype; // 用户调用方法则是： value.__proto__ = arrayMethods
  // arrayMethods.__proto__ = oldArrayMethods

  const arrayMethods = Object.create(oldArrayMethods);
  const methods = ['push', 'shift', 'pop', 'unshift', 'reverse', 'sort', 'splice'];
  methods.forEach(method => {
    arrayMethods[method] = function (...args) {
      console.log(method, '调用'); // console.log(this)

      const result = oldArrayMethods[method].apply(this, args); // 调用原生方法，让数组的内容真正发生变化，并返回
      // push unshift 添加的元素也有可能是对象，所以需要对这操作元素的方法的传入数据的进行监测
      // splice, 如果传入三个参数时也需要进行监测

      let inserted; // 当前要插入的元素

      let ob = this.__ob__;

      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args; // 此时的args是个数组

          break;

        case 'splice':
          inserted = args.slice(2);
      }

      if (inserted) {
        ob.observerArray(inserted); // 将新增属性继续监测
      }

      ob.dep.notify(); // 如果用户调用了数组方法 我会通知当前这个dep去更新

      return result;
    };
  });

  let id = 0;

  class Dep {
    constructor() {
      this.id = id++;
      this.subs = [];
    }

    addSub(watcher) {
      this.subs.push(Dep.target);
    }

    depend() {
      // 此时的Dep.target就是watcher，现在这个处理方式会重复存放watcher
      // this.subs.push(Dep.target) // 观察者模式
      // 让这个watcher记住我当前的dep,
      // this就是Dep的实例
      // 通过在watcher里记住这个dep
      Dep.target.addDep(this);
    }

    notify() {
      this.subs.forEach(watcher => watcher.update());
    }

  }

  let stack = []; // 使用一个栈来保存watcher

  function pushTarget(watcher) {
    // 使用一个Dep静态属性来指向当前watcher
    Dep.target = watcher;
    stack.push(watcher);
  }
  function popTarget() {
    stack.pop();
    Dep.target = stack[stack.length - 1];
  }

  // 原理是使用object.defineProperty()

  class Observer {
    constructor(data) {
      this.dep = new Dep(); // 给数组用的
      // 如果是数组的话，不会对索引进行观测，因为会导致性能的问题
      // 如果元素是对象是，不给对象赋值的话，那么观测索引就没有什么意义，造成性能浪费
      // 因为数组对象中的属性也进行了观测
      // 需要在其他地方使用Observer的实例的方法或者属性，所以给监测的对象加一个属性__ob__表示该对象已经被监测
      // 后续可以知道该值是否是被监测过的
      // 这样子写为了防止调用栈溢出 this.observerArray

      def(data, '__ob__', this);

      if (Array.isArray(data)) {
        // 如果数组内是对象，再去监测
        // 数组调用方法时，会通过原型链进行查找，如果找到我们改写的方法，则直接使用，没有，则会继续向上查找
        data.__proto__ = arrayMethods;
        this.observerArray(data);
      } else {
        this.walk(data); // 对对象进行监控劫持
      }
    } // 对数组进行监控劫持


    observerArray(data) {
      for (let i = 0; i < data.length; i++) {
        // 监控数组的每一项
        observe(data[i]);
      }
    } // 对对象进行监控劫持


    walk(data) {
      let keys = Object.keys(data);

      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let value = data[key];
        defineReactive(data, key, value);
      }
    }

  }

  function defineReactive(data, key, value) {
    let dep = new Dep(); // 如果data的属性值是对象，则再进行数据劫持
    // 递归实现数据检测, 开发优化点： 不要嵌套太深的数据结构，不然性能会损耗

    let childob = observe(value); // 给数组的用的

    Object.defineProperty(data, key, {
      configurable: true,
      enumerable: true,

      get() {
        // 获取值的时候做一些操作
        // 每个属性都会有一个watcher
        // 每次取值的时候都把watcher存起来
        if (Dep.target) {
          // 如果当前有watcher
          dep.depend(); // 需要将watcher存起来，等到 数据更新的时候，再去执行watcher
          // 多次存入watcher时，就会重复存放所以需要去重
          // console.log(dep.subs)
          // console.log(childob, value)

          if (childob) {
            // 数组的依赖收集
            childob.dep.depend(); // 收集了数组的相关依赖

            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }

        return value;
      },

      set(newVal) {
        // 设置值的时候也可以做一些操作
        if (value === newVal) return;
        console.log('更新数据'); // 如果用户自定义的对象赋值给data中的属性，也要进行劫持

        observe(newVal);
        value = newVal;
        dep.notify(); // 通知依赖的watcher进行更新操作
      }

    });
  }

  function dependArray(value) {
    for (let i = 0; i < value.length; i++) {
      value[i].__ob__ && value[i].__ob__.dep.depend(); // 对数组中的数组进行依赖收集

      if (Array.isArray(value[i])) {
        dependArray(value[i]);
      }
    }
  }

  function observe(data) {
    // 判断data是否是对象
    let isObj = isObject(data);
    if (!isObj) return;
    return new Observer(data); // 因为功能比较多，使用类观测数据
  }

  function initState(vm) {
    const opts = vm.$options; // 初始化数据
    // vue的数据来源： 属性 方法 数据 计算属性 watch

    if (opts.props) ;

    if (opts.methods) ;

    if (opts.data) {
      initData(vm);
    }

    if (opts.computed) ;

    if (opts.watch) ;
  }

  function initData(vm) {
    // 数据改变视图更新
    let data = vm.$options.data; // 为了data是函数时，执行时不改变this的指向需要绑定this

    data = vm._data = typeof data === 'function' ? data.call(vm) : data; // 这里做一层代理，因为现在只能通过vm._data访问到data中的数据，希望通过vm.data访问，原理是
    // Object.defineProperty()

    for (let key in data) {
      proxy(vm, '_data', key);
    } // 监控数据，响应式原理


    observe(data);
  }

  // nextTick在vue源码中也有使用，所以实现把源码中的回调函数先放入队列中
  // 再把用户自定义的nextTick放入队列中
  let callbacks = [];
  let waiting = false;

  function flushCallback() {
    callbacks.forEach(callback => callback());
    waiting = false;
  } // 多次调用nextTick
  // waiting，等callbakcs里面的函数执行完之后，再去添加下一轮的回调函数
  // 如果没有waiting的话，就会一有callback就会执行回调函数


  function nextTick(cb) {
    callbacks.push(cb);

    if (!waiting) {
      setTimeout(flushCallback, 0);
      waiting = true;
    }
  }

  let queue = []; // 这里存放的等待更新视图的watcher

  let has = {}; // 判断是否已经有了该watcher

  function flushSchedularQueue() {
    queue.forEach(watcher => watcher.run());
    queue = [];
    has = {};
  }

  function queueWatcher(watcher) {
    let id = watcher.id;

    if (!has[id]) {
      queue.push(watcher);
      has[id] = true;
      nextTick(flushSchedularQueue); // setTimeout(flushSchedularQueue, 0)
    }
  }

  let id$1 = 0; // 给每一个watcher一个标识符

  class Watcher {
    constructor(vm, exprOrFn, callback, options) {
      this.vm = vm;
      this.callback = callback;
      this.options = options;
      this.id = id$1++;
      this.getter = exprOrFn; // 将内部传过来的回调函数，放到getter属性上

      this.depsId = new Set();
      this.deps = [];
      this.get(); // 调用get方法，会让渲染watcher执行
    }

    addDep(dep) {
      // watcher里不能放重复的dep，dep里不能放重复的watcher
      let id = dep.id;

      if (!this.depsId.has(id)) {
        this.depsId.add(id);
        this.deps.push(dep); // 然后再让dep里存放watcher

        dep.addSub(this);
      }
    }

    get() {
      // 在执行渲染watcher之前，把该watcher存起来，执行完后再抛出
      pushTarget(this);
      this.getter();
      popTarget();
    } // 现在是每次更新都会立即去渲染数据，需要改成等数据操作完成之后，再去更新视图，
    // 所以就是可以添加一个watcher队列，等所有的数据操作完成之后再去更新视图即再来调用this.get()


    update() {
      // console.log('update')
      // this.get()
      queueWatcher(this);
    }

    run() {
      // 这个函数是在等所有的数据操作完成之后再去更新视图
      this.get();
    }

  }

  function patch(oldNode, vnode) {
    // 递归创建真实节点，替换掉老的节点
    if (!oldNode) {
      // 此时是解析组件，因为组件在挂载时传入的参数为空
      return createElm(vnode);
    } else {
      const isRealElement = oldNode.nodeType; // 虚拟DOM没有这个属性，只有DOM上才有

      if (isRealElement) {
        /**
         * 首先找到当前元素的父元素，然后根据vnode创建真实DOM
         * 把创建的DOM插入到当前节点的下一个兄弟节点之前，然后在去删除当前节点
         * 这样子，就保证了插入新的节点在页面上位置不会发生变化
         */
        const oldElm = oldNode;
        const parentElm = oldElm.parentNode;
        let el = createElm(vnode); // console.log(el)

        parentElm.insertBefore(el, oldElm.nextSibling);
        parentElm.removeChild(oldElm);
        return el;
      } else {
        // 虚拟DOM的比对是在这里
        // 首先是老节点是经过createElm(vnode)生成真实DOM的
        // 而且真实节点是放到虚拟节点的vnode.el上的
        // console.log(oldNode, vnode)
        // 1.标签不一致直接替换即可
        // 替换的原理是：先找到当前节点的父节点，然后再用新生成的节点替换掉当前节点
        // createElm(vnode)创建了新的节点，并把真实节点放到vnode的el上，并且返回了vnode.el
        if (oldNode.tag !== vnode.tag) {
          oldNode.el.parentNode.replaceChild(createElm(vnode), oldNode.el);
        } // 2.如果文本呢？ 文本都没有tag 


        if (!oldNode.tag) {
          if (oldNode.text !== vnode.text) {
            oldNode.el.textContent = vnode.text;
          }
        } // 3. 说明标签一致而且不是文本了  (比对属性是否一致)
        // 先把老的节点保存到新的vnode的el属性上，为了在后面比较，老的oldNode的data中属性，与vnode.el真实节点的属性做对比
        // 如果老的有，新的没有，则删除老的节点上的属性，如果老的没有新的有，则添加到老的节点上


        let el = vnode.el = oldNode.el;
        updateProperties(vnode, oldNode.data); // 对于新老节点的标签名一样的，则去新老虚拟节点的孩子比对,根据比对的结果去更新el的内容

        let oldChildren = oldNode.children || [];
        let newChildren = vnode.children || [];

        if (oldChildren.length > 0 && newChildren.length > 0) {
          // 新老都有孩子，需要特殊比较，去更新el的内容，这也是diff算法的核心了
          // 这种是先让新老虚拟节点进行比较，然后把比较的结果更新到el上
          updateChildren(el, oldChildren, newChildren);
        } else if (newChildren.length > 0) {
          // 新的虚拟节点有孩子，老的没有，那么直接把新的虚拟节点的孩子转成
          // 真实的DOM，并且添加到el上
          for (let i = 0; i < newChildren.length; i++) {
            let child = newChildren[i];
            el.appendChild(createElm(child));
          }
        } else if (oldChildren.length > 0) {
          // 新的没有，老的有，则直接把老的去掉
          el.innerHTML = '';
        } // 最后就是新老都没有，则不做任何操作

      }
    }
  }

  function isSameVnode(newVnode, oldVnode) {
    return newVnode.tag === oldVnode.tag && newVnode.key === oldVnode.key;
  }

  function updateChildren(parent, oldChildren, newChildren) {
    // vue采用的是双指针进行比较
    // 思路：就是在新老虚拟节点的首尾设置一个指针，再去比较头指针所在的新老虚拟节点，不一样则替换，否则就是老的不变
    // 然后移动新老虚拟节点的头指针，再做比较
    // 直到新的或者老的头尾指针指向同一位置（即尾指针的地方），做比较
    // while循环结束是头指针指向尾指针的下一位
    let oldStartIndex = 0;
    let oldStartVnode = oldChildren[oldStartIndex];
    let oldEndIndex = oldChildren.length - 1;
    let oldEndVnode = oldChildren[oldEndIndex];
    let newStartIndex = 0;
    let newStartVnode = newChildren[newStartIndex];
    let newEndIndex = newChildren.length - 1;
    let newEndVnode = newChildren[newEndIndex];

    function makeIndexByKey(children) {
      let map = {};
      children.forEach((item, index) => {
        // 不存在key直接比较标签
        if (item.key) {
          map[item.key] = index;
        }
      });
      return map;
    }

    let map = makeIndexByKey(oldChildren); // diff算法对DOM的优化点：
    // 首先进行新老虚拟节点的头和头对比，
    // 不满足，则进行尾和尾对比
    // 不满足，则进行老虚拟节点的尾与新虚拟节点的头比较
    // 不满足，则进行老虚拟节点的头与新虚拟节点的尾比较
    // 不满足，则暴力对比
    // 都是以老节点为比较的基准

    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      // 这里做判断是因为在暴力对比的过程中，会把有些老的节点赋值为undefined
      if (oldStartVnode == undefined) {
        oldStartVnode = oldChildren[++oldStartIndex];
      } else if (oldEndVnode == undefined) {
        oldEndVnode = oldChildren[--oldEndIndex];
      } else {
        // 1. 新老头虚拟节点相同，（尾虚拟节点不相同） 说明是从老节点的尾部插入的新节点
        // 优化向后插入
        if (isSameVnode(newStartVnode, oldStartVnode)) {
          // 如果进来
          // 说明新老的标签名是相同的，然后就是要去比较属性并更新
          // 比较完成，则把头指针向后推移一位
          patch(oldStartVnode, newStartVnode);
          oldStartVnode = oldChildren[++oldStartIndex];
          newStartVnode = newChildren[++newStartIndex];
        } else if (isSameVnode(newEndVnode, oldEndVnode)) {
          // 优化向前插入
          // 2. 如果是从头部插入新的节点，则比较新老虚拟节点的尾指针指向的虚拟节点是否相同
          // 相同的话，比较虚拟节点，然后尾指针向前移动
          patch(oldEndVnode, newEndVnode);
          oldEndVnode = oldChildren[--oldEndIndex];
          newEndVnode = newChildren[--newEndIndex];
        } else if (isSameVnode(oldStartVnode, newEndVnode)) {
          // 开始交叉比较 这里必须把相同的那个节点移到新的虚拟节点对应老的节点的下一位的前面一位
          // 重点是要移动那个相同的老节点！！！！！
          // parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
          // 这一步是必须的
          // 然后在对比其他节点，如果符合上面的条件，则实现复用不需要移动节点
          // 老的尾虚拟节点和新的头虚拟节点相同
          // 头移尾
          patch(oldStartVnode, newEndVnode);
          parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
          newEndVnode = newChildren[--newEndIndex];
          oldStartVnode = oldChildren[++oldStartIndex];
        } else if (isSameVnode(oldEndVnode, newStartVnode)) {
          // 尾移头
          patch(oldEndVnode, newStartVnode);
          parent.insertBefore(oldEndVnode.el, oldStartVnode.el);
          oldEndVnode = oldChildren[--oldEndIndex];
          newStartVnode = newChildren[++newStartIndex];
        } else {
          // 暴力对比 乱序对比
          // 查找规则：先取出新的第一个虚拟节点，通过key在老的虚拟节点中查找是否存在
          // 在查找的过程中，以老的虚拟节点的开始索引为标准
          // 如果新的虚拟节点在老的中没有找到，则插入头指针（开始索引）所在的节点的前面一位
          // 如果新的虚拟节点在老的中找到，则直接复用老的节点，然后插入到头指针（开始索引）的前面一位，然后把老的节点赋值为null这样防止数组塌陷
          // 依次进行
          // 最后，看看头指针和尾指针之间是否还有老的节点存在，如果存在，则直接销毁
          // 先根据老节点的key做一个映射表，拿新的虚拟节点去映射表中查找，如果可以查找到，则进行移动操作（移到头指针
          // 的前面位置）如果找不到则直接将元素插入到头指针前面即可（即使头指针位置改变了，也是以头指针为准）
          let moveIndex = map[newStartVnode.key];

          if (!moveIndex) {
            // 映射表中不存在，就是不需要复用，则插入到头指针的前面
            parent.insertBefore(createElm(newStartVnode), oldStartVnode.el);
          } else {
            // 这种情况是可以复用，但是不在上面四种比较的情况下（如果在的话，就会直接对比移动）
            // 找到了，就把老的节点移到头指针前面，并且把当前位置变为null
            let moveVnode = oldChildren[moveIndex];
            oldChildren[moveIndex] = undefined;
            parent.insertBefore(moveVnode.el, oldStartVnode.el); // 再把这个节点和新的节点做对比

            patch(moveVnode, newStartVnode);
          } // 把头指针向后移动一位


          newStartVnode = newChildren[++newStartIndex]; // 然后比较完后，如果老的头指针和尾指针之间还有节点，则删除掉
        }
      }
    } // console.log(newStartIndex, newEndIndex)
    // console.log(newStartIndex, newEndIndex)
    // 1. 比较完成，如果新的虚拟节点还有剩余，则直接添加到父元素上
    // 这里的小于等于要注意，因为在while循环中，开始的索引和尾索引重合了


    if (newStartIndex <= newEndIndex) {
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        /**
         * 这里是因为appendChild()只能在元素的后面插入，如果是从头节点插入就不符合
         * insertBefore(target, base), 如果第二个参数传入的是null则就会从最后插入元素
         * 否则则会插入某个元素的前面
         * 这个需要判断一下，如果是从后面插入，则需要找到老的节点的最后一位的下一位是什么，
         * （因为oldEndIndex已经指向最后一个节点，所以oldEndIndex + 1 就是老的节点的最后一个的下一位即为null
         * 如果是从头插入节点，则需要获取到老节点的第一个节点（oldChildren[oldStartIndex]）是虚拟节点，要获取该虚拟节点上el属性此为真实节点（oldChildren[oldStartIndex].el），然后插入新创建的节点
         */
        let el = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el; // console.log(el)

        parent.insertBefore(createElm(newChildren[i]), el);
      }
    } //然后比较完后，如果老的头指针和尾指针之间还有节点，则删除掉


    if (oldStartIndex <= oldEndIndex) {
      for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        if (oldChildren[i] != undefined) {
          parent.removeChild(oldChildren[i].el);
        }
      }
    }
  }

  function createComponent(vnode) {
    let i = vnode.data; // HTML标签是没有hook这个属性的

    if ((i = i.hook) && (i = i.init)) {
      i(vnode);
    } // console.log(vnode)
    // 当init执行完毕之后


    if (vnode.componentInstance) {
      // 说明组件已经创建了该实例
      return true;
    }
  }

  function createElm(vnode) {
    // 根据虚拟节点创建真实节点
    // 是标签还是文本
    let {
      tag,
      children,
      data,
      key,
      text
    } = vnode;

    if (typeof tag === 'string') {
      // tag可能是HTML标签，也可能是组件名
      // 实例化组件
      // console.log(createComponent(vnode))
      if (createComponent(vnode)) {
        // 组件名
        // 这里返回的是真实DOM
        return vnode.componentInstance.$el;
      } // 标签


      vnode.el = document.createElement(tag);
      updateProperties(vnode);
      vnode.children.forEach(child => {
        return vnode.el.appendChild(createElm(child));
      });
    } else {
      // 虚拟DOM上映射真实DOM，方便后续操作
      vnode.el = document.createTextNode(text);
    }

    return vnode.el;
  }

  function updateProperties(vnode, oldProps = {}) {
    const newProps = vnode.data || {}; // console.log(newProps, oldProps)
    // 把属性放到当前节点 vnode.el

    const el = vnode.el;

    for (let i in oldProps) {
      if (!newProps[i]) {
        el.removeAttribute(i);
      }
    }

    let newStyle = newProps.style || {};
    let oldStyle = oldProps.style || {};

    for (let i in oldStyle) {
      if (!newStyle[i]) {
        el.style[i] = '';
      }
    } // console.log(newProps)


    for (let key in newProps) {
      // 属性为style或者是class的需要特殊处理
      if (key === 'style') {
        for (let styleName in newProps.style) {
          el.style[styleName] = newProps.style[styleName];
        }
      } else if (key === 'class') {
        el.className = newProps.class;
      } else {
        el.setAttribute(key, newProps[key]);
      }
    }
  }

  function lifecycleMixin(Vue) {
    Vue.prototype._update = function (vnode) {
      // 返回的是真实的DOM
      const vm = this; // 首先第一次渲染的时候是不会进行diff算法比对的
      // 所以应该先记下上一次的虚拟节点
      // 把上次的虚拟节点放在vm实例上作为标记

      let prevVnode = vm._vnode;
      vm._vnode = vnode; // 此时的vnode上真实的DOM（el属性上）

      /**
       * _vnode 与 $vnode区别：
       * _vnode 对应的就是这个组件本身渲染的内容（是组件里的内容，不是组件的）
       * $vnode代表的是组件的虚拟节点（{tag: 'my-compontne-',....},不是组件内的，
       * 就是内部根据这个组件标签创建的虚拟节点
       * 
       * 关系： this._vnode.parent === this.$vnode
       */

      if (!prevVnode) {
        // 通过虚拟节点，渲染出真实的DOM， 然后替换掉真实的$el
        vm.$el = patch(vm.$el, vnode); // 这里是新旧做比对    
      } else {
        vm.$el = patch(prevVnode, vnode);
      } // // 通过虚拟节点，渲染出真实的DOM， 然后替换掉真实的$el
      // vm.$el = patch(vm.$el, vnode) // 这里是新旧做比对

    };
  }
  function mountComponent(vm, el) {
    const options = vm.$options; // 有render函数

    vm.$el = el; // 真实的DOM元素,是页面上获取的DOM（旧的）
    // 渲染页面
    // 在渲染页面之前，调用一下

    callHook(vm, 'beforeMount'); // 这个时候可以拿到这是的DOM但是数据并没有渲染上去
    // Watcher是用来渲染的
    // vm._render 通过解析的render方法 返回的是虚拟dom，
    // vm_update返回的是真实的dom

    let updataComponent = () => {
      // 无论是更新还是渲染都会用到此方法
      // vm._render 返回的是虚拟dom，vm_update返回的是真实的dom（现在是新的，并且数据都已经填充完成）
      // console.log('update') // queueWatcher验证
      vm._update(vm._render()); // 只有第一次才会解析成AST语法树，后面的更新，只会去做比对然后更新

    }; // 然后在一个Watcher类，调用updataComponent函数
    // 渲染watcher，每个组件都有一个watcher


    new Watcher(vm, updataComponent, () => {}, true); // true表示它是一个渲染watcher
    // 在渲染页面之后，调用一下

    callHook(vm, 'mounted'); // 这个时候数据完成了渲染
  }
  function callHook(vm, hook) {
    // 现在hook是用户在vue文件中自定义传入的钩子函数
    const hanlders = vm.$options[hook];

    if (hanlders) {
      for (let i = 0; i < hanlders.length; i++) {
        hanlders[i].call(vm);
      }
    }
  }

  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // abc-aaa

  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // <aaa:asdads>

  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则 捕获的内容是标签名

  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>

  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的

  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 >  <div>

  function parseHTML(html) {
    let root = null; // ast语法树根节点

    let currentParent = null; // 标记当前元素的父元素

    let stack = []; // 栈用来保存创建好的ast节点，为了在匹配结束标签的时候，看看是否匹配的上（即元素是否正确闭合）利用栈的特性（遇到结束标签，抛出栈顶元素）

    const ELEMENT_TYPE = 1;
    const TEXT_TYPE = 3; // 根据元素创建ast树的节点 

    function createASTElement(tagName, attrs) {
      return {
        tag: tagName,
        type: ELEMENT_TYPE,
        attrs,
        children: [],
        parent: null
      };
    }

    function start(tagName, attrs) {
      // console.log('开始标签：', tagName, attrs)
      let element = createASTElement(tagName, attrs); // console.log(currentParent)
      // 先查看根节点是否存在，

      if (!root) {
        root = element;
      } // 开始标签可以看成是父级标签
      // 把当前元素标记成父ast树


      currentParent = element;
      stack.push(element);
    }

    function chars(text) {
      // console.log('文本是：',text)
      // 文本标签肯定是子元素
      text = text.replace(/\s/g, '');

      if (text) {
        currentParent.children.push({
          text,
          type: TEXT_TYPE
        });
      }
    } //  <div><p></p></div>  ['div', 'p']


    function end(tagName) {
      // console.log('结束标签：', tagName)
      // 这里开始匹配标签闭合是否正确, 抛出栈顶元素
      let element = stack.pop();

      if (element) {
        if (element.tag === tagName) {
          // 获取栈内最后一个元素，此元素是抛出元素的父元素
          currentParent = stack[stack.length - 1]; // console.log(currentParent)

          if (currentParent) {
            element.parent = currentParent;
            currentParent.children.push(element);
          }
        }
      }
    } // 不停的解析html字符串


    while (html) {
      let textEnd = html.indexOf('<'); // 如果是0的话，说明匹配的可能是开始标签或者是结束标签，但都是代表着标签的开始

      if (textEnd === 0) {
        let startTagMatch = parseStartTag(); // 这个方法是用来匹配标签名和属性的

        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs); // console.log(startTagMatch)

          continue; // 如果匹配的是开始标签就继续在匹配
        }

        let endTagMatch = html.match(endTag);

        if (endTagMatch) {
          advance(endTagMatch[0].length);
          end(endTagMatch[1]);
          continue;
        }
      } // 如果textEnd>=0的话，说明是一段文本


      let text = '';

      if (textEnd >= 0) {
        text = html.substring(0, textEnd);
      }

      if (text) {
        chars(text);
        advance(text.length); // console.log(html, textEnd)
        // break
      }
    }

    function advance(n) {
      html = html.substring(n);
    }

    function parseStartTag() {
      let start = html.match(startTagOpen);

      if (start) {
        // 开始组装数据
        const match = {
          tagName: start[1],
          attrs: []
        }; // 匹配标签名完成，删除

        advance(start[0].length); // 然后再去匹配属性
        // 匹配属性，需要注意标签内是否有属性

        let end = null;
        let attr = null;

        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5]
          });
          advance(attr[0].length);
        } // end匹配的开始标签的'>', 如果匹配到，则表示这个标签匹配完成


        if (end) {
          advance(end[0].length);
          return match;
        }
      } // console.log(start)
      // console.log(html)

    }

    return root;
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

  function genProps(attrs) {
    let str = '';

    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];

      if (attr.name === 'style') {
        // style特殊处理
        let obj = {};
        let styleValue = attr.value.split(';');
        styleValue.forEach(item => {
          let [key, value] = item.trim().split(':');
          obj[key] = value && value.trim();
        });
        attr.value = obj;
      }

      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }

    return `{${str.slice(0, -1)}}`;
  }

  function genChildren(el) {
    let children = el.children;

    if (children && children.length) {
      return `${children.map(c => gen(c)).join(',')}`;
    } else {
      return false;
    }
  }

  function gen(node) {
    if (node.type === 1) {
      return generate(node);
    } else {
      // 现在是文本和变量
      let text = node.text; // <div>a {{  name  }} b{{age}} c</div>里面的text，a {{  name  }} b{{age}} c

      let tokens = [];
      let match = null;
      let index = null; // 只要是全局匹配 就需要将lastIndex每次匹配的时候调到0处 正则匹配的懒惰性

      let lastIndex = defaultTagRE.lastIndex = 0;

      while (match = defaultTagRE.exec(text)) {
        index = match.index;

        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }

        tokens.push(`_s(${match[1].trim()})`);
        lastIndex = index + match[0].length;
      } // console.log(defaultTagRE.exec(text))
      // 这里匹配的是最后的文本 “ c”


      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }

      return `_v(${tokens.join('+')})`;
    }
  }

  function generate(el) {
    let children = genChildren(el);
    let code = `_c("${el.tag}", ${el.attrs.length ? genProps(el.attrs) : 'undefined' // 逗号写在里面是为了，没有孩子的时候，不需要逗号
  }${children ? `,${children}` : ''})`;
    return code;
  }

  // ast语法树是用对象来描述原生语法的，虚拟DOM是用对象来描述DOM节点的
  function compileToFunction(template) {
    // 解析HTML字符串，就是用正则去匹配HTML的内容，匹配到了，则就删除在HTML中的对应内容，然后在进行下一次匹配，依次循环
    // 然后再去解析成ast语法树
    let root = parseHTML(template); // console.log(root)
    // 需要把ast语法树生成render函数 就是字符串的拼接，模版引擎
    // 核心思路就是将模版转化成下面这段字符串
    // <div id="app"><p>hello {{name}}</p> hello</div>
    // 将ast树再次转化成js语法
    // _c: 第一个参数是标签名，第二参数是属性，第三个参数是子元素
    // _c("div", {id: app}, _c("p", undefined, _v("hello" + _s(name))), _v("hello"))

    let code = generate(root); // _c("div",{id:app},_c("p",undefined,_v('hello' + _s(name) )),_v('hello')) 
    // 所有的模板引擎实现 都需要new Function + with
    // 步骤： 拼接字符串， 添加with， new Function生成函数

    let renderFn = new Function(`with(this){ return ${code} }`); // console.log(renderFn)

    return renderFn;
  }

  // 在Vue原型上添加一个init方法
  function initMixin(Vue) {
    Vue.prototype._init = function (options) {
      // 数据劫持
      const vm = this; // 将用户传递的，和全局的进行合并
      // vm.constructor.options保证了谁调用就用谁的options，不一定是Vue上的 

      vm.$options = mergeOptions$1(vm.constructor.options, options); // 此时已经合并完生命周期了，然后就需要在某个时期，调用一下存好的钩子函数就可以了
      // 就是callHoook,
      // console.log(vm.$options)

      callHook(vm, 'beforeCreate');
      initState(vm);
      callHook(vm, 'created'); // 开始挂载渲染页面
      // 如果用户传入了el属性，需要将页面渲染出来
      // 如果用户传入了el属性，就要实现挂载流程

      if (vm.$options.el) {
        vm.$mount(vm.$options.el);
      }
    }; // 实现挂载流程


    Vue.prototype.$mount = function (el) {
      const vm = this;
      const options = vm.$options; // 获取el元素

      el = document.querySelector(el); // 默认先查找有没有render方法，没有，则会采用template， template也没有的话
      // 就用el的内容代替template
      // render-> template -> el

      if (!options.render) {
        // 如果用户自己写的render函数则使用，没有则需要把模版进行编译然后在赋值给options上的render
        // 对模版进行编译
        let template = options.template; // 如果没有template的话就把el当作template

        if (!template && el) {
          template = el.outerHTML;
        } // 然后就需要把template转换成render方法


        const render = compileToFunction(template);
        options.render = render;
      } // 开始渲染当前组件，并挂载这个组件


      mountComponent(vm, el);
    };

    Vue.prototype.$nextTick = nextTick;
  }

  function createElement(vm, tag, data = {}, ...children) {
    // console.log(vm, tag, data, children)
    let key = data.key;

    if (key) {
      delete data.key;
    } // 因为有自定义的组件，所以需要特殊处理一下组件


    if (isReservedTag(tag)) {
      return vnode(tag, data, key, children, undefined);
    } else {
      // 组件
      // 如何获取组件的内容的，可以通过$options.components和tag判断全局下是否有该组件
      // 然后就可以找到子组件的构造函数
      let Ctor = vm.$options.components[tag];
      return createComponent$1(vm, tag, data, key, children, Ctor);
    }
  }

  function createComponent$1(vm, tag, data, key, children, Ctor) {
    // 这里做判断是因为如果是子组件内注册的组件，此时是对象，所以需要转成构造函数
    if (isObject(Ctor)) {
      Ctor = vm.$options._base.extend(Ctor);
    } // 在创建组件的时候，给data添加组件初始化的钩子函数
    // 为了可以初始化组件


    data.hook = {
      init(vnode) {
        // 当前实例就是 componentInstance
        let child = vnode.componentInstance = new Ctor({
          _isComponent: true
        });
        child.$mount(); // 这里是对组件进行挂载，但是没有根元素
      },

      inserted() {}

    };
    return vnode(`vue-component-${Ctor.cid}-${tag}`, data, key, undefined, {
      Ctor,
      children
    });
  }

  function createTextNode(vm, text) {
    // console.log(text)
    return vnode(undefined, undefined, undefined, undefined, text);
  }

  function vnode(tag, data, key, children, text, componentOptions) {
    return {
      tag,
      data,
      key,
      children,
      text,
      componentOptions
    };
  } // 虚拟节点 就是通过_c _v实现用对象描述DOM的操作（本质上还是对象）
  // 1）将template转换成ast语法树 -> 生成render方法 -> 生成虚拟DOOM -> 真实的DOM
  //    更新： 重新生成虚拟DOM -> 更新DOM

  function renderMixin(Vue) {
    // 还是为了Vue原型上添加方法，方便在其他地方使用
    // _c 创建元素虚拟节点 参数：tag, props, children
    // _v 创建文本的虚拟节点
    // _s JSON.stringify()
    Vue.prototype._c = function () {
      return createElement(this, ...arguments); // _c内有由ast树组合的参数,如果不明白参数请看compiler/index下的render
    };

    Vue.prototype._v = function (text) {
      return createTextNode(this, text);
    };

    Vue.prototype._s = function (val) {
      // 这里的参数传入的是变量，所以根据变量的类型，转成字符串
      return val == null ? '' : typeof val === 'object' ? JSON.stringify(val) : val;
    };

    Vue.prototype._render = function () {
      // 首先获取实例
      const vm = this;
      const {
        render
      } = vm.$options; // console.log(render)
      //这里是执行之前生成的render函数，还需要传入当前的实例，with(this)， 获取到实例上对应的值
      // 太重要了！！！

      let vnode = render.call(vm); // 这里执行了，with特性，所以变量都可以获取到data中的值
      // console.log(vnode)

      return vnode;
    };
  }

  function initMixin$1(Vue) {
    Vue.mixin = function (mixin) {
      // 合并现有的全局上的options， 和传入的mixin对象
      // 如何实现两个对象的合并
      this.options = mergeOptions(this.options, mixin);
    }; // 生命周期合并策略
    // Vue.mixin({
    //   a: 1, 
    //   beforeCreate() {
    //     console.log('mixin 1')
    //   }
    // })
    // Vue.mixin({
    //   b: 2, 
    //   a: 4,
    //   beforeCreate() {
    //     console.log('mixin 2')
    //   }
    // })
    // console.log(Vue.options)

  }

  function initExtend(Vue) {
    let cid = 0;

    Vue.extend = function (extendOptions) {
      // 父组件在初始化的时候会调用_init(options)，同样，子类也要调用_init初始化自己的内容
      // 但是子类以后自己扩展的内容必须为自己所有，又要获取父类上的内容，所以继承可以实现
      const Sub = function VueComponent(options) {
        // 子类初始化自己的内容，
        this._init(options);
      };

      Sub.cid = cid++;
      Sub.prototype = Object.create(this.prototype);
      Sub.prototype.constructor = Sub; // 同样也需要把父类的options 和子类传入的extendOptions，添加在子类（子组件）上options

      Sub.options = mergeOptions$1(this.options, extendOptions); // 这里返回Sub子类，参考Vue.extend()用法

      return Sub;
    };
  }

  const ASSETS_TYPE = ['component', 'filter', 'directive'];

  function initAssetRegister(Vue) {
    // 这里是因为Vue.component Vue.filter Vue.directive的参数类型一样的
    // id就是名称
    ASSETS_TYPE.forEach(type => {
      Vue[type] = function (id, definition) {
        if (type === 'component') {
          // 注册全局组件的函数
          // 需要使用Vue.extend函数，把对象变成构造函数
          // 这里一定要保证调用extend的是父类，而不是子类（子组件）因为子组件中也会childComponent.component()
          // 所以 this.options._base.extend 也可以Vue.extend 有可能其他地方没有传入Vue则可以使用this.options._base代替父类
          definition = this.options._base.extend(definition);
        } // 前面的逻辑执行完，还需要把这些加入到Vue.options上去


        this.options[type + 's'][id] = definition;
      };
    });
  }

  function initGlobalAPI(Vue) {
    // 整合了所有的全局相关的内容
    Vue.options = {};
    initMixin$1(Vue); // 初始化的components filters directives都会放在Vue.options上，
    // Vue.options.components = {}
    // Vue.options.filters = {}
    // Vue.options.directives = {}
    // 所以可以使用一个数组分别添加到options上，但是又由于Vue.component()...这样子注册
    // 所以数组内存放的是单数 （可以实现复用这三个对象的内容）
    // 放到options上是为了更好的区分，哪些方法子类的，哪些是父类的

    ASSETS_TYPE.forEach(type => {
      Vue.options[`${type}s`] = {};
    });
    Vue.options._base = Vue; // _base就是Vue的构造函数，以供在其他没有传入Vue地方获取到构造函数

    initExtend(Vue); // 初始化全局函数 Vue.component Vue.filter Vue.directive

    initAssetRegister(Vue);
  }

  function Vue(options) {
    this._init(options);
  } // 通过引入文件方式给Vue原型上添加方法
  // 也就是可以通过Vue实例就可以访问的


  initMixin(Vue);
  renderMixin(Vue);
  lifecycleMixin(Vue); // 下面是给Vue添加方法
  // Vue添加全局变量和函数，也就是静态方法
  // 初始化全局API

  initGlobalAPI(Vue);
  // import {createElm, patch} from './vdom/patch'
  // let vm1 = new Vue({
  //   data: {
  //     name: 'old node'
  //   }
  // })
  // let render1= compileToFunction(`<div id="app1" a="2" style="background: red;">
  //   <div style="background: red;" key="A">A</div>
  //   <div style="background: blue;" key="B">B</div>
  //   <div style="background: yellow;" key="C">C</div>
  // </div>`)
  // let vnode1 = render1.call(vm1)
  // let el1 = createElm(vnode1)
  // document.body.appendChild(el1)
  // // console.log(vnode1)
  // let vm2 = new Vue({
  //   data: {
  //     name: 'new node'
  //   }
  // })
  // let render2= compileToFunction(`<div id="app2" b="3" style="color: blue;">
  // <div style="background: red;" key="Q">Q</div>
  //   <div style="background: red;" key="A">A</div>
  //   <div style="background: blue;" key="F">F</div>
  //   <div style="background: yellow;" key="C">C</div>
  // <div style="background: green;" key="N">N</div>
  // </div>`)
  // let vnode2 = render2.call(vm2)
  // setTimeout(() => { patch(vnode1, vnode2) }, 3000)
  // patch(vnode1, vnode2) // 传入两个虚拟节点，会在内部进行比较
  // diff算法特点：
  // 1. 平级比较，我们操作节点时，很少会涉及到父变成子，子变成父的（O(n*n*n)）

  return Vue;

})));
//# sourceMappingURL=vue.js.map
