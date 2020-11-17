const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

function genProps (attrs) {
  let str = ''
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i]
    if (attr.name === 'style') { // style特殊处理
      let obj = {}
      let styleValue = attr.value.split(';')
      styleValue.forEach(item => {
        let [key, value] = item.trim().split(':')
        obj[key] = value && value.trim()
      })
      attr.value = obj
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  }
  return `{${str.slice(0, -1)}}`
}

function  genChildren(el) {
  let children =  el.children
  if (children && children.length) {
    return `${children.map(c => gen(c)).join(',')}`
  }else {
    return false
  }
}

function gen(node) {
  if (node.type === 1) {
    return generate(node)
  } else {
    // 现在是文本和变量
    let text = node.text // <div>a {{  name  }} b{{age}} c</div>里面的text，a {{  name  }} b{{age}} c
    let tokens = []
    let match = null
    let index = null
    // 只要是全局匹配 就需要将lastIndex每次匹配的时候调到0处 正则匹配的懒惰性
    let lastIndex = defaultTagRE.lastIndex = 0
    while(match = defaultTagRE.exec(text)) {
      index = match.index
      if (index > lastIndex) {
        tokens.push(JSON.stringify(text.slice(lastIndex, index)))
      }
      tokens.push(`_s(${match[1].trim()})`)
      lastIndex = index + match[0].length
    }
    // console.log(defaultTagRE.exec(text))
     // 这里匹配的是最后的文本 “ c”
    if (lastIndex < text.length) {
      tokens.push(JSON.stringify(text.slice(lastIndex)))
    }
    return `_v(${tokens.join('+')})`
  }
}

export function generate (el) {
  let children = genChildren(el)
  let code = `_c("${el.tag}", ${
   el.attrs.length ? genProps(el.attrs) : 'undefined'
   // 逗号写在里面是为了，没有孩子的时候，不需要逗号
  }${children ? `,${ children }` : ''})`

  return code
}