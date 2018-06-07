import wepy from 'wepy'
import 'wepy-async-function'

// 服务器接口地址
// const host = 'http://127.0.0.1:8000'
const host = 'https://84.singee.site'
const apiRoot = `${host}/api/v1`

// 分享信息
const shareInfo = {
  title: '来给我写封信吧！',
  imageUrl: `${host}/media/share/default.png`,
  boxTitle: '看看你的邮件到哪了！'
}

// 普通请求（wx.request 封装）
const request = async (options, showLoading = true, auth = true) => {
  // 传入字符串则直接认为是 GET 请求
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }
  // 显示加载中
  if (showLoading) {
    wepy.showLoading({ title: '加载中' })
  }

  // 拼接请求地址
  let start = /^https?:\/\//
  if (!start.exec(options.url)) {
    options.url = apiRoot + '/' + options.url
  }

  // 权限验证 - Authorization
  if (auth) {
    if (!options.header) {
      options.header = {}
    }

    let token = wepy.getStorageSync('token')

    if (token) {
      options.header.Authorization = `Token ${token}`
    }
  }

  // 调用小程序的 request 方法
  let response
  let error = false
  try {
    response = await wepy.request(options)
  } catch (e) {
    // 无网络或请求超时
    error = true
  }

  if (showLoading) {
    // 隐藏加载中
    wepy.hideLoading()
  }

  let content = '网络错误'
  let needRelogin = false
  if (error) {
    content = '无法连接服务器，请检查网络后重试'
  } else if (response.statusCode === 200) {
    return response
  } else if (response.statusCode === 500) {
    content = '服务器错误，我们会尽快修复，请稍后再试'
  } else if (response.statusCode === 401) {
    content = '您当前未登录或权限不足，请重试'
    needRelogin = true
  } else if (response.statusCode === 403) {
    content = '您当前未登录或权限不足，请重试'
    needRelogin = true
  } else {
    content = `未知原因（请求状态码：${response.statusCode}））`
  }

  let retryModal = await wepy.showModal({
    title: '网络请求错误',
    content: content,
    confirmText: '重试',
    showCancel: false
  })

  if (retryModal.confirm) {
    console.log('重试网络请求')
    // 重新登录
    if (needRelogin) {
      await login()
    }
    // 重试
    let newRequest = await request(options, showLoading, auth)
    return newRequest
  } else {
    console.log('结束网络请求')
    return response
  }
}

// 登录
const login = async (params = {}) => {
  // code 只能使用一次，所以每次单独调用
  let loginData = await wepy.login()

  // 参数中增加code
  params.code = loginData.code

  // 接口请求
  let authResponse = await request({
    url: 'auth/code/',
    data: params,
    method: 'POST'
  }, false, false)

  // 登录成功，记录 token 信息
  // console.log(authResponse.statusCode)

  if (authResponse.statusCode === 200) {
    // console.log('data:', authResponse.data)
    let token = authResponse.data.token
    let userId = authResponse.data.id

    // app.globalData.token = token

    // console.log('Token:', token)
    // console.log('User ID:', userId)

    wepy.setStorageSync('token', token)
    wepy.setStorageSync('userId', userId)
  }

  return authResponse
}

// 上报 FormId
const formIdSubmit = async (formId) => {
  // console.log(formId)
  request({
    url: 'formid/submit/',
    data: { 'formId': formId },
    method: 'POST'
  }, false).then((result) => {
    // console.log(result.data)
  })
}

// 申请权限接口
const getAuthScope = async (scope) => {
  try {
    await wepy.authorize({
      scope: scope
    })
  } catch (e) {
    let modal
    if (scope === 'scope.userLocation') {
      modal = await wepy.showModal({
        title: '授权被拒绝',
        content: '您拒绝了我们的获取地理位置权限申请，但要继续您当前的操作，我们必须获得您的地理位置。',
        confirmText: '给予权限',
        cancelText: '拒绝授权'
      })
    } else {
      modal = await wepy.showModal({
        title: '授权被拒绝',
        content: '您拒绝了我们的权限申请，因此您的操作无法完成。',
        confirmText: '给予权限',
        cancelText: '拒绝授权'
      })
    }

    if (modal.confirm) {
      await wepy.openSetting()
    }

    console.log(e)
  }
}

// 打开调试模式
const startDebug = async () => {
  wepy.setEnableDebug({
    enableDebug: true
  })
}

// 关闭调试模式
const stopDebug = async () => {
  wepy.setEnableDebug({
    enableDebug: false
  })
}

// 签到
const qiandao = async () => {
  let r = await request('qiandao/')
  if (r.data.success) {
    wepy.showModal({
      title: r.data.title,
      content: r.data.info,
      showCancel: false
    })
  }
}

export default {
  host,
  request,
  login,
  formIdSubmit,
  getAuthScope,
  startDebug,
  stopDebug,
  shareInfo,
  qiandao
}
