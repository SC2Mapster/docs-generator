const { watch, src, dest, series, parallel } = require("gulp");

const path = require("path");
const uglifycss = require("gulp-uglifycss");
const browserSync = require("browser-sync");
const gulpif = require("gulp-if");
const sourcemaps = require("gulp-sourcemaps");
const sass = require("gulp-sass");
const nodemon = require("gulp-nodemon");
const argv = require("yargs").argv;
const autoprefixer = require("gulp-autoprefixer");

const server = browserSync.create();

function browserSyncReload(done) {
    server.reload();
    done();
}

const config = {
    prod: argv.prod === true
};

function style() {
    return src('./theme/**/*.scss')
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
        .pipe(dest('./_site/dist'))
        .pipe(server.stream({ match: '**/*.css' }));
}

function monitor(done) {
    const stream = nodemon({
        watch: ['src/renderer.ts', 'src/context.ts', 'src/page/**/*.ts'],
        ext: 'ts',
        exec: 'ts-node ./src/main.ts serve',
        stdout: false,
        env: {
            TEMPLATE_WATCH: true,
        },
        done: () => {
            // so this mother fucker is magically catching SIGINT and calls `done`
            // which then allows Gulp to proceed with other tasks or do a clean exit
            console.debug('nodemon SIGINT');
            done();
        },
    });

    const bs = server.init({
        proxy: 'http://localhost:3100',
        open: false,
        logConnections: true,
    });

    stream.on('stderr', function(stderr) {
        console.error(stderr.toString().trimRight());
    });

    stream.on('stdout', function(stdout) {
        console.log(stdout.toString().trimRight());
        if (stdout.toString().includes('Starting local server')) {
            setTimeout(function () {
                server.reload({ stream: false });
            }, 500);
        }
    });

    return stream;
}

function watchFiles(done) {
    watch('./templates/**/*.nj', browserSyncReload);
    watch('./theme/**/*.scss', style);
    done();
}

function generate(done) {
    // TODO: generate pages by spawning ts-node process directly, without yarn
    done();
}

function clean(done) {
    // TODO: cleanup _site/**
    done();
}

// compile static CSS & JS etc.
exports.compile = series(clean, style);

// compile and generate pages
exports.build = series(exports.compile, generate);

// development entry point with browserSync proxy
exports.dev = parallel(monitor, watchFiles);

exports.default = series(exports.compile, parallel(monitor, watchFiles));
