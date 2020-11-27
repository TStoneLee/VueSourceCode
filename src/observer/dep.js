let id = 0
class Dep {
  constructor() {
    this.id = id++
    this.subs = []
  }
  addSub (watcher) {
    this.subs.push(Dep.target)
  }
  depend() {
    // 此时的Dep.target就是watcher，现在这个处理方式会重复存放watcher
    // this.subs.push(Dep.target) // 观察者模式

    // 让这个watcher记住我当前的dep,
    // this就是Dep的实例
    // 通过在watcher里记住这个dep
    Dep.target.addDep(this)
  }

  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}

let stack = [] // 使用一个栈来保存watcher
export function pushTarget(watcher) {
  // 使用一个Dep静态属性来指向当前watcher
  Dep.target =  watcher
  stack.push(watcher)
}

export  function popTarget() {
  stack.pop()
  Dep.target = stack[stack.length - 1]
}

export default Dep