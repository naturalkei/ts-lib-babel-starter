const gulp = require('gulp')
const log = require('fancy-log')
const chalk = require('chalk')
const path = require('path')
// https://github.com/gulp-sourcemaps/gulp-sourcemaps
const sourcemaps = require('gulp-sourcemaps')
const gulpClean = require('gulp-clean')
const ts = require('gulp-typescript')
const merge = require('merge-stream')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const babel = require('babelify')
const banner = require('gulp-banner')
const bannerjs = require('bannerjs')
const pump = require('pump')
const rename = require('gulp-rename')
const watchify = require('watchify')
const fs = require('fs')

const isNil = require('lodash/isNil')
const get = require('lodash/get')
const set = require('lodash/set')
const find = require('lodash/find')
const castArray = require('lodash/castArray')
const pick = require('lodash/pick')
const isEmpty = require('lodash/isEmpty')

const join = path.join

const BUILD_BASE_DIR = 'build'
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
const DIST_BASE_DIR = 'dist'
const UMD_SRC_FILEPATH = join(getTsConfig('esm', 'dist'), 'index.js')
const UMD_OUTPUT_FILE = 'ibsheet-loader.js'
const UMD_OUTPUT_PATH = join(DIST_BASE_DIR, UMD_OUTPUT_FILE)

const SourceList = ['src/**/*.ts']

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
const getBanner = bool => {
  if (isNil(bannerStr)) {
    const pkg = require('./package.json')
    bannerStr = bannerjs.multibanner(pick(pkg, [
      'author',
      'name',
      'license',
      'version',
      'description',
      'homepage'
    ]))
  }
  if (bool) {
    log(chalk.gray('\n' + bannerStr))
  }
  return bannerStr
}
// const BabelOptions = {
//   presets: [
//     ['@babel/preset-env', {
//       targets: '> 0.25%, not dead'
//     }]
//   ]
// }

const exists = file => {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK | fs.constants.W_OK, err => {
      let msg = null
      let bool = true
      if (err) {
        bool = false
        msg = `"${file}" ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`
        msg = chalk.gray(msg)
      }
      return resolve({
        file,
        exist: bool,
        message: msg
      })
    })
  })
}

const clean = async (src, done) => {
  const tmpArr = castArray(src).slice()
  const prmTasks = tmpArr.map(file => exists(file))
  let newSrc
  await Promise.all(prmTasks).then(result => {
    newSrc = result
      .filter(data => data.exist)
      .map(data => data.file)
  }).catch(err => log(err))
  if (isEmpty(newSrc)) return done()
  return gulp.src(newSrc)
    .pipe(gulpClean({ force: true }))
    .on('finish', () => {
      const msg = `* clean: ${newSrc.join(', ')}`
      log(chalk.green(msg))
    })
}

let umdBundler

const tsBuild = (name, done) => {
  const tsData = getTsConfig(name)
  let tsProject = get(tsData, 'project')
  if (isNil(tsProject)) {
    tsProject = ts.createProject(tsData.config)
    set(tsData, 'project', tsProject)
  }
  const tsResult = gulp.src(SourceList)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(gulp.dest(tsData.dist))
    .on('end', () => done())
}

gulp.task('default', done => {
  log('default task.. ok!')
  done()
})

gulp.task('clean:test', done => {
  return clean([
    'build/main',
    'coverage',
    'build/src',
    'dist',
    'build/module',
    'build/test',
    'test'
  ], done)
})

gulp.task('clean:build', done => {
  return clean(BUILD_BASE_DIR, done)
})
gulp.task('clean:dist', done => {
  return clean(DIST_BASE_DIR, done)
})

gulp.task('clean', gulp.parallel([
  'build', 'dist'
].map(dir => 'clean:' + dir)))

// build:cjs, build:esm
;['cjs', 'esm'].forEach(name => {
  gulp.task(`build:${name}`, gulp.series(...[
    function cleanDest (done) {
      return clean(getTsConfig(name, 'dist'), done)
    },
    function tsProjectBuild (done) {
      return tsBuild(name, done)
    }
  ]))
})

// build:umd
gulp.task('build:umd', gulp.series(...[
  'build:esm',
  'clean:dist',
  function umdBuild (done) {
    umdBundler = umdBundler || browserify(
      UMD_SRC_FILEPATH, { debug: true }).transform(babel)
    return umdBundler.bundle()
      .on('error', err => {
        log.error(err)
        this.emit('end')
      })
      .pipe(source(UMD_OUTPUT_FILE))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(banner(getBanner(true)))
      .pipe(gulp.dest(DIST_BASE_DIR))
      .on('end', () => done())
  }
]))

// Build: UMD + Minify
gulp.task('build:umd.min', gulp.series(...[
  'build:umd',
  function umdMinify (done) {
    const minify = getMinify()
    pump([
      gulp.src(UMD_OUTPUT_PATH),
      sourcemaps.init({ loadMaps: true }),
      minify({
        // https://github.com/mishoo/UglifyJS2#minify-options
        mangle: true
      }),
      rename({ suffix: '.min' }),
      sourcemaps.write('.'),
      banner(getBanner()),
      gulp.dest(DIST_BASE_DIR)
    ], done)
  }
]))

gulp.task('watch', done => {
  log('TODO: watch task')
  done()
})

gulp.task('build', gulp.series(...[
  'clean',
  [
    'build:cjs',
    // build:esm --> build:umd
    'build:umd.min'
  ]
]))
