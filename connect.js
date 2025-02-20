const wsRegex = /^(ws|wss):\/\/([a-zA-Z0-9-]+\.[a-zA-Z0-9-]+|localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/[a-zA-Z0-9-._~%]*)?$/

export default async function useWebSocket(option, callBack) {
  if (Object.prototype.toString.call(option) !== "[object Object]") {
    return new Error("Illegal parameter: option")
  }
  wsRegex.lastIndex = 0
  if (wsRegex.test(option.baseUrl)) {
    return new Error("Please use a valid baseUrl in option")
  }

  let timer = null
  let serveTimer = null
  let lockReconnect = false
  let ws = null

  initWebSocket(option.baseUrl)

  // 初始化webscoket
  function initWebSocket(url) {
    try {
      ws = new WebSocket(url)
      initEventHandle()
    } catch (e) {
      reconnect(url)
      // eslint-disable-next-line
      console.log(e)
    }
  }

  // 初始化事件监听
  function initEventHandle() {
    ws.onclose = function () {
      reconnect(option.baseUrl)
    }
    ws.onerror = function () {
      reconnect(option.baseUrl)
    }
    ws.onopen = function () {
      heartCheck()
    }
    ws.onmessage = function (event) {
      heartCheck()
      if (event.data !== "pong") {
        // 'pong'为服务端的心跳消息
        callBack && callBack(event.data)
      }
    }
  }

  // 心跳检测（重置->启动->监听->循环）
  function heartCheck() {
    // 1.重置定时器
    timer && clearTimeout(timer)
    serveTimer && clearTimeout(serveTimer)
    // 2.启动定时器发送心跳消息
    timer = window.setTimeout(function () {
      ws.send("ping")
      serveTimer = window.setTimeout(function () {
        // 3.1.服务端没有响应心跳消息，关闭连接，重新触发reconnect()
        // 3.2.若服务端响应了心跳消息，会在onmessage中重新执行heartCheck()
        ws.close()
      }, option.timeout)
    }, option.timeout)
  }

  // 重新连接webscoket
  function reconnect(url) {
    if (!lockReconnect) {
      lockReconnect = true
      setTimeout(function () {
        initWebSocket(url)
        lockReconnect = false
      }, 2000)
    }
  }

  // 窗口关闭，断开链接
  window.onbeforeunload = function () {
    ws.close()
  }

  return { ws }
}
