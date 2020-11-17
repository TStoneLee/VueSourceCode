import { pushTarget,  popTarget } from './dep.js'
let id = 0 // 给每一个watcher一个标识符
class Watcher {

  constructor(vm, exprOrFn, callback, options) {
    this.vm = vm
    this.callback = callback
    this.options = options
    this.id = id++
    this.getter = exprOrFn // 将内部传过来的回调函数，放到getter属性上

    this.get() // 调用get方法，会让渲染watcher执行
  }

  get() {
    // 在执行渲染watcher之前，把该watcher存起来，执行完后再抛出
    pushTarget(this)
    this.getter()
    popTarget()
  }

  update() {
    this.get()
  }
}

export default Watcher