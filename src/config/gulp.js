/*eslint-disable no-process-exit*/
import path from 'path';

import del from 'del';
import gulp from 'gulp';
import gulpHelp from 'gulp-help';
import babel from 'gulp-babel';
import shell from 'gulp-shell';
import mocha from 'gulp-spawn-mocha';
import sourcemaps from 'gulp-sourcemaps';

import config from 'config';

// Add `gulp help` and inline descriptions
gulpHelp(gulp);

function build(src, dest='', options) {
  return gulp.src(src)
    .pipe(sourcemaps.init())
    .pipe(babel({stage: 0}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dest));
}

function test(src, reporter='spec', istanbul=true) {
  return gulp.src(src)
    .pipe(mocha({
      env: {
        NODE_PATH: config.ROOT
      },
      istanbul: istanbul,
      reporter: reporter,
      compilers: 'js:babel/register'
    }))
    .on('end', function() { this._child.kill('SIGHUP'); })
    .once('error', err => {
      throw err;
    });
}

gulp.task('clean', 'Clean build directory.', () => {
  return del('./server', {force: true});
});

gulp.task('build', 'Compile source.', () => {
  return build('src/server/**/*.js', 'server');
});

gulp.task('build:watch', 'Watch and rebuild on source changes.', ['build'], () => {
  gulp.watch('src/server/**/*.js', ['build'])
    .on('change', event => console.log('File', event.path, event.type))
    .on('error', err => console.log('Compilation error', err))
});

gulp.task('build:tests', 'Compile tests.', () => {
  return build('src/**/tests/**');
});

gulp.task('test', 'Default: test:src only', ['test:src']);

gulp.task('test:all', 'Run all tests.', ['test:src', 'test:build']);

gulp.task('test:src', 'Run uncompiled tests on uncompiled code.', () => {
  return test('src/server/**/*.spec.js');
});

gulp.task('test:build', 'Run compiled tests on compiled code.', ['build:tests'], () => {
  return test(path.join(config.BUILD_DIR, '**/*.spec.js'), 'spec', false);
});

gulp.task('mongo', 'Launch mongodb.', () => {
  return gulp.src('')
    .pipe(shell([
      'mongod',
      '--dbpath=' + path.join(config.PARENT, '.data/db')
    ].join(' '), {
      cwd: config.ROOT
    }));
});

export default gulp;
