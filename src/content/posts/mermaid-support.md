---
title: "在博客里画流程图（Mermaid）"
pubDatetime: 2026-08-30T18:40:00+09:00
modDatetime: 2026-08-30T18:40:00+09:00
draft: false
tags: ["教程", "Mermaid"]
description: "博客已支持 Mermaid：在编辑器里插入 mermaid 代码块，流程图、时序图、甘特图都能直接画。"
---

## Table of contents

博客现在支持 **Mermaid** 图表了：只要在编辑器里插入一个语言为 `mermaid` 的代码块，写上图定义，发布后就会自动渲染成图（不是显示代码，是真的画出来）。

## 用法

在后台编辑器里：插入代码块 → 语言填 `mermaid` → 粘贴图定义。也可以把写好的定义直接 Ctrl+V 粘贴进去。

## 实测：OIDC 登录 + Session 时序图

下面这张就是你会在别的文章里用的那种时序图，直接照抄结构改内容即可：

```mermaid
sequenceDiagram
    participant B as 浏览器
    participant G as Nginx+Lua网关
    participant R as Redis
    participant I as IdP Keycloak

    Note over B,I: 阶段1 首次登录 OIDC授权码流程
    B->>G: 访问受保护资源
    G->>B: 302重定向到IdP登录页
    B->>I: 输入用户名密码
    I->>B: 302重定向回网关 带code
    B->>G: 携带code请求回调
    G->>I: 用code换token
    I->>G: 返回IDToken AccessToken RefreshToken

    Note over G,R: 阶段2 网关落地为Session
    G->>R: 存储session_id对应记录
    G->>B: SetCookie session_id

    Note over B,I: 阶段3 后续请求走Session
    B->>G: 携带Cookie session_id
    G->>R: 查session记录
    R->>G: 返回JWT和过期时间
    G->>B: 放行 代理到后端
```

## 其他图型速览

流程图（`graph LR` / `graph TD`）：

```mermaid
graph LR
    A[写 Markdown] --> B{包含 mermaid 块?}
    B -- 是 --> C[hugo 钩子输出 pre.mermaid]
    B -- 否 --> D[普通渲染]
    C --> E[浏览器端 mermaid.js 画图]
    E --> F[读者看到图]
```

饼图、甘特图、类图也都可以，完整语法见 [mermaid.js.org](https://mermaid.js.org/)。

## 注意事项

- 代码块语言必须写 `mermaid`，写成 `plain` 或不写只会显示为普通代码
- 后台编辑器里看不到渲染效果是正常的（预览区只显示代码），发布后网站上才会画出来
- 语法写错时页面会显示报错提示而不是图，对照报错行号修一下即可
