export function isObject(data) {
  return typeof data ===  'object' && typeof data !== null
}

export function isReservedTag (tagName) {
  let str = 'p,div,span,input,button'
  let obj = []
  str.split(',').forEach(tag => {
    obj[tag] = true
  })

  return obj[tagName]
}

export function def(data, key, value) {
  Object.defineProperty(data, key, {
    configurable: false,
    enumerable: false,
    value
  })
}

// 取值时实现代理效果
export function proxy(vm, source , key) {
  Object.defineProperty(vm, key, {
    get () {
      return vm[source][key]
    },
    set (newValue) {
      vm[source][key] = newValue
    }
  })
}

const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed'
]

// 生命周期合并策略
const strats = {}

function mergeHook (parentVal, childVal) {
  if (childVal) {
    if (parentVal) {
      return parentVal.concat(childVal)
    } else {
      return [childVal]
    }
  } else {
    return parentVal
  }
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

function mergeAssets (parentVal, childVal) {
  // 如果子类有components则直接获取，如果没有，则通过res.__proto__访问父类的components
  const res  = Object.create(parentVal) 
  if (childVal) {
    for (let key in childVal) {
      res[key] = childVal[key]
    }
  }
  return res
}
// 组件的合并策略
strats.components = mergeAssets

export function mergeOptions (parent, child) {
  const option = {}
  //以child为准
  for (let key in parent) {
    mergeField(key) 
  }
  // 如果child的属性，parent中没有，需要遍历child

  for (let key in child) {
    if (!parent.hasOwnProperty(key)) {
      mergeField(key)
    }
  }

  // 默认的合并策略，有些属性需要特殊的合并方式，生命周期合并，会把所有的相同生命周期合并到一个数组中，然后依次执行
  function mergeField (key) {
    if (strats[key]) {
      return option[key] = strats[key](parent[key], child[key])
    }
    if (typeof parent[key] === 'object' && typeof child[key] === 'object') {
      option[key] = {
        ...parent[key],
        ...child[key]
      }
    } else if (child[key] == null) {
      option[key] = parent[key]
    } else {
      option[key] = child[key]
    }
  }

  return option
}