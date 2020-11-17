### 数据更新的依赖收集

1. 对象依赖：数据修改时，可以更新页面的数据，

   数据变化，可以自动的重现执行原来的渲染watcher

2. 依赖收集：存储需要执行的watcher

3. 在Watcher类的ge t函数执行this.getter之前收集watcher ，更新渲染完成后在去抛出

4. 在观测数据的Observe中，在取值的时候，如果有watcher，就存在当前的Dep的实例上，在set更新数据时，通知当前的Dep实例，触发更新操作。（这里使用的是观察者模式）

