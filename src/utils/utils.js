function parseStr(num, minLength) {
  let str = num.toString()
  if (str.length >= minLength) {
    return str
  } else {
    let strArray = []
    let times = minLength - str.length - 1
    while (strArray.length < times) {
      strArray.push('0')
    }
    return strArray.join('0').concat(str)
  }
}

export default {
  parseStr
}
