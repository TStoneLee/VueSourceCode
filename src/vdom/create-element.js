import { isObject, isReservedTag } from "../utils/index"

export function createElement (vm, tag, data = {}, ...children) {
  // console.log(vm, tag, data, children)
  let key = data.key
  if (key) {
    delete data.key
  }

  // 因为有自定义的组件，所以需要特殊处理一下组件
  if (isReservedTag(tag)) {
    return vnode(tag, data, key, children, undefined)
  } else {
    // 组件
    // 如何获取组件的内容的，可以通过$options.components和tag判断全局下是否有该组件
    // 然后就可以找到子组件的构造函数
    let Ctor = vm.$options.components[tag]
    return createComponent(vm, tag, data, key, children, Ctor)
  }
}

function createComponent(vm, tag, data, key, children, Ctor) {
  // 这里做判断是因为如果是子组件内注册的组件，此时是对象，所以需要转成构造函数
  if (isObject(Ctor)) {
    Ctor = vm.$options._base.extend(Ctor)
  }
  // 在创建组件的时候，给data添加组件初始化的钩子函数
  // 为了可以初始化组件
  data.hook = {
    init (vnode) {
      // 当前实例就是 componentInstance
      let child = vnode.componentInstance = new Ctor({ _isComponent: true })
      child.$mount() // 这里是对组件进行挂载，但是没有根元素
    },
    inserted () {

    }
  }
  return vnode(`vue-component-${Ctor.cid}-${tag}`, data, key, undefined, {Ctor, children})
}

export function createTextNode (vm, text) {
  // console.log(text)
  return vnode(undefined, undefined, undefined, undefined, text)
}

function vnode(tag, data, key, children, text, componentOptions) {
  return {
    tag,
    data,
    key,
    children,
    text,
    componentOptions
  }
}

// 虚拟节点 就是通过_c _v实现用对象描述DOM的操作（本质上还是对象）

// 1）将template转换成ast语法树 -> 生成render方法 -> 生成虚拟DOOM -> 真实的DOM
//    更新： 重新生成虚拟DOM -> 更新DOM