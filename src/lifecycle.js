import Watcher from './observer/watcher'
import { patch } from './vdom//patch'
export function lifecycleMixin(Vue) {
  Vue.prototype._update = function (vnode) {
    // 返回的是真实的DOM

    const vm = this
    // 通过虚拟节点，渲染出真实的DOM， 然后替换掉真实的$el
    vm.$el = patch(vm.$el, vnode) // 这里是新旧做比对

  }
} 


export function mountComponent(vm, el) {
  const options = vm.$options // 有render函数
  vm.$el = el // 真实的DOM元素,是页面上获取的DOM（旧的）

  // 渲染页面

  // 在渲染页面之前，调用一下
  callHook(vm, 'beforeMount') // 这个时候可以拿到这是的DOM但是数据并没有渲染上去
  
  // Watcher是用来渲染的
  // vm._render 通过解析的render方法 返回的是虚拟dom，
  // vm_update返回的是真实的dom
  let updataComponent = () => { // 无论是更新还是渲染都会用到此方法

    // vm._render 返回的是虚拟dom，vm_update返回的是真实的dom（现在是新的，并且数据都已经填充完成）


    console.log('update') // queueWatcher验证
    vm._update(vm._render())

    // 只有第一次才会解析成AST语法树，后面的更新，只会去做比对然后更新
  }

  // 然后在一个Watcher类，调用updataComponent函数

  // 渲染watcher，每个组件都有一个watcher
  new Watcher(vm, updataComponent, () => {}, true) // true表示它是一个渲染watcher

  // 在渲染页面之后，调用一下
  callHook(vm, 'mounted')// 这个时候数据完成了渲染
}

export function callHook (vm, hook) {
  // 现在hook是用户在vue文件中自定义传入的钩子函数
  const hanlders = vm.$options[hook]
  if (hanlders) {
    for (let i = 0; i < hanlders.length; i++) {
      hanlders[i].call(vm)
    }
  }
}