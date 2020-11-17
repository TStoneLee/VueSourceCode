const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // abc-aaa
const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // <aaa:asdads>
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则 捕获的内容是标签名
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的
const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 >  <div>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

// 把获取的HTML解析成ast语法树

export function parseHTML (html) {
  let root = null // ast语法树根节点
  let currentParent = null // 标记当前元素的父元素
  let stack = [] // 栈用来保存创建好的ast节点，为了在匹配结束标签的时候，看看是否匹配的上（即元素是否正确闭合）利用栈的特性（遇到结束标签，抛出栈顶元素）
  const ELEMENT_TYPE = 1
  const TEXT_TYPE = 3

  // 根据元素创建ast树的节点 
  function createASTElement(tagName, attrs) {
    return {
      tag: tagName,
      type: ELEMENT_TYPE,
      attrs,
      children: [],
      parent: null
    }
  }


  function start (tagName, attrs) {
    // console.log('开始标签：', tagName, attrs)
    let element = createASTElement(tagName, attrs)

    // console.log(currentParent)
    // 先查看根节点是否存在，
    if (!root) {
      root = element
    }  
    // 开始标签可以看成是父级标签
    // 把当前元素标记成父ast树
    currentParent = element
    stack.push(element)
  }
  function chars(text) {
    // console.log('文本是：',text)
    // 文本标签肯定是子元素
    text = text.replace(/\s/g, '')
    if (text) {
      currentParent.children.push({
        text,
        type: TEXT_TYPE
      })
    }
  }
  //  <div><p></p></div>  ['div', 'p']
  function end(tagName) {
    // console.log('结束标签：', tagName)
    // 这里开始匹配标签闭合是否正确, 抛出栈顶元素
    let element = stack.pop()
    if (element) {
      if (element.tag === tagName) {
        // 获取栈内最后一个元素，此元素是抛出元素的父元素
        currentParent = stack[stack.length - 1]
        // console.log(currentParent)
        if (currentParent) {
          element.parent = currentParent
          currentParent.children.push(element)
        }
      }
    }
  }
  // 不停的解析html字符串
  while(html) {
    let textEnd = html.indexOf('<')
    // 如果是0的话，说明匹配的可能是开始标签或者是结束标签，但都是代表着标签的开始
    if (textEnd === 0) {
      let startTagMatch = parseStartTag() // 这个方法是用来匹配标签名和属性的
      if (startTagMatch) {
        start(startTagMatch.tagName, startTagMatch.attrs)
        // console.log(startTagMatch)
        continue // 如果匹配的是开始标签就继续在匹配
      }

      let endTagMatch = html.match(endTag)
      if (endTagMatch) {
        advance(endTagMatch[0].length)
        end(endTagMatch[1])
        continue
      }
    }

    // 如果textEnd>=0的话，说明是一段文本
    let text = ''
    if(textEnd >= 0) {
      text = html.substring(0, textEnd) 
    }
    if (text) {
      chars(text)
      advance(text.length)
      // console.log(html, textEnd)
      // break
    }
  }

  function advance(n) {
    html = html.substring(n)
  }


  function parseStartTag() {
    let start = html.match(startTagOpen)
    if (start) {
      // 开始组装数据
      const match = {
        tagName: start[1],
        attrs: []
      }
      // 匹配标签名完成，删除
      advance(start[0].length)
      // 然后再去匹配属性
      // 匹配属性，需要注意标签内是否有属性
      let end = null
      let attr = null
      while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        match.attrs.push({
          name: attr[1], 
          value: attr[3] || attr[4] || attr[5]
        })
        advance(attr[0].length)
      }
      // end匹配的开始标签的'>', 如果匹配到，则表示这个标签匹配完成
      if (end) {
        advance(end[0].length)
        return match
      }
    }
    // console.log(start)
    // console.log(html)
  }
  return root
}