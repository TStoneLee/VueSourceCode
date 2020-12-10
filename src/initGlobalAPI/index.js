import { mergeOptions } from '../utils/index'
import initMixin from './mixin'
import initExtend from './extend'
import initAssetRegister from './assets'
import { ASSETS_TYPE } from './const'

export function initGlobalAPI (Vue) {
  // 整合了所有的全局相关的内容
  Vue.options = {}

  initMixin(Vue)

  // 初始化的components filters directives都会放在Vue.options上，
  // Vue.options.components = {}
  // Vue.options.filters = {}
  // Vue.options.directives = {}
  // 所以可以使用一个数组分别添加到options上，但是又由于Vue.component()...这样子注册
  // 所以数组内存放的是单数 （可以实现复用这三个对象的内容）

  // 放到options上是为了更好的区分，哪些方法子类的，哪些是父类的
  ASSETS_TYPE.forEach(type => {
    Vue.options[`${type}s`] = {}
  })

  Vue.options._base = Vue // _base就是Vue的构造函数，以供在其他没有传入Vue地方获取到构造函数
  
  initExtend(Vue)
  // 初始化全局函数 Vue.component Vue.filter Vue.directive
  initAssetRegister(Vue)

}