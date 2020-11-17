import { observe } from './observer/index'
import { proxy } from './utils/index'
export function initState(vm) {
  const opts = vm.$options
  // 初始化数据
  // vue的数据来源： 属性 方法 数据 计算属性 watch

  if(opts.props) {
    initProps(vm)
  }

  if(opts.methods) {
    initMethods(vm)
  }

  if(opts.data) {
    initData(vm)
  }

  if(opts.computed) {
    initComputed(vm)
  }

  if(opts.watch) {
    initWatch(vm)
  }
}

function initProps() {}
function initMethods() {}
function initData(vm) {
  // 数据改变视图更新
  let data = vm.$options.data
  // 为了data是函数时，执行时不改变this的指向需要绑定this
  data = vm._data = typeof data === 'function' ? data.call(vm) : data
  
  // 这里做一层代理，因为现在只能通过vm._data访问到data中的数据，希望通过vm.data访问，原理是
  // Object.defineProperty()
  for (let key in data) {
    proxy(vm, '_data', key)
  }

  // 监控数据，响应式原理
  observe(data)
}
function initComputed() {}
function initWatch() {}