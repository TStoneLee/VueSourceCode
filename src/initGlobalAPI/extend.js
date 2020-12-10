import { mergeOptions } from '../utils/index'
export default function initExtend (Vue) {
  let cid = 0
  Vue.extend = function (extendOptions) {
    // 父组件在初始化的时候会调用_init(options)，同样，子类也要调用_init初始化自己的内容
    // 但是子类以后自己扩展的内容必须为自己所有，又要获取父类上的内容，所以继承可以实现

    const Sub = function VueComponent (options) {
      // 子类初始化自己的内容，
      this._init(options)
    }
    Sub.cid = cid++
    Sub.prototype = Object.create(this.prototype)
    Sub.prototype.constructor = Sub
    // 同样也需要把父类的options 和子类传入的extendOptions，添加在子类（子组件）上options
    Sub.options = mergeOptions(this.options, extendOptions)

    // 这里返回Sub子类，参考Vue.extend()用法
    return Sub
  } 
}