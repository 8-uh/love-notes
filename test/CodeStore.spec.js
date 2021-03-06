import test from 'ava'

import unified from 'unified'
import select from 'unist-util-select'
import jetpack from 'fs-jetpack'
import debug from 'debug'

import fmt from 'fmt-obj'

import CodeStore from '../src/CodeStore'
import {truncValues} from '../src/utils'
import utils from './test-utils'

const {mocks} = utils

const fs = jetpack
const log = debug('CodeStore.spec:log')
var store

test.beforeEach(() => {
  store = new CodeStore()
})

test('CodeStore instantiates properly', t => {
  t.true(!!store.codefiles, 'codefile collection created')
  t.is(store.codefiles.length, 0, 'codefiles array contains no codefiles')
})



test('CodeStore#addCodeFile', t => {
  const f1 = store.addCodeFile()
  const f2 = store.addCodeFile('utils.js')

  t.is(store.codefiles.length, 2)
  t.is(store.codefiles[0].name, 'index.js')
  t.is(store.codefiles[1].name, 'utils.js')

  t.truthy(f1, 'returns the newly created CodeFile')
  t.is(f1.name, 'index.js')

  t.truthy(f2,'returns the newly created CodeFile')
  t.is(f2.name, 'utils.js')

  t.throws(() => store.addCodeFile('index.js'), ReferenceError, 'should error when duplicate filename found')
})

test('CodeStore#findCodeFileByName', t => {
  store.addCodeFile()
  store.addCodeFile('utils.js')

  var file = store.findCodeFileByName('index.js')
  t.truthy(file)
  t.is(file.name, 'index.js')
  var file = store.findCodeFileByName('utils.js')
  t.truthy(file)
  t.is(file.name, 'utils.js')
  t.falsy(store.findCodeFileByName('greet.js'))
})

test('CodeStore#parseLang', t => {
  var {filename, section} = store.parseLang()
  t.is(filename, 'index.js')
  t.is(section, 'root')

  var {filename, section} = store.parseLang('js')
  t.is(filename, 'index.js')
  t.is(section, 'root')

  var {filename, section} = store.parseLang('js > index.js')
  t.is(filename, 'index.js')
  t.is(section, 'root')

  var {filename, section} = store.parseLang('js > index.js#default')
  t.is(filename, 'index.js')
  t.is(section, 'root')

  var {filename, section} = store.parseLang('js > #greet')
  t.is(filename, 'index.js')
  t.is(section, '#greet')

  var {filename, section} = store.parseLang('js > index.js#greet')
  t.is(filename, 'index.js')
  t.is(section, '#greet')

  var {filename, section} = store.parseLang(' > math.js')
  t.is(filename, 'math.js')
  t.is(section, 'root')

  var {filename, section} = store.parseLang(' > math.js#sum-body')
  t.is(filename, 'math.js')
  t.is(section, '#sum-body')
})

test('CodeStore#modifyNodeData', t => {
  const nodes = mocks.test()
  var {data} = store.modifyNodeData(nodes[0])
  t.is(data.filename, 'index.js')
  t.is(data.section, 'root')
  t.is(data.childSections[0], '#greet')

  var {data} = store.modifyNodeData(nodes[1])
  t.is(data.filename, 'index.js')
  t.is(data.section, '#greet')

  var {data} = store.modifyNodeData(nodes[2])
  t.is(data.filename, 'math.js')
  t.is(data.section, 'root')

  var {data} = store.modifyNodeData(nodes[3])
  t.is(data.filename, 'math.js')
  t.is(data.section, '#sum-body')

  var {data} = store.modifyNodeData(nodes[4])
  t.is(data.filename, 'math.js')
  t.is(data.section, 'root')
})

test('CodeStore#addNode', t => {
  store.addCodeFile()
  const nodes = mocks.test()
  store.addNode(nodes[0])
  store.addNode(nodes[1])
  const file = store.findCodeFileByName('index.js')
  t.is(file.codesections.length, 2)
  const section = store.codefiles[0].findCodeSectionByName('root')
  const s2 = store.codefiles[0].findCodeSectionByName('#greet')
  t.is(section.children.length, 1)
})

test('CodeStore#generateSource single source file', t => {
  const nodes = mocks.test()

  nodes.forEach((node,i) => {
    store.addNode(node)
  })
  t.is(store.codefiles[0].name, 'index.js')
  t.is(store.codefiles[1].name, 'math.js')

  let src = store.generateSource('index.js')
  t.is(src.trim(), `// this is a code block\nfunction greet() {\n  console.log('hello, world!')\n}\n\ngreet()`)

  src = store.generateSource('math.js')
  t.is(src.trim(), `function sum(a, b) {\n  return a + b\n}\nconsole.log(sum(2, 2))`)
})
