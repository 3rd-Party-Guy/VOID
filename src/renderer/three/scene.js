import * as THREE from 'three';

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
  
  panCamera(x, z) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, this.camera.up).normalize();
    
    this.camera.position.addScaledVector(right, x);
    this.camera.position.addScaledVector(direction, -z);
  }
  
  zoomCamera(factor) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.camera.position.addScaledVector(direction, -2 * Math.log(factor));
  }
  
  orbitCamera(deltaX, deltaY) {
    const spherical = new THREE.Spherical();
    const offset = this.camera.position.clone();
    spherical.setFromVector3(offset);
    spherical.theta += deltaX;
    spherical.phi += deltaY;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    offset.setFromSpherical(spherical);
    this.camera.position.copy(offset);
    this.camera.lookAt(0, 0, 0);
  }
  
  resetCamera() {
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
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
