import { initMixin } from './init'
import { renderMixin } from './render'
import { lifecycleMixin } from './lifecycle'

import { initGlobalAPI }  from './initGlobalAPI/index'

// index.js vue入口文件
function Vue (options) {
  this._init(options)
}

// 通过引入文件方式给Vue原型上添加方法
// 也就是可以通过Vue实例就可以访问的
initMixin(Vue)
renderMixin(Vue)
lifecycleMixin(Vue)



// 下面是给Vue添加方法
// Vue添加全局变量和函数，也就是静态方法

// 初始化全局API
initGlobalAPI(Vue)

export default Vue


// import {compileToFunction} from './compiler/index'
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