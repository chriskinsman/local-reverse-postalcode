#Local Reverse ZipCode Geocoder

This library provides a local reverse zipcode geocoder for Node.js that is based on
[GeoNames](http://download.geonames.org/export/zip/) data. It is *local*
in the sense that there are no calls to a remote service like the
[Google Maps API](https://developers.google.com/maps/documentation/javascript/geocoding#ReverseGeocoding),
and in consequence the gecoder is suitable for batch reverse geocoding.
It is *reverse* in the sense that you give it a (list of) point(s), *i.e.*,
a latitude/longitude pair, and it returns the zip code to that point.

#Installation

```bash
$ npm install local-reverse-zipcode
```

#Usage

```javascript
var geocoder = require('local-reverse-zipcode');

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

#A Word on Speed

The initial lookup takes quite a while, as the geocoder has to download roughly
300MB of data that it then caches locally (unzipped, this occupies about 1.3GB
of disk space). All follow-up requests are lightning fast.

#A Word on Accuracy

By design, *i.e.*, due to the granularity of the available
[GeoNames data](http://download.geonames.org/export/dump/cities1000.zip),
this reverse geocoder is limited to city-level, so no streets or house numbers.
In many cases this is already sufficient, but obviously your actual mileage may
vary. If you need street-level granularity, you are better off with a service
like Google's
[reverse geocoding API](https://developers.google.com/maps/documentation/javascript/geocoding#ReverseGeocoding).
(Full disclosure: the author is currently employed by Google.)

#License

Copyright 2015 Chirs Kinsman (chris@kinsman.net)

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