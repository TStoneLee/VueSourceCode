export function patch (oldNode, vnode) {
  // console.log(oldNode, vnode)
  // 递归创建真实节点，替换掉老的节点

  const isRealElement = oldNode.nodeType // 虚拟DOM没有这个属性，只有DOM上才有

  if (isRealElement) {
    /**
     * 首先找到当前元素的父元素，然后根据vnode创建真实DOM
     * 把创建的DOM插入到当前节点的下一个兄弟节点之前，然后在去删除当前节点
     * 这样子，就保证了插入新的节点在页面上位置不会发生变化
     */
    const oldElm = oldNode
    const parentElm = oldElm.parentNode 

    let el = createElm(vnode)
    parentElm.insertBefore(el, oldElm.nextSibling)
    parentElm.removeChild(oldElm)

    return el
  }

  function createElm (vnode) { // 根据虚拟节点创建真实节点
    // 是标签还是文本
    let {tag, children, data, key, text} = vnode
    if (typeof tag === 'string') {
      // 标签
      vnode.el = document.createElement(tag)

      updateProperties(vnode)

      vnode.children.forEach(child => {
        return vnode.el.appendChild(createElm(child))
      })

    } else {
      // 虚拟DOM上映射真实DOM，方便后续操作
      vnode.el = document.createTextNode(text)
    }

    return vnode.el
  }

  function updateProperties (vnode) {
    const newProps = vnode.data
    // 把属性放到当前节点 vnode.el
    const el = vnode.el
    // console.log(newProps)
    for (let key in newProps) {
      // 属性为style或者是class的需要特殊处理
      if (key === 'style') {
        for (let styleName in newProps.style) {
          el.style[styleName] = newProps.style[styleName]
        }
      } else if (key === 'class') {
        el.className = newProps.class
      } else {
        el.setAttribute(key, newProps[key])
      }
    }
  
  }

}