# Local Reverse Postal Code Geocoder

This library provides a local reverse postal code geocoder for Node.js that is based on
[GeoNames](http://download.geonames.org/export/zip/) data. It is *local*
in the sense that there are no calls to a remote service like the
[Google Maps API](https://developers.google.com/maps/documentation/javascript/geocoding#ReverseGeocoding),
and in consequence the gecoder is suitable for batch reverse geocoding.
It is *reverse* in the sense that you give it a (list of) point(s), *i.e.*,
a latitude/longitude pair, and it returns the postal code to that point.

# Installation

```bash
$ npm install local-reverse-postal code
```

# Usage

# Lookup

```javascript
var geocoder = require('local-reverse-postalcode');

// With just one point
var point = {latitude: 42.083333, longitude: 3.1};
geocoder.lookUp(point, function(err, res) {
  console.log(JSON.stringify(res, null, 2));
});

// In batch mode with many points
var points = [
  {latitude: 42.083333, longitude: 3.1},
  {latitude: 48.466667, longitude: 9.133333}
];
geocoder.lookUp(points, function(err, res) {
  console.log(JSON.stringify(res, null, 2));
});


// How many results to display at max
var maxResults = 5;

// With just one point
var point = {latitude: 42.083333, longitude: 3.1};
geocoder.lookUp(point, maxResults, function(err, res) {
  console.log(JSON.stringify(res, null, 2));
});

// In batch mode with many points
var points = [
  {latitude: 42.083333, longitude: 3.1},
  {latitude: 48.466667, longitude: 9.133333}
];
geocoder.lookUp(points, maxResults, function(err, res) {
  console.log(JSON.stringify(res, null, 2));
});
```

## Init

You can optionally initialize the geocoder prior to the first call to lookUp.  This ensures
that all files are loaded into the cache prior to making the first call. 

```javascript
var geocoder = require('local-reverse-postalcode');

geocoder.init(function() {
  // geocoder is loaded and ready to run
});
```

Optionally init allows you to specify the directory that geonames files are downloaded and cached in.

```javascript
var geocoder = require('local-reverse-postalcode');

geocoder.init({cacheDirectory: '/tmp/geonames'}, function() {
  // Ready to call lookUp and all files will be downloaded to /tmp/geonames
});

```

# Usage of the Web Service

You can use the built-in Web service by running `node app.js` as follows.

```bash
$ curl "http://localhost:3000/geocode?latitude=48.466667&longitude=9.133333"
```

# Result Format

An output array that maps each point in the input array (or input object converted to a single-element array) to the `maxResults` closest postal codes.

```javascript
[
   {
      "countryCode":"US",
      "postalCode":"10018",
      "placeName":"New York City",
      "adminName1":"New York",
      "adminCode1":"NY",
      "adminName2":"New York",
      "adminCode2":"061",
      "adminName3":null,
      "adminCode3":null,
      "latitude":"40.7547",
      "longitude":"-73.9925",
      "accuracy":null,
      "distance":0.01717469835623254
   },
   {
      "countryCode":"US",
      "postalCode":"10122",
      "placeName":"New York City",
      "adminName1":"New York",
      "adminCode1":"NY",
      "adminName2":"New York",
      "adminCode2":"061",
      "adminName3":null,
      "adminCode3":null,
      "latitude":"40.7518",
      "longitude":"-73.9922",
      "accuracy":null,
      "distance":0.328619663752171
   },
   {
      "countryCode":"US",
      "postalCode":"10123",
      "placeName":"New York City",
      "adminName1":"New York",
      "adminCode1":"NY",
      "adminName2":"New York",
      "adminCode2":"061",
      "adminName3":null,
      "adminCode3":null,
      "latitude":"40.7515",
      "longitude":"-73.9905",
      "accuracy":null,
      "distance":0.4042385734624632
   },
   {
      "countryCode":"US",
      "postalCode":"10120",
      "placeName":"New York City",
      "adminName1":"New York",
      "adminCode1":"NY",
      "adminName2":"New York",
      "adminCode2":"061",
      "adminName3":null,
      "adminCode3":null,
      "latitude":"40.7506",
      "longitude":"-73.9894",
      "accuracy":null,
      "distance":0.5368946061124421
   },
   {
      "countryCode":"US",
      "postalCode":"10121",
      "placeName":"New York City",
      "adminName1":"New York",
      "adminCode1":"NY",
      "adminName2":"New York",
      "adminCode2":"061",
      "adminName3":null,
      "adminCode3":null,
      "latitude":"40.7496",
      "longitude":"-73.9919",
      "accuracy":null,
      "distance":0.5745045613406756
   }
]
```

#A Word on Speed

The call to init takes quite a while, as the geocoder has to download roughly
9MB of data that it then caches locally (unzipped, this occupies about 76MB
of disk space). All follow-up requests are lightning fast.

If you can deploy the data ahead of time the download/unzip process is eliminated 
but parsing and loading data structures takes a bit of time.


#License

Copyright 2015 Chris Kinsman (chris@kinsman.net)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

#Acknowledgements

This project was inspired by Richard Penman's Python
[reverse geocoder](https://bitbucket.org/richardpenman/reverse_geocode/).
This was a spin off of Thomas Steiner's [local-reverse-geocoder](https://github.com/tomayac/local-reverse-geocoder).
It uses Ubilabs' [k-d-tree implementation](https://github.com/ubilabs/kd-tree-javascript)
that was ported to Node.js by [Luke Arduini](https://github.com/luk-/node-kdt).