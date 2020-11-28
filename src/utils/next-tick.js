// nextTick在vue源码中也有使用，所以实现把源码中的回调函数先放入队列中
// 再把用户自定义的nextTick放入队列中
let callbacks = [] 
let waiting = false
function flushCallback () {
  callbacks.forEach(callback => callback())
  waiting = false
}
// 多次调用nextTick
// waiting，等callbakcs里面的函数执行完之后，再去添加下一轮的回调函数
// 如果没有waiting的话，就会一有callback就会执行回调函数
export function nextTick (cb) {
  callbacks.push(cb)
  if (!waiting) {
    setTimeout(flushCallback, 0)
    waiting = true
  }
}