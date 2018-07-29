import wepy from 'wepy'
import 'wepy-async-function'

// 服务器接口地址
const host = 'https://restapi.amap.com'
const amapRoot = `${host}/v3`

// 普通请求（wx.request 封装）
const request = async (options, showLoading = true) => {
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
    options.url = amapRoot + '/' + options.url
  }

  // 调用小程序的 request 方法
  let response
  let error = false
  try {
    response = await wepy.request(options)
  } catch (e) {
    // 无网络或请求超时
    error = true
    console.warn(e)
  }

  if (showLoading) {
    // 隐藏加载中
    wepy.hideLoading()
  }

  let title = '网络请求错误'
  let content = '网络错误'
  let autoRetry = false
  if (error) {
    content = '无法连接服务器，请检查网络后重试'
  } else if (response.statusCode === 200) {
    return response
  } else if (response.statusCode === 500) {
    content = '服务器错误，我们会尽快修复，请稍后再试'
  } else if (response.statusCode === 404) {
    return response
  } else if (response.statusCode >= 460 && response.statusCode <= 469) {
    if (response.data.title || response.data.title === '') {
      title = response.data.title
    } else {
      title = '系统维护'
    }
    if (response.data.msg) {
      content = response.data.msg
    } else {
      content = '系统维护中，请稍后再试'
    }
  } else {
    content = `未知原因（请求状态码：${response.statusCode}））`
  }

  let retry = false
  if (autoRetry) {
    retry = true
  } else {
    let retryModal = await wepy.showModal({
      title: title,
      content: content,
      confirmText: '重试',
      showCancel: false
    })
    if (retryModal.confirm) {
      retry = true
    }
  }

  if (retry) {
    console.log('重试网络请求')
    // 重试
    let newRequest = await request(options, showLoading)
    return newRequest
  } else {
    console.log('结束网络请求')
    return response
  }
}

// 逆地理编码
const regeo = async (longitude, latitude) => {
  return await request({
    url: 'geocode/regeo',
    data: {
      key: '576f3861f11df862357b277dd28ef61c',
      // 传入内容规则：经度在前，纬度在后，经纬度间以“,”分割，经纬度小数点后不要超过 6 位。
      location: `${longitude},${latitude}`
    }
  })
}

export default {
  regeo
}
