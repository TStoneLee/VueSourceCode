

// 需要重写数组的某些方法 push pop shift unshift reverse sort splice,会导致数组本身发生变化

// 首先要保存数组原先的方法

const oldArrayMethods = Array.prototype

// 用户调用方法则是： value.__proto__ = arrayMethods
// arrayMethods.__proto__ = oldArrayMethods
export const arrayMethods = Object.create(oldArrayMethods)

const methods = [
  'push',
  'shift',
  'pop',
  'unshift',
  'reverse',
  'sort',
  'splice'
]

methods.forEach(method => {
  arrayMethods[method] = function (...args) {
    console.log(method, '调用')

    const result = oldArrayMethods[method].apply(this, args) // 调用原生方法，让数组的内容真正发生变化，并返回
    // push unshift 添加的元素也有可能是对象，所以需要对这操作元素的方法的传入数据的进行监测
    // splice, 如果传入三个参数时也需要进行监测
    let inserted // 当前要插入的元素
    switch(method) {
      case 'push':
      case 'unshift':
        inserted = args // 此时的args是个数组
        break
      case 'splice':
        inserted = args.slice(2)
      default:
        break
    }

    if (inserted) {
      this.__ob__.observerArray(inserted)
    }

    return result
  }
})