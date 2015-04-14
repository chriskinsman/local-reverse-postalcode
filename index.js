/**
 * @fileoverview Local reverse postal code geocoder based on GeoNames data.
 * @author Chris Kinsman (chris@kinsman.net)
 * @license Apache 2.0
 *
 * @param {(object|object[])} points One single or an array of
 *                                   latitude/longitude pairs
 * @param {integer} maxResults The maximum number of results to return
 * @callback callback The callback function with the results
 *
 * @returns {object[]} An array of GeoNames-based postal code results
 *
 * @example
 * // With just one point
 * var point = {latitude: 42.083333, longitude: 3.1};
 * geocoder.lookUp(point, 1, function(err, res) {
 *   console.log(JSON.stringify(res, null, 2));
 * });
 *
 * // In batch mode with many points
 * var points = [
 *   {latitude: 42.083333, longitude: 3.1},
 *   {latitude: 48.466667, longitude: 9.133333}
 * ];
 * geocoder.lookUp(points, 1, function(err, res) {
 *   console.log(JSON.stringify(res, null, 2));
 * });
 */

'use strict';

var DEBUG = false;

var fs = require('fs');
var path = require('path');
var kdTree = require('kdt');
var request = require('request');
var unzip = require('unzip');
var lazy = require('lazy.js');
var async = require('async');

// All data from http://download.geonames.org/export/zip/
var GEONAMES_URL = 'http://download.geonames.org/export/zip/';

var ALL_COUNTRIES_FILE = 'allCountries';

var POSTALCODE_COLUMNS = [
    'countryCode', // iso country code, 2 characters
    'postalCode', // varchar(10)
    'placeName', // varchar(180)
    'adminName1', // subdivision (state) varchar(100)
    'adminCode1', // order subdivision (state) varchar(20)
    'adminName2', // order subdivision (county/province) varchar(100)
    'adminCode2', // order subdivision (county/province) varchar(20)
    'adminName3', // order subdivision (community) varchar(100)
    'adminCode3', // order subdivision (community) varchar(20)
    'latitude', // estimated latitude (wgs84)
    'longitude', // estimated longitude (wgs84)
    'accuracy' // accuracy of lat/lng from 1=estimated to 6=centroid
];


var GEONAMES_CACHE_DIR = __dirname + '/geonames_cache';

var geocoder = {
    _kdTree: null,

    // Distance function taken from
    // http://www.movable-type.co.uk/scripts/latlong.html
    _distanceFunc: function distance(x, y) {
        var toRadians = function(num) {
            return num * Math.PI / 180;
        };
        var lat1 = x.latitude;
        var lon1 = x.longitude;
        var lat2 = y.latitude;
        var lon2 = y.longitude;

        var R = 6371; // km
        var φ1 = toRadians(lat1);
        var φ2 = toRadians(lat2);
        var Δφ = toRadians(lat2 - lat1);
        var Δλ = toRadians(lon2 - lon1);
        var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    _getGeoNamesPostalCodeData: function _getGeoNamesPostalCodeData(callback) {
        var now = (new Date()).toISOString().substr(0, 10);
        // Use timestamped postal codes file OR bare postal codes file
        var timestampedFilename = GEONAMES_CACHE_DIR + '/postal_codes/' + ALL_COUNTRIES_FILE + '_' + now +
            '.txt';
        if (fs.existsSync(timestampedFilename)) {
            DEBUG && console.log('Using cached GeoNames postal code data from ' + timestampedFilename);
            return callback(null, timestampedFilename);
        }

        var filename = GEONAMES_CACHE_DIR + '/postal_codes/' + ALL_COUNTRIES_FILE + '.txt';
        if(fs.existsSync(filename)) {
            DEBUG && console.log('Using cached GeoNames postal code data from ' + filename);
            return callback(null, filename);
        }

        DEBUG && console.log('Getting GeoNames postal code data from ' + GEONAMES_URL +
        ALL_COUNTRIES_FILE + '.zip (this may take a while)');
        var options = {
            url: GEONAMES_URL + ALL_COUNTRIES_FILE + '.zip',
            encoding: null
        };

        // Store a dump locally
        if (!fs.existsSync(GEONAMES_CACHE_DIR + '/postal_codes')) {
            fs.mkdirSync(GEONAMES_CACHE_DIR + '/postal_codes');
        }
        var zipFilename = GEONAMES_CACHE_DIR + '/postal_codes/' + ALL_COUNTRIES_FILE + '_' + now + '.zip';
        var zipFilestream = fs.createWriteStream(zipFilename);

        zipFilestream.on('close', function() {
            DEBUG && console.log('Received zipped GeoNames postal code data');
            try {
                fs.createReadStream(zipFilename)
                    .pipe(unzip.Extract({ path: GEONAMES_CACHE_DIR + '/postal_codes' }))
                    .on('close', function() {
                        fs.renameSync(filename, timestampedFilename);
                        fs.unlinkSync(GEONAMES_CACHE_DIR + '/postal_codes/' + ALL_COUNTRIES_FILE + '_' + now + '.zip');
                        DEBUG && console.log('Unzipped GeoNames postal codes data');
                        // Housekeeping, remove old files
                        var currentFileName = path.basename(timestampedFilename);
                        fs.readdirSync(GEONAMES_CACHE_DIR + '/postal_codes').forEach(function(file) {
                            if (file !== currentFileName) {
                                fs.unlinkSync(GEONAMES_CACHE_DIR + '/postal_codes/' + file);
                            }
                        });
                        return callback(null, timestampedFilename);
                    });
            } catch(e) {
                DEBUG && console.log('Warning: ' + e);
                return callback(null, timestampedFilename);
            }
        });

        request.get(options)
            .on('response', function(response) {
                if (response.statusCode !== 200) {
                    return callback('Error downloading GeoNames postal code data statusCode: ' + response.statusCode);
                }
            })
            .on('error', function(err) {
                return callback('Error downloading GeoNames postal code data' + (err ? ': ' + err : ''));
            })
            .pipe(zipFilestream);
    },

    _parseGeoNamesPostalCodesCsv: function _parseGeoNamesPostalCodesCsv(pathToCsv, callback) {
        DEBUG && console.log('Started parsing postal code .txt (this  may take a ' +
        'while)');
        var data = [];
        var lenI = POSTALCODE_COLUMNS.length;
        var that = this;
        lazy.readFile(pathToCsv).lines().each(function(line) {
            var lineObj = {};
            line = line.split('\t');
            for (var i = 0; i < lenI; i++) {
                var column = line[i] || null;
                lineObj[POSTALCODE_COLUMNS[i]] = column;
            }
            data.push(lineObj);
        }).onComplete(function() {
            DEBUG && console.log('Finished parsing postal code .txt');
            DEBUG && console.log('Started building postal code k-d tree (this may take ' +
            'a while)');
            var dimensions = [
                'latitude',
                'longitude'
            ];
            that._kdTree = kdTree.createKdTree(data, that._distanceFunc, dimensions);
            DEBUG && console.log('Finished building postal code k-d tree');
            return callback();
        });
    },

    init: function init(cacheDir, callback) {
        if (arguments.length === 1) {
            callback = cacheDir;
        }
        else {
            GEONAMES_CACHE_DIR = cacheDir;
        }

        DEBUG && console.log('Initializing local reverse postal code geocoder and using cache directory: ' + GEONAMES_CACHE_DIR);
        // Create local cache folder
        if (!fs.existsSync(GEONAMES_CACHE_DIR)) {
            fs.mkdirSync(GEONAMES_CACHE_DIR);
        }
        var that = this;
        async.parallel([
                // Get GeoNames postal codes
                function(waterfallCallback) {
                    async.waterfall([
                        that._getGeoNamesPostalCodeData.bind(that),
                        that._parseGeoNamesPostalCodesCsv.bind(that)
                    ], function() {
                        return waterfallCallback();
                    });
                }
            ],
            // Main callback
            function(err) {
                if (err) {
                    throw(err);
                }
                return callback();
            });
    },

    lookUp: function(points, arg2, arg3) {
        var callback;
        var maxResults;
        if (arguments.length === 2) {
            maxResults = 1;
            callback = arg2;
        } else {
            maxResults = arg2;
            callback = arg3;
        }
        this._lookUp(points, maxResults, function(err, results) {
            if(results && results.length > 0) {
                return callback(err, results[0]);
            }
            else {
                return callback(err);
            }
        });
    },

    _lookUp: function(points, maxResults, callback) {
        var that = this;
        // If not yet initialized, then error out
        if (!this._kdTree) {
            return callback('You must first call init before calling lookup');
        }
        // Make sure we have an array of points
        if (!Array.isArray(points)) {
            points = [points];
        }
        var functions = [];
        points.forEach(function(point, i) {
            functions[i] = function(innerCallback) {
                var result = that._kdTree.nearest(point, maxResults);
                var zipCodeList = [];
                if (result && result[0] && result[0][0]) {
                    result.forEach(function(zipCode) {
                        zipCode[0].distance = zipCode[1];
                        zipCodeList.push(zipCode[0]);
                    });
                }
                return innerCallback(null, zipCodeList);
            };
        });
        async.series(
            functions,
            function(err, results) {
                DEBUG && console.log('Delivering results');
                return callback(null, results);
            });
    }
};

module.exports = geocoder;