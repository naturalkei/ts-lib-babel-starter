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
const watchify = require('watchify')
// const fs = require('fs')

const isNil = require('lodash/isNil')
const get = require('lodash/get')
const set = require('lodash/set')
const find = require('lodash/find')
const castArray = require('lodash/castArray')
const pick = require('lodash/pick')

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
const UMD_MIN_SOURCE = join(DIST_BASE_DIR, UMD_OUTPUT_FILE)
const SourceList = ['src/**/*.ts']
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

const clean = (src, done) => {
  return gulp.src(src, { allowEmpty: true })
    .pipe(gulpClean({ force: true }))
    .on('end', () => {
      const msg = `* clean: ${castArray(src).join(', ')}`
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

gulp.task('clean:build', () => {
  return clean(BUILD_BASE_DIR)
})
gulp.task('clean:dist', () => {
  return clean(DIST_BASE_DIR)
})

gulp.task('clean', gulp.parallel([
  'build', 'dist'
].map(dir => 'clean:' + dir)))

// build:cjs, build:esm
;['cjs', 'esm'].forEach(name => {
  gulp.task(`build:${name}`, gulp.series(...[
    () => clean(getTsConfig(name, 'dist')),
    done => tsBuild(name, done)
  ]))
})

// build:umd
gulp.task('build:umd', gulp.series(...[
  'build:esm',
  'clean:dist',
  done => {
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
      .pipe(banner(getBanner()))
      .pipe(gulp.dest(DIST_BASE_DIR))
      .on('end', () => done())
  }
]))

// Build: UMD + Minify
gulp.task('build:umd.min', done => {
  log('TODO: bulid - umd.min task')
  done()
})

gulp.task('watch', done => {
  log('TODO: watch task')
  done()
})

gulp.task('build', gulp.series(...[
  'clean',
  [
    'build:cjs',
    // esmodule && umd
    'build:umd'
  ]
]))
