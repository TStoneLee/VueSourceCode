import { pushTarget,  popTarget } from './dep.js'
import { queueWatcher } from './schedular.js'
let id = 0 // 给每一个watcher一个标识符
class Watcher {

  constructor(vm, exprOrFn, callback, options) {
    this.vm = vm
    this.callback = callback
    this.options = options
    this.id = id++
    this.getter = exprOrFn // 将内部传过来的回调函数，放到getter属性上
    this.depsId = new Set()
    this.deps = []
    this.get() // 调用get方法，会让渲染watcher执行
  }

  addDep (dep) { // watcher里不能放重复的dep，dep里不能放重复的watcher
    let id  = dep.id
    if (!this.depsId.has(id)) {
      this.depsId.add(id)
      this.deps.push(dep)
      // 然后再让dep里存放watcher
      dep.addSub(this)
    }
  }

  get() {
    // 在执行渲染watcher之前，把该watcher存起来，执行完后再抛出
    pushTarget(this)
    this.getter()
    popTarget()
  }

  // 现在是每次更新都会立即去渲染数据，需要改成等数据操作完成之后，再去更新视图，
  // 所以就是可以添加一个watcher队列，等所有的数据操作完成之后再去更新视图即再来调用this.get()
  update() {
    // console.log('update')
    // this.get()
    queueWatcher(this)
  }

  run () { // 这个函数是在等所有的数据操作完成之后再去更新视图
    this.get()
  }
}

export default Watcher