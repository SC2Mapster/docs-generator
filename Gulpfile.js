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

function reload(done) {
    server.reload();
    done();
}

// function serve(done) {
//     server.init({
//         proxy: 'http://localhost:3100',
//         open: false,
//         // logLevel: 'debug',
//         logConnections: true,
//         // files: ['public/**/*.*'],
//     });
//     done();
// }

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
    let stream;

    stream = nodemon({
        watch: ['src/renderer.ts', 'src/context.ts', 'src/page/**/*.ts', 'templates/**/*.nj'],
        ext: 'ts scss nj',
        // tasks: function(changes) {
        //     var tasks = [];
        //     if (!changes) return tasks;
        //     changes.forEach(function(file) {
        //         //if ( path.extname(file) === '.ts' && !~tasks.indexOf("compileTypescript") ) tasks.push("compileTypescript");
        //         if ( path.extname(file) === '.ts' ) stream.emit("restart", 0);
        //         if ( path.extname(file) === '.nj' ) stream.emit("restart", 0);
        //         if ( path.extname(file) === '.scss' && !~tasks.indexOf("style") ) {
        //             tasks.push("style");
        //             tasks.push("reload");
        //         }
        //         //if ( path.extname(file) === '.nj' && !~tasks.indexOf("reload") ) tasks.push("reload");
        //     })
        //     //tasks.push("reload");
        //     return tasks;
        // },
        exec: 'ts-node ./src/main.ts serve',
        stdout: false,
        env: {
            TEMPLATE_WATCH: true,
        },
        done: done,
    });

    stream.on("start", function() {
        server.init({
            proxy: 'http://localhost:3100',
            open: false,
            // logLevel: 'debug',
            logConnections: true,
            // files: ['public/**/*.*'],
        }, function() {
            console.log("wtflulz");
        });
    })

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

const watchStyles = () => watch('./theme/**/*.scss', style);

exports.reload = reload;
exports.style = style;
exports.default = parallel(style, watchStyles, monitor);
