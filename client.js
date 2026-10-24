/**
 * dsh-ca-image-console —— 客户端半边。
 *
 * 干一件小事：在「设置 → 插件」区加一个**页签**，里面是 dsh-ca-image 控制台的三条入口。
 * 不用记网址，也不用记端口 —— 地址由 `location.origin` 现算，换端口自动对。
 *
 * ⚠️ 立场：这是**入口**，不是第二份控制台。所有真界面仍在
 *    `/plugins/dsh-ca-image/*` 上，这里只放链接和一行状态。
 */
window.__ModuleLoader__.load({
  id: 'dsh-ca-image-console',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const HOST = '/plugins/dsh-ca-image'

    /** 四种入口：名字 → 后缀 */
    const LINKS = [
      ['console', '/workbench', '出图控制台'],
      ['pipeline', '/pipeline', '流程图'],
      ['raw', '/raw', '原始提示词（JSON）'],
      ['params', '/params', '参数总览'],
    ]

    async function readState() {
      const res = await fetch(HOST + '/state', { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      if (data && data.ok === false) throw new Error(String(data.error || 'state 读不到'))
      return data
    }

    function StatusRow({ label, value }) {
      return h('div', {
        style: {
          display: 'flex', gap: 10, alignItems: 'baseline',
          padding: '4px 0', borderBottom: '1px solid var(--color-border, rgba(128,128,128,.2))',
        },
      },
      h('span', { style: { minWidth: 84, opacity: 0.65, fontSize: 12 } }, label),
      h('span', { style: { fontSize: 13, wordBreak: 'break-all' } }, value))
    }

    function ConsoleTab(props) {
      const t = props && typeof props.t === 'function' ? props.t : (key) => key
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState('')
      const [copied, setCopied] = React.useState(false)

      React.useEffect(() => {
        let alive = true
        readState()
          .then(data => { if (alive) setState(data) })
          .catch(err => { if (alive) setError(String((err && err.message) || err)) })
        return () => { alive = false }
      }, [])

      const origin = typeof location !== 'undefined' ? location.origin : ''
      const consoleUrl = origin + HOST + '/workbench'

      // 手机上没有 clipboard API（非 HTTPS / 内嵌 WebView）—— 兜底三步走，别静默失败。
      const copy = async () => {
        const text = consoleUrl
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
          } else {
            const area = document.createElement("textarea")
            area.value = text
            area.setAttribute("readonly", "")
            area.style.position = "fixed"; area.style.opacity = "0"; area.style.top = "0"
            document.body.appendChild(area)
            area.select(); area.setSelectionRange(0, text.length)
            const ok = document.execCommand("copy")
            document.body.removeChild(area)
            if (!ok) throw new Error("execCommand 失败")
          }
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch (e) {
          // 最后一道：把地址弹出来让人手动长按复制（手机上是能用的）
          window.prompt("长按复制这个地址", text)
        }
      }

      const button = (path, label) => h('a', {
        key: path,
        href: origin + HOST + path,
        target: '_blank',
        rel: 'noreferrer',
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8, textDecoration: 'none',
          border: '1px solid var(--color-border, rgba(128,128,128,.35))',
          color: 'var(--color-text, inherit)', fontSize: 13, fontWeight: 500,
          background: 'var(--color-surface, transparent)',
        },
      }, label)

      const backend = state && state.config ? String(state.config.imageBackend || '') : ''
      const backendName = backend === 'comfyui' ? '可瑞二 · RunningHub 按秒' : backend === 'novelai' ? '诺维艾 · 按张计费' : backend || '—'
      const skill = state && state.config && state.config.skillEffective ? String(state.config.skillEffective.name || '') : ''
      const dataRoot = state && state.host ? String(state.host.dataRoot || '') : ''
      const command = state && state.host && state.host.command ? String(state.host.command.name || '') : ''

      return h('div', { style: { display: 'grid', gap: 14, maxWidth: 720 } },
        h('div', null,
          h('h3', { style: { margin: 0, fontSize: 15 } }, t('tab.title')),
          h('p', { style: { margin: '4px 0 0', fontSize: 12.5, opacity: 0.7 } }, t('tab.subtitle'))),

        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          button('/workbench', t('tab.openConsole')),
          button('/pipeline', t('tab.openPipeline')),
          button('/raw', t('tab.openRaw')),
          h('button', {
            onClick: copy,
            style: {
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              border: '1px solid var(--color-border, rgba(128,128,128,.35))',
              background: 'transparent', color: 'var(--color-text, inherit)',
            },
          }, copied ? t('tab.copied') : t('tab.copy'))),

        h('div', { style: { fontSize: 12, opacity: 0.7, wordBreak: 'break-all' } },
          t('tab.addressLabel') + '：' + consoleUrl),

        error
          ? h('p', { style: { fontSize: 12.5, color: 'var(--color-warning, #b45309)' } },
            t('tab.unavailable') + '（' + error + '）')
          : state
            ? h('div', null,
              h(StatusRow, { label: t('tab.backendLabel'), value: backendName }),
              h(StatusRow, { label: t('tab.dataRootLabel'), value: dataRoot || '—' }),
              h(StatusRow, { label: t('tab.skillLabel'), value: skill || '—' }),
              h(StatusRow, { label: t('tab.commandLabel'), value: command ? '/' + command : '—' }))
            : h('p', { style: { fontSize: 12.5, opacity: 0.7 } }, t('tab.loading')))
    }

    /**
     * 手机上的兜底入口：浮在右下角的圆形按钮。
     * 照搬骚货生成器/立绘工坊那套 —— 那几个毛病是同一批：
     *   · 挤在容器里被裁掉 / 被别的层压住 → position:fixed + z-index 很高
     *   · 落在手机底部手势区点不到 → env(safe-area-inset-bottom) 垫高
     *   · 点一下先高亮、要等一下才生效 → touch-action:manipulation + 关掉 tap-highlight
     *   · 触摸事件被父层吃掉 → 用原生 <a href> 跳转，不依赖事件冒泡
     */
    function FloatingButton() {
      const origin = typeof location !== "undefined" ? location.origin : ""
      return h("a", {
        // 手机上直接进 `/m` 那一页（整行大按钮，56px 高），别去点控制台里的小控件
        href: origin + HOST + "/m",
        target: "_blank",
        rel: "noreferrer",
        title: "出图控制台",
        "aria-label": "出图控制台",
        style: {
          position: "fixed",
          right: 14,
          bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          zIndex: 2147483000,
          width: 52, height: 52, borderRadius: 26,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, lineHeight: 1, textDecoration: "none",
          background: "rgba(30,30,34,.92)",
          border: "1px solid rgba(255,255,255,.28)",
          boxShadow: "0 6px 18px rgba(0,0,0,.45)",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
          cursor: "pointer",
        },
      }, "🎨")
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // 文案走 locale 服务（没有就退回 key 本身，不至于白屏）
        let t = (key) => key
        try {
          const locale = ctx.get && ctx.get('locale')
          if (locale && typeof locale.bind === 'function') {
            locale.register('dsh-ca-image-console', 'zh', {
              'tab.label': '出图控制台', 'tab.title': '出图控制台',
              'tab.subtitle': 'dsh-ca-image 的设置、提示词与出图记录都在这个页面里。',
              'tab.openConsole': '打开控制台', 'tab.openPipeline': '看流程图', 'tab.openRaw': '看原始提示词',
              'tab.copy': '复制地址', 'tab.copied': '地址已复制',
              'tab.loading': '正在读状态…',
              'tab.unavailable': '读不到状态：这个 profile 里没装 dsh-ca-image，或者它的服务没起来。',
              'tab.backendLabel': '当前后端', 'tab.dataRootLabel': '数据根',
              'tab.skillLabel': '生效技能', 'tab.commandLabel': '斜杠命令', 'tab.addressLabel': '地址',
            })
            locale.register('dsh-ca-image-console', 'en', {
              'tab.label': 'Image Console', 'tab.title': 'Image Console',
              'tab.subtitle': 'Settings, prompts, and generated images all live on this page.',
              'tab.openConsole': 'Open console', 'tab.openPipeline': 'View pipeline', 'tab.openRaw': 'View raw prompts',
              'tab.copy': 'Copy address', 'tab.copied': 'Address copied',
              'tab.loading': 'Reading status…',
              'tab.unavailable': 'No status: dsh-ca-image is not installed in this profile, or its service is not running.',
              'tab.backendLabel': 'Backend', 'tab.dataRootLabel': 'Data root',
              'tab.skillLabel': 'Active skill', 'tab.commandLabel': 'Slash command', 'tab.addressLabel': 'Address',
            })
            t = locale.bind('dsh-ca-image-console')
          }
        } catch {
          // locale 不在就继续用 key，不影响入口本身
        }

        // 三处入口一起挂 —— 目标是"**总有一处找得到**"，不是"猜他在哪一层菜单"。
        //  ① 设置里**单独一页**（设置侧栏那一列，和「通用 / 模型 / 插件」并列）← 最好找
        //  ② 设置 → 插件 里的**一个页签**
        //  ③ 侧栏底部设置按钮旁边的**一个图标**
        const panel = (slotProps) => h(ConsoleTab, { ...slotProps, t })

        try {
          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'ca-image-console',
            order: 80,
            label: t('tab.label'),
          }, panel))
        } catch (error) { console.warn('[dsh-ca-image-console] settings.section 挂不上：' + error) }

        try {
          ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
            name: 'settings.plugins.tab',
            id: 'dsh-ca-image-console',
            order: 20,
            label: t('tab.label'),
          }, panel))
        } catch (error) { console.warn('[dsh-ca-image-console] settings.plugins.tab 挂不上：' + error) }

        try {
          ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
            name: 'sidebar.footer.action',
            id: 'ca-image-console-foot',
            order: 30,
            label: t('tab.footLabel'),
          }, () => h('a', {
            href: '/plugins/dsh-ca-image/m',
            target: '_blank',
            rel: 'noreferrer',
            // 兜底：locale 没绑上时 t() 只回 key，那样 title 会显示 "tab.footLabel"
            title: '出图控制台',
            style: { fontSize: 16, textDecoration: 'none', lineHeight: 1, padding: '2px 4px' },
          }, '🎨')))
        } catch (error) { console.warn('[dsh-ca-image-console] sidebar.footer.action 挂不上：' + error) }

        // 手机上还有一条：浮在页面上的圆按钮（不依赖任何菜单层级）。
        // `shell.overlay` 是"框架级浮层，在所有列之上"的槽 —— FAB 就该住这儿。
        try {
          ctx.slots.inject("shell.overlay", () => ctx.slots.register({
            name: "shell.overlay",
            id: "ca-image-console-fab",
            order: 900,
          }, FloatingButton))
        } catch (error) { console.warn("[dsh-ca-image-console] shell.overlay 挂不上：" + error) }

        // 第四处：`dsh-ca-image` 这个包在「插件」页里的**自己那一页**（keyed slot，key = 包名）。
        try {
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: 'dsh-ca-image',
          }, panel))
        } catch { /* 加分项，失败不影响别处 */ }
      },
    }
  },
})
