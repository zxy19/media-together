# 媒体同步服务器

媒体同步是一款基于直链播放的在线同步进度播放器。其一般被用作多人同步BGM，一起听歌等场景。

本仓库是媒体同步网站的前端程序。

## 特性

- 支持直链播放的所有媒体，不局限于部分网站
- 支持同步多人播放进度，支持播放列表循环、插队、修改等功能
- 提供了网页浮窗，可以在后台看到当前播放的声音/视频

## 自部署方案

0. 下载本仓库
1. 在src/config/net.ts中修改上传服务器和同步服务器的位置
2. 进行安装和编译
```sh
npm i
npm run build
```
3. 将dist文件夹中的内容拷贝到服务器中

## 相关项目

前端项目[https://github.com/zxy19/media-together](https://github.com/zxy19/media-together)

后端项目[https://github.com/zxy19/media-together-server](https://github.com/zxy19/media-together-server)

工具页面[https://github.com/zxy19/media-together-tools](https://github.com/zxy19/media-together-tools)
