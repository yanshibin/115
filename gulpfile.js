// gulpfile.js
const gulp = require('gulp');
const cleanCSS = require('gulp-clean-css');
const sass = require('gulp-sass')(require('sass'));
const imagemin = require('gulp-imagemin');
const terser = require('gulp-terser');
const del = require('del');

// 清理 dist 目录
gulp.task('clean', function () {
  return del(['dist']);
});

// 处理 SCSS 文件
gulp.task('styles', function () {
  return gulp.src('src/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCSS())
    .pipe(gulp.dest('dist'));
});

// 处理 JavaScript 文件
gulp.task('scripts', function () {
  return gulp.src('src/**/*.js')
    .pipe(terser())
    .pipe(gulp.dest('dist'));
});

// 压缩图片
gulp.task('images', function () {
  return gulp.src('src/images/**/*')
    .pipe(imagemin())
    .pipe(gulp.dest('dist/images'));
});

// 构建任务
gulp.task('publish', gulp.series('clean', 'styles', 'scripts', 'images'));
