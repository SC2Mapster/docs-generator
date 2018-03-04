const gulp = require('gulp');
const nodemon = require('nodemon');
var browserSync = require('browser-sync');

gulp.task('browser-sync', () => {
	browserSync.init({
        proxy: 'http://localhost:4000',
        open: false,
        // logLevel: 'debug',
        logConnections: true,
        // files: ['public/**/*.*'],
	});
});

gulp.task('nodemon', (done) => {
    var started = false;
    return nodemon({
        'watch': ['src/renderer.ts'],
        'ext': 'ts',
        'exec': 'ts-node ./src/main.ts'
    }).on('start', function () {
        if (!started) {
            done();
            started = true; 
        } 
    }).on('restart', function () {
        setTimeout(function () {
            browserSync.reload({ stream: false });
        }, 2000);
    });
});

gulp.task('watch', function () {
    gulp.watch(['_site/dist/**/*'], browserSync.reload);
});

gulp.task('serve', ['nodemon', 'browser-sync', 'watch']);