# 安装与编译

安装 yarn

```
brew install yarn
```

克隆仓库

```
git clone https://github.com/TeamUsefulUseless/84post_wepy.git
```

更换源（国内访问加速，可跳过）

```
yarn config set registry 'https://registry.npm.taobao.org'
```

安装依赖

```
yarn global add wepy-cli
```

```
cd 84post_wepy
yarn install
```

编译运行

```
wepy build
wepy build --watch   # 这个选项会自动更新
```


# 授权

目前不授权任何以下行为（包括商业与非商业）

1. 将源码编译（含修改后）上传至微信平台
2. 在此源码内容基础上修改制作网页或软件及其他类似产品的
3. 借鉴此源码内核心算法的

如确有相关使用需求，请联系 imsingee@gmail.com 获取商业授权
