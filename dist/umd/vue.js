(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

  function isObject(data) {
    return typeof data === 'object' && typeof data !== null;
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
  function mergeOptions(parent, child) {
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
      console.log(method, '调用');
      const result = oldArrayMethods[method].apply(this, args); // 调用原生方法，让数组的内容真正发生变化，并返回
      // push unshift 添加的元素也有可能是对象，所以需要对这操作元素的方法的传入数据的进行监测
      // splice, 如果传入三个参数时也需要进行监测

      let inserted; // 当前要插入的元素

      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args; // 此时的args是个数组

          break;

        case 'splice':
          inserted = args.slice(2);
      }

      if (inserted) {
        this.__ob__.observerArray(inserted);
      }

      return result;
    };
  });

  let id = 0;

  class Dep {
    constructor() {
      this.id = id++;
      this.subs = [];
    }

    depend() {
      this.subs.push(Dep.target); // 观察者模式
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
      if (Array.isArray(data)) {
        // 如果是数组的话，不会对索引进行观测，因为会导致性能的问题
        // 如果元素是对象是，不给对象赋值的话，那么观测索引就没有什么意义，造成性能浪费
        // 因为数组对象中的属性也进行了观测
        // 需要在其他地方使用Observer的实例的方法或者属性，所以给监测的对象加一个属性__ob__表示该对象已经被监测
        // 后续可以知道该值是否是被监测过的
        // 这样子写为了防止调用栈溢出 this.observerArray
        def(data, '__ob__', this); // 如果数组内是对象，再去监测
        // 数组调用方法时，会通过原型链进行查找，如果找到我们改写的方法，则直接使用，没有，则会继续向上查找

        data.__proto__ = arrayMethods;
        this.observerArray(data);
      } else {
        this.walk(data); // 对对象进行监控劫持
      }
    }

    observerArray(data) {
      for (let i = 0; i < data.length; i++) {
        // 监控数组的每一项
        observe(data[i]);
      }
    }

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

    observe(value); // 递归实现数据检测, 开发优化点： 不要嵌套太深的数据结构，不然性能会损耗

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

  let id$1 = 0; // 给每一个watcher一个标识符

  class Watcher {
    constructor(vm, exprOrFn, callback, options) {
      this.vm = vm;
      this.callback = callback;
      this.options = options;
      this.id = id$1++;
      this.getter = exprOrFn; // 将内部传过来的回调函数，放到getter属性上

      this.get(); // 调用get方法，会让渲染watcher执行
    }

    get() {
      // 在执行渲染watcher之前，把该watcher存起来，执行完后再抛出
      pushTarget(this);
      this.getter();
      popTarget();
    }

    update() {
      this.get();
    }

  }

  function patch(oldNode, vnode) {
    // console.log(oldNode, vnode)
    // 递归创建真实节点，替换掉老的节点
    const isRealElement = oldNode.nodeType; // 虚拟DOM没有这个属性，只有DOM上才有

    if (isRealElement) {
      /**
       * 首先找到当前元素的父元素，然后根据vnode创建真实DOM
       * 把创建的DOM插入到当前节点的下一个兄弟节点之前，然后在去删除当前节点
       * 这样子，就保证了插入新的节点在页面上位置不会发生变化
       */
      const oldElm = oldNode;
      const parentElm = oldElm.parentNode;
      let el = createElm(vnode);
      parentElm.insertBefore(el, oldElm.nextSibling);
      parentElm.removeChild(oldElm);
      return el;
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
        // 标签
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

    function updateProperties(vnode) {
      const newProps = vnode.data; // 把属性放到当前节点 vnode.el

      const el = vnode.el;
      console.log(newProps);

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
  }

  function lifecycleMixin(Vue) {
    Vue.prototype._update = function (vnode) {
      // 返回的是真实的DOM
      const vm = this; // 通过虚拟节点，渲染出真实的DOM， 然后替换掉真实的$el

      vm.$el = patch(vm.$el, vnode); // 这里是新旧做比对
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
      vm._update(vm._render()); // 只有第一次才会解析成AST语法树，后面的更新，只会去做比对然后更新

    }; // 然后在一个Watcher类，调用updataComponent函数
    // 渲染watcher，每个组件都有一个watcher


    new Watcher(vm, updataComponent, () => {}, true); // true表示它是一个渲染watcher
    // 在渲染页面之后，调用一下

    callHook(vm, 'mounted'); // 这个时候数据完成了渲染
  }
  function callHook(vm, hook) {
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

      vm.$options = mergeOptions(vm.constructor.options, options); // 此时已经合并完生命周期了，然后就需要在某个时期，调用一下存好的钩子函数就可以了
      // 就是callHoook,

      console.log(vm.$options);
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
        let template = options.template;

        if (!template && el) {
          template = el.outerHTML; // 然后就需要把template转换成render方法

          const render = compileToFunction(template);
          options.render = render;
        }
      } // 开始渲染当前组件，并挂载这个组件


      mountComponent(vm, el);
    };
  }

  function createElement(tag, data = {}, ...children) {
    // console.log(tag, data, children)
    let key = data.key;

    if (key) {
      delete data.key;
    }

    return vnode(tag, data, key, children, undefined);
  }
  function createTextNode(text) {
    // console.log(text)
    return vnode(undefined, undefined, undefined, undefined, text);
  }

  function vnode(tag, data, key, children, text) {
    return {
      tag,
      data,
      key,
      children,
      text
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
      return createElement(...arguments); // _c内有由ast树组合的参数,如果不明白参数请看compiler/index下的render
    };

    Vue.prototype._v = function (text) {
      return createTextNode(text);
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

  function initGlobalAPI(Vue) {
    // 整合了所有的全局相关的内容
    Vue.options = {};

    Vue.mixin = function (mixin) {
      // 合并现有的全局上的options， 和传入的mixin对象
      // 如何实现两个对象的合并
      this.options = mergeOptions(this.options, mixin);
    }; // 生命周期合并策略


    Vue.mixin({
      a: 1,

      beforeCreate() {
        console.log('mixin 1');
      }

    });
    Vue.mixin({
      b: 2,
      a: 4,

      beforeCreate() {
        console.log('mixin 2');
      }

    });
    console.log(Vue.options);
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

  return Vue;

})));
//# sourceMappingURL=vue.js.map
