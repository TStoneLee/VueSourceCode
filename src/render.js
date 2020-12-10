import { createElement, createTextNode } from './vdom/create-element'

export function renderMixin(Vue) {
  // 还是为了Vue原型上添加方法，方便在其他地方使用

  // _c 创建元素虚拟节点 参数：tag, props, children
  // _v 创建文本的虚拟节点
  // _s JSON.stringify()

  Vue.prototype._c = function () {
    return createElement(this, ...arguments) // _c内有由ast树组合的参数,如果不明白参数请看compiler/index下的render
  }

  Vue.prototype._v = function (text) {
    return createTextNode(this, text)
  }

  Vue.prototype._s = function (val) {
    // 这里的参数传入的是变量，所以根据变量的类型，转成字符串
    return val == null ? '' : (typeof val === 'object' ? JSON.stringify(val) : val)
  }

  Vue.prototype._render = function () {
    // 首先获取实例
    const vm = this
    const { render } = vm.$options

    
    // console.log(render)
    //这里是执行之前生成的render函数，还需要传入当前的实例，with(this)， 获取到实例上对应的值
    // 太重要了！！！
    let vnode = render.call(vm) // 这里执行了，with特性，所以变量都可以获取到data中的值
    // console.log(vnode)
    return vnode
  }
}