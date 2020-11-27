// 在Vue原型上添加一个init方法
// 暴露出去是为了index.js文件可以引入这样子就很清晰每一块的作用
import {initState} from './state'

import { mountComponent, callHook } from './lifecycle'
import { mergeOptions } from './utils/index'

import { compileToFunction } from './compiler/index'
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    // 数据劫持

    const vm =  this
    // 将用户传递的，和全局的进行合并
    // vm.constructor.options保证了谁调用就用谁的options，不一定是Vue上的 
    vm.$options =  mergeOptions(vm.constructor.options, options)
    // 此时已经合并完生命周期了，然后就需要在某个时期，调用一下存好的钩子函数就可以了
    // 就是callHoook,
    // console.log(vm.$options)
    callHook(vm, 'beforeCreate')

    initState(vm)

    callHook(vm, 'created')

    // 开始挂载渲染页面
    // 如果用户传入了el属性，需要将页面渲染出来
    // 如果用户传入了el属性，就要实现挂载流程
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }

  // 实现挂载流程
  Vue.prototype.$mount = function(el) {
    const vm = this
    const options = vm.$options
    // 获取el元素
    el = document.querySelector(el)

    // 默认先查找有没有render方法，没有，则会采用template， template也没有的话
    // 就用el的内容代替template
    // render-> template -> el

    if(!options.render) {
      // 如果用户自己写的render函数则使用，没有则需要把模版进行编译然后在赋值给options上的render
      // 对模版进行编译
      let template = options.template
      if(!template && el) {
        template = el.outerHTML
        // 然后就需要把template转换成render方法
        const render = compileToFunction(template)
        options.render = render
      }
    }

    // 开始渲染当前组件，并挂载这个组件
    mountComponent(vm, el)

  }

}