import React, { useContext, useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Dimensions, View, ActivityIndicator, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import InternalHeader from '../components/InternalHeader';
import { AuthContext } from '../context/AuthContext';
import { fetchRackUtilization } from '../api/warehouseAnalytics';

const { width, height } = Dimensions.get('window');

export default function WarehouseHeatmapScreen({ navigation, route }) {
  const { userToken } = useContext(AuthContext);
  const warehouseId = route.params?.warehouseId;
  const [rackData, setRackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchRackUtilization(userToken, warehouseId);
        if (isMounted) setRackData(data);
      } catch (e) {
        console.error('Heatmap data error:', e);
        if (isMounted) setError(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userToken, warehouseId]);

  return (
    <SafeAreaView style={styles.container}>
      <InternalHeader navigation={navigation} title="Rack Utilization Heatmap" />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : error ? (
        <Text style={styles.errorText}>Error loading heatmap.</Text>
      ) : rackData.length === 0 ? (
        <Text style={styles.errorText}>No rack data available.</Text>
      ) : (
        <View style={styles.heatmapContainer}>
          <GLView
            style={styles.gl}
            onContextCreate={gl => {
              // Scene & camera setup
              const scene = new THREE.Scene();
              const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
              const d = 10;
              const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
              camera.position.set(10, 10, 10);
              camera.lookAt(new THREE.Vector3(0, 0, 0));

              // Lights
              const ambient = new THREE.AmbientLight(0xffffff, 0.7);
              scene.add(ambient);
              const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
              dirLight.position.set(10, 20, 10);
              scene.add(dirLight);

              // Grid and axes helpers
              const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
              scene.add(gridHelper);
              const axesHelper = new THREE.AxesHelper(10);
              scene.add(axesHelper);

              // Renderer
              const renderer = new Renderer({ gl });
              renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

              // Draw racks based on fetched data
              const size = 1;
              rackData.forEach(item => {
                const h = size * Math.max(item.utilization, 0.05) * 5;
                const geom = new THREE.BoxGeometry(size, h, size);
                const col = new THREE.Color().setHSL((1 - item.utilization) * 0.4, 1, 0.5);
                const mat = new THREE.MeshLambertMaterial({ color: col });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(item.x, h / 2, item.y);
                scene.add(mesh);
              });

              // Render loop
              const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
                gl.endFrameEXP();
              };
              animate();
            }}
          />
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Utilization</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendColorBox, { backgroundColor: '#00ff00' }]} />
              <Text style={styles.legendLabel}>0%</Text>
              <View style={[styles.legendColorBox, { backgroundColor: '#ffff00' }]} />
              <Text style={styles.legendLabel}>50%</Text>
              <View style={[styles.legendColorBox, { backgroundColor: '#ff0000' }]} />
              <Text style={styles.legendLabel}>100%</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gl: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { flex: 1, textAlign: 'center', marginTop: 20, color: '#f00' },
  heatmapContainer: { flex: 1, position: 'relative' },
  legendContainer: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 8 },
  legendTitle: { fontWeight: 'bold', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendColorBox: { width: 16, height: 16, marginHorizontal: 4 },
  legendLabel: { fontSize: 12 },
}); 