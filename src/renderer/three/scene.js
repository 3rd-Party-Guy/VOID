import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class SceneManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.container = canvasElement.parentElement;
    
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLighting();
    this.initHelpers();
    this.initEventListeners();
    
    this.animate = this.animate.bind(this);
    this.lastFrameTime = 0;
    this.fps = 60;
    this.onCameraMove = null; // Callback for camera movement
    this.orbitTarget = new THREE.Vector3(0, 0, 0); // Point to orbit around
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);
  }
  
  initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }
  
  initLighting() {
    const ambient = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 2);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);
  }
  
  initHelpers() {
    this.grid = new THREE.GridHelper(10, 10, 0x30363d, 0x21262d);
    this.scene.add(this.grid);
    
    this.axes = new THREE.AxesHelper(2);
    this.scene.add(this.axes);
  }
  
  initEventListeners() {
    this.handleResize = () => {
      this.setSize(this.container.clientWidth, this.container.clientHeight);
    };
    window.addEventListener('resize', this.handleResize);
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  animate(time = 0) {
    requestAnimationFrame(this.animate);
    
    const delta = time - this.lastFrameTime;
    this.lastFrameTime = time;
    this.fps = 1000 / delta;
    
    this.render();
  }
  
  setSize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  panCamera(x, z, y = 0) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, this.camera.up).normalize();
    
    const panVector = new THREE.Vector3()
      .addScaledVector(right, x)
      .addScaledVector(direction, -z)
      .addScaledVector(this.camera.up, y);
    
    this.camera.position.add(panVector);
    this.orbitTarget.add(panVector);
    this._notifyCameraMove();
  }
  
  zoomCamera(factor) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.camera.position.addScaledVector(direction, -2 * Math.log(factor));
    // Don't notify camera move for zoom - anchor only changes on pan
  }
  
  orbitCamera(deltaX, deltaY) {
    // Get offset from orbit target
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.orbitTarget);
    
    // Convert to spherical coordinates
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(offset);
    
    // Apply rotation
    spherical.theta += deltaX;
    spherical.phi += deltaY;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    
    // Convert back to cartesian and apply to position
    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.orbitTarget).add(offset);
    
    // Look at orbit target
    this.camera.lookAt(this.orbitTarget);
    // Note: Don't notify camera move - orbiting around anchor shouldn't change the anchor
  }
  
  resetCamera() {
    this.camera.position.set(5, 5, 5);
    this.orbitTarget.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this._notifyCameraMove();
  }
  
  getCameraPosition() {
    return this.camera.position.toArray();
  }
  
  getCameraTarget() {
    const target = new THREE.Vector3();
    this.camera.getWorldDirection(target);
    target.multiplyScalar(10);
    target.add(this.camera.position);
    return target.toArray();
  }
  
  jumpCameraToAnchor(anchorPosition) {
    // Position camera so that anchor is at the specified position, 
    // looking in the same direction as before
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    
    this.orbitTarget.set(anchorPosition[0], anchorPosition[1], anchorPosition[2]);
    // Camera is behind the anchor (in the direction opposite to where it's looking)
    this.camera.position.set(
      anchorPosition[0] - cameraDir.x * 5,
      anchorPosition[1] - cameraDir.y * 5,
      anchorPosition[2] - cameraDir.z * 5
    );
    this.camera.lookAt(anchorPosition[0], anchorPosition[1], anchorPosition[2]);
  }
  
  jumpCameraToTarget(targetPosition, offset) {
    // targetPosition is where the camera should look
    // offset is the offset from camera to target
    this.orbitTarget.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    this.camera.position.set(
      targetPosition[0] + offset[0],
      targetPosition[1] + offset[1],
      targetPosition[2] + offset[2]
    );
    this.camera.lookAt(targetPosition[0], targetPosition[1], targetPosition[2]);
  }
  
  _notifyCameraMove() {
    if (this.onCameraMove) {
      this.onCameraMove(this.getCameraPosition());
    }
  }
  
  toggleGrid(visible) {
    if (visible !== undefined) {
      this.grid.visible = visible;
    } else {
      this.grid.visible = !this.grid.visible;
    }
  }
  
  toggleAxes(visible) {
    if (visible !== undefined) {
      this.axes.visible = visible;
    } else {
      this.axes.visible = !this.axes.visible;
    }
  }
  
  getFPS() {
    return this.fps;
  }
  
  async setSkybox(type, paths) {
    try {
      if (type === 'equirectangular') {
        const loader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
          loader.load(paths, resolve, undefined, reject);
        });
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = texture;
        this.scene.environment = texture;
      } else if (type === 'cube') {
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load(paths);
        this.scene.background = texture;
        this.scene.environment = texture;
      } else if (type === 'hdr') {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const loader = new THREE.RGBELoader();
        const texture = await new Promise((resolve, reject) => {
          loader.load(paths, resolve, undefined, reject);
        });
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.background = envMap;
        this.scene.environment = envMap;
        texture.dispose();
        pmremGenerator.dispose();
      }
    } catch (error) {
      console.error('Failed to load skybox:', error);
    }
  }
  
  clearSkybox() {
    this.scene.background = new THREE.Color(0x0d1117);
    this.scene.environment = null;
  }
  
  dispose() {
    window.removeEventListener('resize', this.handleResize);
    
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }
}

export const sceneManager = null;
