export default function initMixin (Vue) {
  
  Vue.mixin = function (mixin) {

    // 合并现有的全局上的options， 和传入的mixin对象
    // 如何实现两个对象的合并
    this.options = mergeOptions(this.options, mixin)

  }

  // 生命周期合并策略

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