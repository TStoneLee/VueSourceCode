let id = 0
class Dep {
  constructor() {
    this.id = id++
    this.subs = []
  }

  depend() {
    this.subs.push(Dep.target) // 观察者模式
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