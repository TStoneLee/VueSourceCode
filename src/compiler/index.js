
// ast语法树是用对象来描述原生语法的，虚拟DOM是用对象来描述DOM节点的

import { parseHTML } from './parser-html'
import { generate } from './generate'

export function compileToFunction(template) {

  // 解析HTML字符串，就是用正则去匹配HTML的内容，匹配到了，则就删除在HTML中的对应内容，然后在进行下一次匹配，依次循环
  // 然后再去解析成ast语法树
  let root = parseHTML(template)
  // console.log(root)

  // 需要把ast语法树生成render函数 就是字符串的拼接，模版引擎


  // 核心思路就是将模版转化成下面这段字符串
  // <div id="app"><p>hello {{name}}</p> hello</div>
  // 将ast树再次转化成js语法
  // _c: 第一个参数是标签名，第二参数是属性，第三个参数是子元素
  // _c("div", {id: app}, _c("p", undefined, _v("hello" + _s(name))), _v("hello"))
  
  let code = generate(root)
  // _c("div",{id:app},_c("p",undefined,_v('hello' + _s(name) )),_v('hello')) 
  // 所有的模板引擎实现 都需要new Function + with
  // 步骤： 拼接字符串， 添加with， new Function生成函数
  let renderFn = new Function(`with(this){ return ${code} }`)
  // console.log(renderFn)
  return renderFn
}