import wepy from 'wepy'
import 'wepy-async-function'
import semver from 'semver'

// 版本号
const version = '1.2.5'

// 服务器接口地址
const host = '__HOST__'
const apiRoot = `${host}/api/v1`

// 分享信息
const shareInfo = {
  title: '来给我写封信吧！',
  imageUrl: `${host}/media/share/default.png`,
  boxTitle: '看看你的信件到哪了！'
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
    if (apiRoot.substr(-1) !== '/' && options.url.charAt(0) !== '/') {
      options.url = apiRoot + '/' + options.url
    } else {
      options.url = apiRoot + options.url
    }

    if (options.url.substr(-1) !== '/') {
      options.url += '/'
    }
  }

  // header
  if (!options.header) {
    options.header = {}
  }

  // 权限验证 - Authorization
  if (auth) {
    let token = wepy.getStorageSync('token')

    if (token) {
      options.header.Authorization = `Token ${token}`
    }
  }

  // 版本控制
  if (!options.header['X-MINAVersion']) {
    options.header['X-MINAVersion'] = version
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
  let needRelogin = false
  let autoRetry = false
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
    if (!wepy.getStorageSync('token')) {
      autoRetry = true
    }
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

// 检查更新
const checkUpdate = async () => {
  // eslint-disable-next-line no-undef
  const updateManager = wx.getUpdateManager()

  let prepared = false

  let mustUpdate = false
  let recommendUpdate = false

  updateManager.onCheckForUpdate(async res => {
    // 请求完新版本信息的回调
    console.log('hasUpdate', res.hasUpdate)

    if (res.hasUpdate) {
      // 有更新 -> 拉取服务器端版本号信息

      let apiSettingsResponse = await request('/api')
      console.log('apiSettingsResponse', apiSettingsResponse)

      let lowestVersion = apiSettingsResponse.data.find(k => k.key === 'lowest_version').value
      let recommendVersion = apiSettingsResponse.data.find(k => k.key === 'recommend_version').value

      console.log('lowestVersion', lowestVersion)
      console.log('recommendVersion', recommendVersion)

      // 判断是否需要提示更新
      if (semver.lt(version, lowestVersion)) {
        mustUpdate = true
        recommendUpdate = true
      } else if (semver.lt(version, recommendVersion)) {
        mustUpdate = false
        recommendUpdate = true
      } else {
        mustUpdate = false
        recommendUpdate = false
      }

      prepared = true

      console.log('mustUpdate', mustUpdate)
      console.log('recommendUpdate', recommendUpdate)
    }
  })
  updateManager.onUpdateReady(async () => {
    let timeInterval = setInterval(async () => {
      if (prepared) {
        clearInterval(timeInterval)
        let r
        if (mustUpdate) {
          // 必须更新
          r = await wepy.showModal({
            title: '小程序更新',
            content: '84 号邮局新版本已发布，该版本为重要版本，将会刷新页面以更新',
            showCancel: false,
            confirmText: '刷新页面并更新',
            confirmColor: '#3CC51F'
          })
        } else if (recommendUpdate) {
          // 推荐更新
          r = await wepy.showModal({
            title: '小程序更新',
            content: '84 号邮局新版本已发布，若不更新可能会造成部分功能异常，是否更新？',
            showCancel: true,
            confirmText: '更新',
            confirmColor: '#3CC51F',
            cancelText: '下次再说',
            cancelColor: '#000000'
          })
        } else {
          // 不提示更新
          return
        }
        if (r.confirm) {
          // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
          console.log('applyUpdate')
          updateManager.applyUpdate()
        }
      }
    }, 50)
  })

}

export default {
  version,
  host,
  request,
  login,
  formIdSubmit,
  getAuthScope,
  startDebug,
  stopDebug,
  shareInfo,
  checkUpdate
}
