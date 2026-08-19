import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const MapView = ({ 
  center, 
  markers = [], 
  zoom = 15,
  polyline = [] 
}) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (webViewRef.current && center) {
      const jsCode = `
        if (typeof map !== 'undefined') {
          map.flyTo([${center.lat}, ${center.lng}], ${zoom});
        }
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [center.lat, center.lng]);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${center.lat}, ${center.lng}], ${zoom});
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'OSM'
          }).addTo(map);

          var markersGroup = L.layerGroup().addTo(map);

          function addMarkers() {
            var data = ${JSON.stringify(markers)};
            data.forEach(function(m) {
              var color = m.isMe ? 'blue' : 'red';
              var icon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              });
              L.marker([m.lat, m.lng], {icon: icon}).addTo(markersGroup).bindPopup(m.title);
            });
          }

          var path = ${JSON.stringify(polyline.map(p => [p.lat, p.lng]))};
          if (path.length > 0) {
            L.polyline(path, {color: '#2563EB', weight: 5}).addTo(map);
          }

          addMarkers();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        )}
        mixedContentMode="always"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f8f8f8'
  }
});

export default MapView;