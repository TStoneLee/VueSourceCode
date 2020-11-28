// 原理是使用object.defineProperty()
import { isObject, def } from '../utils/index'
import { arrayMethods } from './array'
import Dep from './dep'
 
class Observer{
  constructor(data) {
    this.dep = new Dep // 给数组用的
    // 如果是数组的话，不会对索引进行观测，因为会导致性能的问题
    // 如果元素是对象是，不给对象赋值的话，那么观测索引就没有什么意义，造成性能浪费
    // 因为数组对象中的属性也进行了观测

    // 需要在其他地方使用Observer的实例的方法或者属性，所以给监测的对象加一个属性__ob__表示该对象已经被监测
    // 后续可以知道该值是否是被监测过的
    // 这样子写为了防止调用栈溢出 this.observerArray
    def(data, '__ob__', this)
    if (Array.isArray(data)) {

      // 如果数组内是对象，再去监测
      // 数组调用方法时，会通过原型链进行查找，如果找到我们改写的方法，则直接使用，没有，则会继续向上查找
      data.__proto__ = arrayMethods
      this.observerArray(data)
    } else {
      this.walk(data) // 对对象进行监控劫持
    }
  }
  // 对数组进行监控劫持
  observerArray(data) {
    for (let i = 0; i < data.length; i++) {
      // 监控数组的每一项
      observe(data[i])
    }
  }
  // 对对象进行监控劫持
  walk(data) {
    let keys = Object.keys(data)
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      let value = data[key]
      defineReactive(data, key, value)
    }
  }
}

function defineReactive(data, key, value) {
  let dep = new Dep()
  // 如果data的属性值是对象，则再进行数据劫持
  // 递归实现数据检测, 开发优化点： 不要嵌套太深的数据结构，不然性能会损耗
  let childob = observe(value) // 给数组的用的
  Object.defineProperty(data, key, {
    configurable: true,
    enumerable: true,
    get() { // 获取值的时候做一些操作
      // 每个属性都会有一个watcher
      // 每次取值的时候都把watcher存起来
      if (Dep.target) { // 如果当前有watcher
        dep.depend() // 需要将watcher存起来，等到 数据更新的时候，再去执行watcher
        // 多次存入watcher时，就会重复存放所以需要去重

        // console.log(dep.subs)
        // console.log(childob, value)
        if (childob) { // 数组的依赖收集
          childob.dep.depend() // 收集了数组的相关依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set(newVal) { // 设置值的时候也可以做一些操作
      if (value === newVal) return
      console.log('更新数据')
      // 如果用户自定义的对象赋值给data中的属性，也要进行劫持
      observe(newVal)
      value = newVal
      dep.notify() // 通知依赖的watcher进行更新操作
    }
  })
}

function dependArray (value) {
  for (let i = 0; i < value.length; i++) {
    value[i].__ob__ && value[i].__ob__.dep.depend() // 对数组中的数组进行依赖收集
    if (Array.isArray(value[i])) {
      dependArray(value[i])
    }
  }
}

export function observe (data) {
  // 判断data是否是对象
  let isObj = isObject(data)
  if (!isObj) return
  return new Observer(data) // 因为功能比较多，使用类观测数据
}