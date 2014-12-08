/*jslint node: true */
"use strict";

module.exports = function(grunt) {
  
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        less: {
            dev: {
                src: ['less/*.less'],
                dest: 'static/css/imagezip.css'
            }
        },

        watch: {
            less: {
                files: ['less/*.less'],
                tasks: ['less']
            }
        },

        bower_concat: {
            all: {
                dest: 'static/js/_bower.js',
                cssDest: 'static/css/_bower.css',
                bowerOptions: {
                    relative: false
                }
            }
        }

    });
  
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-bower-concat');
  
    grunt.registerTask('dev', [
        'less'
    ]);
};
