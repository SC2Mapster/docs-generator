const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const browserSync = require('browser-sync');
const sass = require('gulp-sass');
const gulpif = require('gulp-if');
const uglifycss = require('gulp-uglifycss');
const sourcemaps = require('gulp-sourcemaps');
const argv = require('yargs').argv;
const autoprefixer = require('gulp-autoprefixer');

const config = {
    prod: argv.prod === true
};

gulp.task('browser-sync', () => {
	browserSync.init({
        proxy: 'http://localhost:3100',
        open: false,
        // logLevel: 'debug',
        logConnections: true,
        // files: ['public/**/*.*'],
	});
});

gulp.task('nodemon', (done) => {
    return nodemon({
        watch: ['src/renderer.ts', 'src/context.ts', 'src/page/**/*.ts'],
        ext: 'ts',
        exec: 'ts-node ./src/main.ts serve',
        stdout: false,
        env: {
            TEMPLATE_WATCH: true,
        }
    }).on('start', function () {
    }).on('restart', function () {
    }).on('stderr', function(stderr) {
        console.error(stderr.toString().trimRight());
    }).on('stdout', function(stdout) {
        console.log(stdout.toString().trimRight());
        if (stdout.toString().includes('Starting local server')) {
            setTimeout(function () {
                browserSync.reload({ stream: false });
            }, 500);
        }
    });
});

gulp.task('sass', function () {
    return gulp.src('./theme/**/*.scss')
        .pipe(gulpif(!config.prod, sourcemaps.init()))
        .pipe(sass({
            includePaths: [
                'node_modules/',
            ],
        }).on('error', function(err) {
            console.error('\x07');
            sass.logError.bind(this)(err);
        }))
        .pipe(gulpif(config.prod, autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false,
        })))
        .pipe(gulpif(config.prod, uglifycss()))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./_site/dist'))
        .pipe(browserSync.stream({ match: '**/*.css' }))
    ;
});

gulp.task('watch', function () {
    // gulp.watch(['_site/dist/**/*'], browserSync.reload);
    gulp.watch(['templates/**/*.nj'], browserSync.reload);
    gulp.watch('./theme/**/*.scss', ['sass']);
});

gulp.task('serve', ['nodemon', 'browser-sync', 'watch']);
