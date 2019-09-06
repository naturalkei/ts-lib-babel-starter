const {
  task, src, dest,
  series, parallel
} = require('gulp')
const log = require('fancy-log')
const chalk = require('chalk')
const { join, relative } = require('path')
const fs = require('fs')
const {
  isNil, get, set,
  find, castArray,
  pick, isEmpty
} = require('lodash')
const ava = require('gulp-ava')
const banner = require('gulp-banner')
const clean = require('gulp-clean')
const rename = require('gulp-rename')
// https://github.com/gulp-sourcemaps/gulp-sourcemaps
const sourcemaps = require('gulp-sourcemaps')
const ts = require('gulp-typescript')
const watch = require('gulp-watch')
const merge = require('merge-stream')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const babel = require('babelify')
const pump = require('pump')

const relativeRoot = (...args) => {
  args.unshift(__dirname)
  return relative(__dirname, join.apply(null, args))
}
const BUILD_BASE_DIR = relativeRoot('build')
const TsProjectData = [
  {
    name: 'cjs',
    config: 'tsconfig.json',
    dist: join(BUILD_BASE_DIR, 'main')
  },
  {
    name: 'esm',
    config: 'tsconfig.module.json',
    dist: join(BUILD_BASE_DIR, 'module')
  }
].map(obj => {
  set(obj, 'project', null)
  return obj
})
const getTsConfig = (name, sPath, def) => {
  const data = find(TsProjectData, { name })
  if (isNil(data)) throw new Error(`not found ${name} project data`)
  if (isNil(sPath)) return data
  return get(data, sPath, def)
}
const DIST_BASE_DIR = relativeRoot('dist')
const UMD_SRC_FILEPATH = join(getTsConfig('esm', 'dist'), 'index.js')
const UMD_OUTPUT_NAME = 'bundle'
const UMD_OUTPUT_FILE = `${UMD_OUTPUT_NAME}.js`
const UMD_OUTPUT_PATH = join(DIST_BASE_DIR, UMD_OUTPUT_FILE)

const SourceFiles = ['src/**/*.ts']

let _minify
const getMinify = () => {
  if (isNil(_minify)) {
    const uglify = require('uglify-js')
    // https://github.com/terinjokes/gulp-uglify#using-a-different-uglifyjs
    const composer = require('gulp-uglify/composer')
    // uglify, logger
    _minify = composer(uglify, log)
  }
  return _minify
}
let bannerStr
const getBanner = () => {
  if (isNil(bannerStr)) {
    const { multibanner } = require('bannerjs')
    const pkg = require('./package.json')
    bannerStr = multibanner(pick(pkg, [
      'author',
      'name',
      'license',
      'version',
      'description',
      'homepage'
    ]))
    log(chalk.gray('\n' + bannerStr))
  }
  return bannerStr
}

const exists = file => {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK | fs.constants.W_OK, err => {
      let msg = null
      let bool = true
      if (err) {
        bool = false
        msg = chalk.gray(`"${file}" ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`)
      }
      return resolve({
        file,
        exist: bool,
        message: msg
      })
    })
  })
}

const cleanRealPath = async (target, done) => {
  if (isNil(target)) return done()
  const arr = castArray(target).slice()
  const checklist = arr.map(file => exists(file))
  let newSrc
  await Promise.all(checklist).then(result => {
    newSrc = result
      .filter(data => data.exist)
      .map(data => data.file)
  }).catch(err => log(err))
  if (isEmpty(newSrc)) {
    log(chalk.gray('skip clean'))
    return done()
  }
  log(chalk.green(`clean: ${newSrc.join(', ')}`))
  return src(newSrc).pipe(clean({ force: true }))
}

const tsBuild = (name, done) => {
  const tsData = getTsConfig(name)
  let tsProject = get(tsData, 'project')
  if (isNil(tsProject)) {
    tsProject = ts.createProject(tsData.config)
    set(tsData, 'project', tsProject)
  }
  const tsResult = src(SourceFiles)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(dest(tsData.dist))
    .on('end', () => done())
}

const createTsWatchTask = (name, tasks) => {
  let moduleType
  switch (name) {
    case 'cjs': moduleType = 'Common JS'; break
    case 'esm': moduleType = 'ES Modules'; break
    case 'umd': moduleType = 'UMD'; break
    default: throw new Error(`undefined ${name} module type`)
  }
  task(`watch:${name}`, series(
    tasks,
    function watchTsProject (done) {
      log(chalk.black.bgGreen(` ${moduleType} `), 'watch process starting')
      return watch(SourceFiles, tasks)
    }
  ))
}

// ********** [ Default Task ] **********
task('default', done => {
  log('default task.. ok!')
  done()
})

// ********** [ Clean Tasks ] **********
task('clean:build', done => cleanRealPath(BUILD_BASE_DIR, done))
task('clean:dist', done => cleanRealPath(DIST_BASE_DIR, done))
task('clean:umd', () => {
  const files = join(DIST_BASE_DIR, `${UMD_OUTPUT_NAME}.*`)
  log(chalk.green(`clean: ${files}`))
  return src(files).pipe(clean({ force: true }))
})
task('clean', parallel(...['build', 'dist'].map(dir => 'clean:' + dir)))

// ********** [ Unit Tests ] **********
task('test:unit', done => {
  return src('src/**/*.spec.ts')
    .pipe(ava({ verbose: true }))
    .on('finish', () => done())
})

// ********** [ Build: Common JS, ES Modules ] **********
;['cjs', 'esm'].forEach(name => {
  task(`clean:${name}`, done => {
    return cleanRealPath(getTsConfig(name, 'dist'), done)
  })
  task(`build:${name}`, series(
    `clean:${name}`,
    function tsProjectBuild (done) {
      return tsBuild(name, done)
    }
  ))
  createTsWatchTask(name, parallel('test:unit', `build:${name}`))
})

// ********** [ Build: UMD ] **********
let umdBundler

task('build:umd', series(
  'build:esm',
  'clean:umd',
  function umdBundle (done) {
    if (isNil(umdBundler)) {
      umdBundler = browserify(UMD_SRC_FILEPATH, { debug: true })
        .transform(babel)
    }
    return umdBundler.bundle()
      .on('error', err => {
        log.error(err)
        this.emit('end')
      })
      .pipe(source(UMD_OUTPUT_FILE))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(banner(getBanner()))
      .pipe(dest(DIST_BASE_DIR))
      .on('end', () => done())
  }
))

// Build: UMD + Minify
task('build:umd.min', series(
  'build:umd',
  function umdMinify (done) {
    const minify = getMinify()
    pump([
      src(UMD_OUTPUT_PATH),
      sourcemaps.init({ loadMaps: true }),
      minify({
        // https://github.com/mishoo/UglifyJS2#minify-options
        mangle: true
      }),
      rename({ suffix: '.min' }),
      sourcemaps.write('.'),
      banner(getBanner()),
      dest(DIST_BASE_DIR)
    ], done)
  }
))

// Watch: UMD
createTsWatchTask('umd', parallel('test:unit', 'build:umd'))

// ********** [ Build All ] **********
task('build', series(
  'clean',
  parallel(
    'build:cjs',
    // series(build:esm, build:umd)
    'build:umd.min'
  )
))
