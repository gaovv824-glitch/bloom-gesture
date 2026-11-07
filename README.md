# 🌸 指尖花园 · BloomGesture（二次开发版）

用摄像头手势控制花朵绽放的互动网页。

项目基于开源项目 **BloomGesture** 二次开发，使用 **MediaPipe Hands** 识别手部关键点，把捏合、张掌、手指数量映射成花朵的开合、生长、绽放和配色变化。

> 这是一个个人练习项目：在原项目基础上，通过和 ChatGPT 多轮对话，逐步修改界面、交互和画面参数，做成自己想要的效果。原项目版权归原作者所有，本项目遵循 MIT 协议。

![指尖花园演示](screenshots/demo.jpg)

## 功能

| 手势 / 操作 | 效果 |
| --- | --- |
| 左手捏合 | 控制花朵开合 |
| 右手捏合 | 控制花朵生长 |
| 张开手掌 | 触发绽放 |
| 左手伸出手指 | 切换 5 种花色 |
| 点击画面 | 种下新花 |
| 演示模式 | 没有摄像头也能点击种花 |
| 清空花园 | 清空当前花朵 |

## 本地运行

不需要安装依赖，直接打开 `index.html` 即可（建议用 Chrome / Edge）。

如果浏览器对摄像头权限有限制，可以在项目目录起一个本地服务：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`，点击「开启摄像头」并允许权限。

> 没有摄像头也可以直接使用「演示模式」，点击画面种花。

## 我做了什么

- 在原项目基础上做二次开发，保留 MediaPipe Hands 手势识别能力
- 调整界面文案与中文化
- 完善演示模式、点击种花、清空花园、状态提示等交互
- 通过和 ChatGPT 反复沟通，修改代码与画面参数，逐步调整成自己想要的效果
- 整理 README 与运行说明，方便其他人运行和继续修改

## 技术说明

原项目使用原生 HTML / CSS / JavaScript、MediaPipe Hands 和 Canvas 2D；我的改动主要集中在界面、交互与画面参数调整，没有重写手势识别部分。

## 目录

```text
.
├── index.html          # 页面结构
├── style.css           # 页面样式
├── app.js              # 手势识别与画面渲染
├── screenshots/
│   └── demo.jpg        # 演示截图
├── LICENSE             # MIT 协议
├── NOTICE.md           # 原项目版权与致谢
└── README.md
```

## 致谢

- 原项目：**BloomGesture**（MIT License）
- 手势识别：[MediaPipe Hands](https://github.com/google/mediapipe)
- 感谢 ChatGPT 在修改过程中提供的帮助

## License

MIT。详见 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)。
