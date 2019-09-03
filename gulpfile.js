const gulp = require('gulp')
const log = require('fancy-log')
const path = require('path')
const isNil = require('lodash/isNil')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const babel = require('babelify')
const watchify = require('watchify')
const sourcemaps = require('gulp-sourcemaps')
const clean = require('gulp-clean')
const ts = require('gulp-typescript')
const merge = require('merge-stream')
// const merge = require('merge2')

const join = path.join

const SRC_LIST = ['src/**/*.ts']
const BUILD_DIR = 'build'
const DIST_DIR = 'dist'

const tsCommonJs = ts.createProject('tsconfig.json')
const tsEsModule = ts.createProject('tsconfig.module.json')

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
  const tsResult = gulp.src(SRC_LIST)
    .pipe(sourcemaps.init())
    .pipe(tsCommonJs())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(gulp.dest(join(BUILD_DIR, 'main')))
})

// ES Modules
gulp.task('build:esm', done => {
  const tsResult = gulp.src(SRC_LIST)
    .pipe(sourcemaps.init())
    .pipe(tsEsModule())
  return merge([
    tsResult.dts,
    tsResult.js.pipe(sourcemaps.write('.'))
  ]).pipe(gulp.dest(join(BUILD_DIR, 'module')))
})

gulp.task('build:umd', done => {
  log('TODO: bulid - umd task')
  done()
})

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
    'build:cjs',
    'build:esm'
  ]
]))
