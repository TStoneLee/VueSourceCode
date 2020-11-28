import { nextTick } from '../utils/next-tick'

let queue = [] // 这里存放的等待更新视图的watcher
let has = {} // 判断是否已经有了该watcher
function flushSchedularQueue () {
  queue.forEach(watcher => watcher.run())
  queue = []
  has = {}
}
export function queueWatcher (watcher) {
  let id = watcher.id
  if (!has[id]) {
    queue.push(watcher)
    has[id] = true
    nextTick(flushSchedularQueue)
    // setTimeout(flushSchedularQueue, 0)
  }
}