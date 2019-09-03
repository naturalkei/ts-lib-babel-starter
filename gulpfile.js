const gulp = require('gulp')
const log = require('fancy-log')
const path = require('path')
const sourcemaps = require('gulp-sourcemaps')
const clean = require('gulp-clean')
const ts = require('gulp-typescript')
const merge = require('merge-stream')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const babel = require('babelify')
const watchify = require('watchify')
const isNil = require('lodash/isNil')

const join = path.join

const BUILD_DIR = 'build'
const DIST_DIR = 'dist'
const SourceList = ['src/**/*.ts']
const BabelOptions = {
  presets: [
    ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
  ]
}

let umdBundler
let tsCommonJs
let tsEsModule

gulp.task('default', done => {
  log('default task.. ok!')
  done()
})

gulp.task('clean', () => {
  return gulp.src([
    BUILD_DIR,
    DIST_DIR
  ], { allowEmpty: true })
    .pipe(clean({ force: true }))
})

// Common JS
gulp.task('build:cjs', done => {
  tsCommonJs = tsCommonJs || ts.createProject('tsconfig.json')
  const tsResult = gulp.src(SourceList)
    .pipe(sourcemaps.init())
    .pipe(tsCommonJs())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(gulp.dest(join(BUILD_DIR, 'main')))
})

// ES Modules
gulp.task('build:esm', done => {
  tsEsModule = tsEsModule || ts.createProject('tsconfig.module.json')
  const tsResult = gulp.src(SourceList)
    .pipe(sourcemaps.init())
    .pipe(tsEsModule())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(gulp.dest(join(BUILD_DIR, 'module')))
})

// UMD
gulp.task('build:umd', gulp.series(...[
  'build:cjs',
  done => {
    umdBundler = umdBundler || browserify(
      'build/main/index.js', {
        debug: true
      }).transform(babel, BabelOptions)
    return umdBundler.bundle()
      .on('error', err => {
        log.error(err)
        this.emit('end')
      })
      .pipe(source('ibsheet-loader.min.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(DIST_DIR))
      .on('end', () => done())
  }
]))

// UMD + Minify
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
  // parellel tasks
  [
    'build:esm',
    // commonjs && umd
    'build:umd'
  ]
]))
