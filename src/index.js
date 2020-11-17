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