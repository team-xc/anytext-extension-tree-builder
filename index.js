const global = {
  editor: null,
  options: null,
  setting: (key) => {
    const defaultValue = options.find(option => option.key === key).defaultValue
    return global.options.get(key, defaultValue)
  },
  handleDirectoryEntry: async (dirHandle, out = {}) => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        out[file.name] = file
      }

      if (entry.kind === 'directory') {
        const newHandle = await dirHandle.getDirectoryHandle(entry.name, {create: false})
        const newOut = out[entry.name] = {}
        await global.handleDirectoryEntry(newHandle, newOut)
      }
    }

    Object.keys(out).sort().forEach(key => {
      const value = out[key]
      delete out[key]
      out[key] = value
    })

    return out
  },
  generateTree: (files, lines, options) => {
    const {prefix = '', symbol = {}, ignore = ''} = options
    const {branch = '', lastBranch = '', vertical = '', whitespace = ''} = symbol
    const space = whitespace.repeat(branch.length - vertical.length)

    const keys = Object.keys(files)
    for (let i = 0; i < keys.length; i++) {
      const isLast = i === keys.length - 1
      const file = keys[i]

      if (ignore && new RegExp(ignore).test(file)) continue

      lines.push(`${prefix}${isLast ? lastBranch : branch}${file}`)

      if (!(files[file] instanceof File)) {
        global.generateTree(files[file], lines, {
          prefix: `${prefix}${isLast ? space : vertical}${space}`,
          symbol,
          ignore
        })
      }
    }

    return lines
  }
}

export const activate = ({options, basic: {CodeEditor}}) => {
  global.options = options
  return CodeEditor({
    onRef: ref => global.editor = ref
  })
}

export const run = ({progress, notification}) => {
  window['showDirectoryPicker'].call(null).then(async dirHandle => {
    const {kind, name} = dirHandle
    if (kind === 'directory') {
      progress['set'](100)
      const files = await global.handleDirectoryEntry(dirHandle)
      const root = global.setting('setting.showRoot') ? [name] : []
      const tree = global.generateTree(files, root, {
        symbol: {
          branch: global.setting('setting.symbol.branch'),
          lastBranch: global.setting('setting.symbol.lastBranch'),
          vertical: global.setting('setting.symbol.vertical'),
          whitespace: global.setting('setting.symbol.whitespace')
        },
        ignore: global.setting('setting.ignoreRegexp')
      })
      global.editor['setValue'](tree.join('\n'))
      progress['hide']()
      notification.send('??????????????????', 'success')
    } else {
      notification.send('??????????????????', 'error')
    }
  }).catch(error => {
    notification.send(error.message, 'error')
  })
}

export const abort = ({notification}) => {
  notification.send('??????????????????', 'error')
}

export const options = [
  {
    key: 'setting.showRoot',
    label: '???????????????',
    description: '?????????????????????',
    defaultValue: true,
    type: 'boolean'
  },
  {
    key: 'setting.ignoreRegexp',
    label: '????????????',
    description: '???????????????????????????\\f[c=#8477ff]?????????????????????',
    defaultValue: '^\\..*|node_modules',
    validator: value => {
      try {
        new RegExp(value)
        return true
      } catch (_) {
        return false
      }
    },
    type: 'string'
  },
  {
    key: 'setting.symbol.branch',
    label: '????????????',
    defaultValue: '????????? ',
    type: 'string'
  },
  {
    key: 'setting.symbol.lastBranch',
    label: '????????????????????????',
    defaultValue: '????????? ',
    type: 'string'
  },
  {
    key: 'setting.symbol.vertical',
    label: '????????????',
    defaultValue: '???',
    type: 'string'
  },
  {
    key: 'setting.symbol.whitespace',
    label: '????????????',
    defaultValue: ' ',
    type: 'string'
  }
]

export const config = {
  name: '??????????????????',
  description: '??????????????????????????????????????????',
  id: 'cn.xcteam.tree',
  icon: 'far fa-list-tree',
  version: '1.0.0',
  author: {
    name: 'Lxc',
    url: 'https://xcteam.cn'
  },
  engine: 'v0.0.1'
}