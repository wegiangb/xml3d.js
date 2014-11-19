"use strict";

exports = module.exports = function (grunt) {

    var path = require("path");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        version: {
            number: "<%= pkg.version %>",
            dev: 'DEVELOPMENT SNAPSHOT (<%= grunt.template.today("dd.mm.yyyy HH:MM:ss Z") %>)'
        },
         dirs: {
                modules: "build/output/modules"
         },

        // Path configurations
        libDir: "src/",
        testDir: "tests/",
        docDir: "doc/",
        buildDir: "build/output",

        releaseName: "<%= buildDir %>/<%= pkg.name %>",

        clean: {
            release: ["<%= releaseName %>"],
            debug: ["<%= pkg.name %>"],
            doc: ["<%= docDir %>"]
        },

        concat: {
            options: {
                process: function(src, filepath) {
                    switch (filepath) {
                        case "src/xml3d.js": return src.replace('%VERSION%', grunt.config.get("version.dev") );
                        case "LICENSE": return "/**\n" + src + "\n@version: " + grunt.config.get("version.dev") +"\n**/";
                        default: return src;
                    }
                }
            },
            dist: {
                src: [
                    "LICENSE",
                    "src/xml3d.js",
                    "<%= dirs.modules %>/xml3d-utils-module.js",
                    "<%= dirs.modules %>/xml3d-contrib-module.js",
                    "<%= dirs.modules %>/xml3d-math-module.js",
                    "<%= dirs.modules %>/xml3d-types-module.js",
                    "<%= dirs.modules %>/xml3d-base-module.js",
                    "<%= dirs.modules %>/xml3d-interface-module.js",
                    "<%= dirs.modules %>/xml3d-xflow-module.js",
                    "<%= dirs.modules %>/xml3d-asset-module.js",
                    "<%= dirs.modules %>/xml3d-data-module.js",
                    "<%= dirs.modules %>/xml3d-renderer-module.js"
                ],
                dest: '<%= releaseName %>',
                nonull: true
            }

        },
        "closure-compiler": {
            frontend: {
                closurePath: './build/closure',
                js: '<%= releaseName %>',
                jsOutputFile: "<%= buildDir %>/xml3d-min.js",
                maxBuffer: 500,
                options: {
                    //compilation_level: 'ADVANCED_OPTIMIZATIONS', language_in: 'ECMASCRIPT5_STRICT'
                }
            }
        }, connect: {
            server: {
                options: {
                    port: 9001,
                    open: "http://localhost:9001/tests/all.html"
                }
            }
        },
        uglify: {
            "<%= releaseName %>": "<%= releaseName %>"
        }


    });

    var moduleBuilds = [];

    grunt.file.expand({filter: "isFile"}, "./src/**/build.json").forEach(function (configFile) {
        grunt.log.writeln("Reading file: " + configFile);
        var modulePath = path.dirname(configFile);
        var moduleConfig = grunt.file.readJSON(configFile);
        var destFile = grunt.config.get("dirs.modules") + "/xml3d-" + moduleConfig.module + "-module.js";
        var taskName = moduleConfig.task || "concat";

        var srcFiles = taskName == "concat" ? moduleConfig.files.map(function(name) { return modulePath + "/" + name; }) : modulePath + "/index.js";


        var config = {}, options = {}, task = config[taskName] = {};

        if (taskName == "browserify") {
            options["browserifyOptions"] = {
                debug: true, standalone: "XML3D"
            }
        }

        task[moduleConfig.module] = {
            src: srcFiles,
            dest: destFile,
            nonull: true
        };

        grunt.config.merge(config);
        moduleBuilds.push({
            task: taskName + ":" + moduleConfig.module,
            dest: destFile
        });
    });


    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks('grunt-closure-compiler');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-connect');

    var builds = moduleBuilds.map(function(f) { return f.task });
    builds.push("concat:dist");

    grunt.registerTask("merge", builds);
    grunt.registerTask("dev", ["merge"]);
    grunt.registerTask("min", ["merge", "closure-compiler"]);
    grunt.registerTask("default", ["dev"]);
    grunt.registerTask("testserver", ["connect:server:keepalive"]);

    //grunt.registerTask("dev", ["browserify:debug"]);
    //grunt.registerTask("test", ["mochaTest:test"]);

    //grunt.registerTask("prepublish", ["clean", "test", "build"]);
};
