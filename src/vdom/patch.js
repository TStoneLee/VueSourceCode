export function patch (oldNode, vnode) {
  // 递归创建真实节点，替换掉老的节点

  if (!oldNode) {
    // 此时是解析组件，因为组件在挂载时传入的参数为空
    return createElm(vnode)
  } else {
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
      // console.log(el)
      parentElm.insertBefore(el, oldElm.nextSibling)
      parentElm.removeChild(oldElm)
  
      return el
    } else {
      // 虚拟DOM的比对是在这里
      // 首先是老节点是经过createElm(vnode)生成真实DOM的
      // 而且真实节点是放到虚拟节点的vnode.el上的
      // console.log(oldNode, vnode)
      // 1.标签不一致直接替换即可
      // 替换的原理是：先找到当前节点的父节点，然后再用新生成的节点替换掉当前节点
      // createElm(vnode)创建了新的节点，并把真实节点放到vnode的el上，并且返回了vnode.el
      if (oldNode.tag !== vnode.tag) {
        oldNode.el.parentNode.replaceChild(createElm(vnode), oldNode.el)
      }
      // 2.如果文本呢？ 文本都没有tag 
      if (!oldNode.tag) {
        if (oldNode.text !== vnode.text) {
          oldNode.el.textContent = vnode.text
        }
      }

      // 3. 说明标签一致而且不是文本了  (比对属性是否一致)
      // 先把老的节点保存到新的vnode的el属性上，为了在后面比较，老的oldNode的data中属性，与vnode.el真实节点的属性做对比
      // 如果老的有，新的没有，则删除老的节点上的属性，如果老的没有新的有，则添加到老的节点上
      let el = vnode.el = oldNode.el
      updateProperties(vnode, oldNode.data)

      // 对于新老节点的标签名一样的，则去新老虚拟节点的孩子比对,根据比对的结果去更新el的内容

      let oldChildren = oldNode.children || []
      let newChildren = vnode.children || []

      if (oldChildren.length > 0 && newChildren.length > 0) {
        // 新老都有孩子，需要特殊比较，去更新el的内容，这也是diff算法的核心了
        // 这种是先让新老虚拟节点进行比较，然后把比较的结果更新到el上
        updateChildren(el, oldChildren, newChildren)

      } else if (newChildren.length > 0) {
        // 新的虚拟节点有孩子，老的没有，那么直接把新的虚拟节点的孩子转成
        // 真实的DOM，并且添加到el上
        for (let i = 0; i < newChildren.length; i++) {
          let child = newChildren[i]
          el.appendChild(createElm(child))
        }
      } else if (oldChildren.length > 0) {
        // 新的没有，老的有，则直接把老的去掉
        el.innerHTML = ''
      }
      // 最后就是新老都没有，则不做任何操作

    }
  }

} 

function isSameVnode (newVnode, oldVnode) {
  return (newVnode.tag === oldVnode.tag) && (newVnode.key === oldVnode.key)
}

function updateChildren (parent, oldChildren, newChildren) {
  // vue采用的是双指针进行比较
  // 思路：就是在新老虚拟节点的首尾设置一个指针，再去比较头指针所在的新老虚拟节点，不一样则替换，否则就是老的不变
  // 然后移动新老虚拟节点的头指针，再做比较
  // 直到新的或者老的头尾指针指向同一位置（即尾指针的地方），做比较
  // while循环结束是头指针指向尾指针的下一位

  let oldStartIndex = 0
  let oldStartVnode = oldChildren[oldStartIndex]
  let oldEndIndex = oldChildren.length - 1
  let oldEndVnode = oldChildren[oldEndIndex]
  let newStartIndex = 0
  let newStartVnode = newChildren[newStartIndex]
  let newEndIndex = newChildren.length - 1
  let newEndVnode = newChildren[newEndIndex]

  function makeIndexByKey (children) {
    let map = {}
    children.forEach((item, index) => {
      // 不存在key直接比较标签
      if (item.key) {
        map[item.key] = index
      }
    })
    return map
  }
  let map = makeIndexByKey(oldChildren) 

  // diff算法对DOM的优化点：
  // 首先进行新老虚拟节点的头和头对比，
  // 不满足，则进行尾和尾对比
  // 不满足，则进行老虚拟节点的尾与新虚拟节点的头比较
  // 不满足，则进行老虚拟节点的头与新虚拟节点的尾比较
  // 不满足，则暴力对比


  // 都是以老节点为比较的基准
  while((oldStartIndex <= oldEndIndex) && (newStartIndex <= newEndIndex)) {

    // 这里做判断是因为在暴力对比的过程中，会把有些老的节点赋值为undefined
    if (oldStartVnode == undefined) {
      oldStartVnode = oldChildren[++oldStartIndex]
    } else if (oldEndVnode == undefined) {
      oldEndVnode = oldChildren[--oldEndIndex]
    } else {
      // 1. 新老头虚拟节点相同，（尾虚拟节点不相同） 说明是从老节点的尾部插入的新节点
      // 优化向后插入
      if (isSameVnode(newStartVnode, oldStartVnode)) {
        // 如果进来
        // 说明新老的标签名是相同的，然后就是要去比较属性并更新
        // 比较完成，则把头指针向后推移一位
        patch(oldStartVnode, newStartVnode)

        oldStartVnode = oldChildren[++oldStartIndex]
        newStartVnode = newChildren[++newStartIndex]
      } else if (isSameVnode(newEndVnode, oldEndVnode)) {
        // 优化向前插入
        // 2. 如果是从头部插入新的节点，则比较新老虚拟节点的尾指针指向的虚拟节点是否相同
        // 相同的话，比较虚拟节点，然后尾指针向前移动
        patch(oldEndVnode, newEndVnode)
        oldEndVnode = oldChildren[--oldEndIndex]
        newEndVnode = newChildren[--newEndIndex]
      } else if (isSameVnode(oldStartVnode, newEndVnode)) {
        // 开始交叉比较 这里必须把相同的那个节点移到新的虚拟节点对应老的节点的下一位的前面一位
        // 重点是要移动那个相同的老节点！！！！！
        // parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
        // 这一步是必须的
        // 然后在对比其他节点，如果符合上面的条件，则实现复用不需要移动节点
        // 老的尾虚拟节点和新的头虚拟节点相同
        // 头移尾
        patch(oldStartVnode, newEndVnode)
        parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
        newEndVnode = newChildren[--newEndIndex]
        oldStartVnode = oldChildren[++oldStartIndex]
      } else if (isSameVnode(oldEndVnode, newStartVnode)) {
        // 尾移头
        patch(oldEndVnode, newStartVnode)
        parent.insertBefore(oldEndVnode.el, oldStartVnode.el)
        oldEndVnode = oldChildren[--oldEndIndex]
        newStartVnode = newChildren[++newStartIndex]
      } else {
        // 暴力对比 乱序对比
        // 查找规则：先取出新的第一个虚拟节点，通过key在老的虚拟节点中查找是否存在

        // 在查找的过程中，以老的虚拟节点的开始索引为标准
        // 如果新的虚拟节点在老的中没有找到，则插入头指针（开始索引）所在的节点的前面一位
        // 如果新的虚拟节点在老的中找到，则直接复用老的节点，然后插入到头指针（开始索引）的前面一位，然后把老的节点赋值为null这样防止数组塌陷
        // 依次进行
        // 最后，看看头指针和尾指针之间是否还有老的节点存在，如果存在，则直接销毁

        // 先根据老节点的key做一个映射表，拿新的虚拟节点去映射表中查找，如果可以查找到，则进行移动操作（移到头指针
        // 的前面位置）如果找不到则直接将元素插入到头指针前面即可（即使头指针位置改变了，也是以头指针为准）
        let moveIndex = map[newStartVnode.key]
        if (!moveIndex) { // 映射表中不存在，就是不需要复用，则插入到头指针的前面
          parent.insertBefore(createElm(newStartVnode), oldStartVnode.el)
        } else { // 这种情况是可以复用，但是不在上面四种比较的情况下（如果在的话，就会直接对比移动）
          // 找到了，就把老的节点移到头指针前面，并且把当前位置变为null
          let moveVnode = oldChildren[moveIndex]
          oldChildren[moveIndex] = undefined
          parent.insertBefore(moveVnode.el, oldStartVnode.el)
          // 再把这个节点和新的节点做对比
          patch(moveVnode, newStartVnode)
        }
        // 把头指针向后移动一位
        newStartVnode = newChildren[++newStartIndex]
        // 然后比较完后，如果老的头指针和尾指针之间还有节点，则删除掉
      }
    }
  }
  // console.log(newStartIndex, newEndIndex)
  // console.log(newStartIndex, newEndIndex)
  // 1. 比较完成，如果新的虚拟节点还有剩余，则直接添加到父元素上
  // 这里的小于等于要注意，因为在while循环中，开始的索引和尾索引重合了
  if (newStartIndex <= newEndIndex) {
    for(let i = newStartIndex; i <= newEndIndex; i++) {
      /**
       * 这里是因为appendChild()只能在元素的后面插入，如果是从头节点插入就不符合
       * insertBefore(target, base), 如果第二个参数传入的是null则就会从最后插入元素
       * 否则则会插入某个元素的前面
       * 这个需要判断一下，如果是从后面插入，则需要找到老的节点的最后一位的下一位是什么，
       * （因为oldEndIndex已经指向最后一个节点，所以oldEndIndex + 1 就是老的节点的最后一个的下一位即为null
       * 如果是从头插入节点，则需要获取到老节点的第一个节点（oldChildren[oldStartIndex]）是虚拟节点，要获取该虚拟节点上el属性此为真实节点（oldChildren[oldStartIndex].el），然后插入新创建的节点
       */
      let el = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el
      // console.log(el)
      parent.insertBefore(createElm(newChildren[i]), el)
    }
  }

  //然后比较完后，如果老的头指针和尾指针之间还有节点，则删除掉

  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      if (oldChildren[i]!= undefined) {
        parent.removeChild(oldChildren[i].el)
      }
    }
  }
}
function createComponent(vnode) {
  let i = vnode.data
  // HTML标签是没有hook这个属性的
  if ((i = i.hook) && (i = i.init)) {
    i(vnode)
  }

  // console.log(vnode)

  // 当init执行完毕之后
  if (vnode.componentInstance) {
    // 说明组件已经创建了该实例
    return true
  }
}


export function createElm (vnode) { // 根据虚拟节点创建真实节点
  // 是标签还是文本
  let {tag, children, data, key, text} = vnode
  if (typeof tag === 'string') {

    // tag可能是HTML标签，也可能是组件名

    // 实例化组件
    // console.log(createComponent(vnode))
    if (createComponent(vnode)) {
      // 组件名
      // 这里返回的是真实DOM
      return vnode.componentInstance.$el
    }
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

function updateProperties (vnode, oldProps = {}) {
  const newProps = vnode.data || {}

  // console.log(newProps, oldProps)
  // 把属性放到当前节点 vnode.el
  const el = vnode.el

  for (let i in oldProps) {
    if (!newProps[i]) {
      el.removeAttribute(i)
    }
  }
  let newStyle = newProps.style || {}
  let oldStyle = oldProps.style || {}
  for (let i in oldStyle) {
    if (!newStyle[i]) {
      el.style[i] = ''
    }
  }
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