export function createElement (tag, data = {}, ...children) {
  // console.log(tag, data, children)
  let key = data.key
  if (key) {
    delete data.key
  }
  return vnode(tag, data, key, children, undefined)
}

export function createTextNode (text) {
  // console.log(text)
  return vnode(undefined, undefined, undefined, undefined, text)
}

function vnode(tag, data, key, children, text) {
  return {
    tag,
    data,
    key,
    children,
    text
  }
}

// 虚拟节点 就是通过_c _v实现用对象描述DOM的操作（本质上还是对象）

// 1）将template转换成ast语法树 -> 生成render方法 -> 生成虚拟DOOM -> 真实的DOM
//    更新： 重新生成虚拟DOM -> 更新DOM