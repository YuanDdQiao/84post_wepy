import wepy from 'wepy'

// 服务器接口地址
const host = 'http://192.168.123.103:8000/api/v1'

// 普通请求
const request = async (options, showLoading = true) => {
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

  // 调用小程序的 request 方法
  let response = await wepy.request(options)

  if (showLoading) {
    // 隐藏加载中
    wepy.hideLoading()
  }

  // 服务器异常后给与提示
  if (response.statusCode === 500) {
    wepy.showModal({
      title: '提示',
      content: '服务器错误，请联系管理员或重试'
    })
  } else if (response.statusCode === 401) {
    wepy.showModal({
      title: '提示',
      content: '未登录权限不足，请联系管理员或重试'
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

  // 接口请求 weapp/authorizations
  let authResponse = await request({
    url: 'auth/code/',
    data: params,
    method: 'POST'
  })

  // 登录成功，记录 token 信息
  console.log(authResponse.statusCode)

  if (authResponse.statusCode === 200) {
    console.log('data:', authResponse.dat)
    let token = authResponse.data.token
    let userId = authResponse.data.id

    // app.globalData.token = token

    console.log('Token:', token)
    console.log('User ID:', userId)

    wepy.setStorageSync('token', token)
    wepy.setStorageSync('user_id', userId)
    // this.globalData.token = token
    // this.globalData.user_id = user_id
  }

  return authResponse
}

export default {
  request,
  login
}
