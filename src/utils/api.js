import wepy from 'wepy'
import 'wepy-async-function'

// 服务器接口地址
// const host = 'http://127.0.0.1:8000/api/v1'
// const host = 'http://192.168.123.103:8000/api/v1'
const host = 'https://84.singee.site/api/v1'

// 普通请求
const request = async (options, showLoading = true, auth = true) => {
  // 简化开发，如果传入字符串则转换成 对象
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
  options.url = host + '/' + options.url

  // Authorization
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
  // console.log(options)
  let response
  try {
    response = await wepy.request(options)
  } catch (e) {
    if (showLoading) {
      // 隐藏加载中
      wepy.hideLoading()
    }

    wepy.showModal({
      title: '提示',
      content: '无法连接服务器，请检查网络后重试',
      showCancel: false
    })
    return null
  }
  // console.log(response)

  if (showLoading) {
    // 隐藏加载中
    wepy.hideLoading()
  }

  // 服务器异常后给与提示
  if (response.statusCode === 500) {
    wepy.showModal({
      title: '提示',
      content: '服务器错误，请稍后再试',
      showCancel: false
    })
  } else if (response.statusCode === 401) {
    wepy.showModal({
      title: '提示',
      content: '未登录或权限不足',
      showCancel: false
    })
  }
  return response
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

const getAuthScope = async (scope) => {
  try {
    await wepy.authorize({
      scope: scope
    })
  } catch (e) {
    let modal = await wepy.showModal({
      title: '授权被拒绝',
      content: '您拒绝了我们的权限申请，因此您的操作无法完成。',
      confirmText: '给予权限',
      cancelText: '拒绝授权'
    })

    if (modal.confirm) {
      await wepy.openSetting()
    }

    console.log(e)
  }
}

const startDebug = async () => {
  wepy.setEnableDebug({
    enableDebug: true
  })
}

const stopDebug = async () => {
  wepy.setEnableDebug({
    enableDebug: false
  })
}

export default {
  host,
  request,
  login,
  formIdSubmit,
  getAuthScope,
  startDebug,
  stopDebug
}
