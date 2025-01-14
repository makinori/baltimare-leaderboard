#!/bin/bash

rm -f 1.jpg
rm -f 2.jpg

wget -O 1.jpg https://secondlife-maps-cdn.akamaized.net/map-1-809-1153-objects.jpg
wget -O 2.jpg https://secondlife-maps-cdn.akamaized.net/map-1-810-1153-objects.jpg

montage -geometry +0+0 -tile 2x 1.jpg 2.jpg -quality 90 components/assets/cloudsdale-map.jpg

rm -f 1.jpg
rm -f 2.jpg