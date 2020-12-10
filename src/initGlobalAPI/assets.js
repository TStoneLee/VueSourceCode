import { ASSETS_TYPE } from './const'

export default function initAssetRegister (Vue) {
  // 这里是因为Vue.component Vue.filter Vue.directive的参数类型一样的
  // id就是名称
  ASSETS_TYPE.forEach(type => {
    Vue[type] = function(id, definition) {
      if (type === 'component') {
        // 注册全局组件的函数
        // 需要使用Vue.extend函数，把对象变成构造函数
        // 这里一定要保证调用extend的是父类，而不是子类（子组件）因为子组件中也会childComponent.component()
        // 所以 this.options._base.extend 也可以Vue.extend 有可能其他地方没有传入Vue则可以使用this.options._base代替父类
        definition = this.options._base.extend(definition)
      } else if (type === 'filter') {
        // 注册全局过滤器的函数
      } else if (type === 'directive') {
        // 注册全局指令的函数
      }

      // 前面的逻辑执行完，还需要把这些加入到Vue.options上去
      this.options[type + 's'][id] = definition
    }
  })
}